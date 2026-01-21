import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Loader2, Clock, Timer, Users, TrendingUp, Eye, EyeOff, Info } from 'lucide-react';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
    LabelList
} from 'recharts';

// Usage chart metric configuration - Both use sky blue, differentiated by line style
const USAGE_METRICS = {
    sessions: {
        key: 'sessions',
        label: 'Sessions',
        color: '#0EA5E9',      // Sky blue
        bgActive: 'bg-sky-50',
        textActive: 'text-sky-700',
        borderActive: 'border-sky-200',
        lineStyle: 'solid'     // Solid line for sessions
    },
    uniqueUsers: {
        key: 'uniqueUsers',
        label: 'Users (completed)',
        color: '#0EA5E9',      // Same sky blue
        bgActive: 'bg-sky-50',
        textActive: 'text-sky-700',
        borderActive: 'border-sky-200',
        lineStyle: 'dashed'    // Dashed line for users
    }
};

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// ============================================
// TIME FORMATTING UTILITIES - HOURS STANDARD
// ============================================
// Global policy: All time metrics display in HOURS
// Exception: Session Duration Distribution buckets (0-10m, etc.) stay in minutes

// Format seconds to hours with 1 decimal (e.g., "3.6h")
const formatHoursCompact = (seconds) => {
    if (!seconds || seconds === 0) return '0h';
    const hours = seconds / 3600;
    // For very small values, show 1 decimal; for large values, round
    if (hours < 0.1) return '<0.1h';
    return hours >= 100 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
};

// Format seconds to hours for subtext (e.g., "13.5h per user avg")
const formatHoursWithContext = (seconds, suffix = '') => {
    if (!seconds || seconds === 0) return `0h${suffix}`;
    const hours = seconds / 3600;
    const formatted = hours >= 100 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
    return `${formatted}${suffix}`;
};

// Format minutes to hours for chart Y-axis (input is minutes, not seconds)
const formatYAxisHours = (minutes) => {
    if (!minutes || minutes === 0) return '0h';
    const hours = minutes / 60;
    if (hours < 1) return `${hours.toFixed(1)}h`;
    return hours >= 100 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
};

// Convert seconds to minutes (for internal chart data processing)
const toMinutes = (seconds) => {
    return Math.round(seconds / 60);
};

// Convert minutes to hours with 1 decimal (for tooltip display)
const minutesToHours = (minutes) => {
    if (!minutes || minutes === 0) return '0h';
    const hours = minutes / 60;
    if (hours < 0.1) return '<0.1h';
    return hours >= 100 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
};

// Chart colors
const COLORS = {
    active: '#0EA5E9',    // Sky blue - active study time
    paused: '#F59E0B',    // Amber - paused time
    total: '#8B5CF6',     // Violet - total time
    distribution: '#0EA5E9'
};

// ============================================
// DATA QUALITY CONSTANTS
// ============================================
// Cap sessions at 6 hours - allows legitimate long study sessions while filtering abandoned ones
const MAX_SESSION_SECONDS = 21600; // 6 hours

// Sanitize session duration - cap outliers and filter invalid data
const sanitizeDuration = (seconds) => {
    if (!seconds || seconds < 0) return 0;
    return Math.min(seconds, MAX_SESSION_SECONDS);
};

// Duration bucket labels
const DURATION_BUCKETS = [
    { min: 0, max: 600, label: '0-10m' },
    { min: 600, max: 1200, label: '10-20m' },
    { min: 1200, max: 1800, label: '20-30m' },
    { min: 1800, max: 2700, label: '30-45m' },
    { min: 2700, max: 3600, label: '45-60m' },
    { min: 3600, max: Infinity, label: '60m+' }
];

// KPI Card Component
const KPICard = ({ icon: Icon, label, value, subtext, iconBg, iconColor }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                {subtext && (
                    <p className="text-xs text-slate-400 mt-1">{subtext}</p>
                )}
            </div>
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon size={20} className={iconColor} />
            </div>
        </div>
    </div>
);

// Metric Toggle Button Component - With line style indicator
const MetricToggle = ({ metricKey, config, isVisible, onToggle, totalValue }) => (
    <button
        onClick={() => onToggle(metricKey)}
        className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            transition-all duration-200 ease-in-out
            ${isVisible
                ? `${config.bgActive} ${config.textActive}`
                : 'bg-white text-slate-500 hover:bg-slate-50'
            }
            ${config.lineStyle === 'dashed'
                ? 'border-2 border-dashed border-sky-300'
                : 'border-2 border-solid border-sky-300'
            }
        `}
    >
        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        <span>{config.label}:</span>
        <span className="font-bold">{totalValue.toLocaleString()}</span>
    </button>
);

// Custom Tooltip for Daily Study Time Chart - DISPLAYS IN HOURS
const DailyStudyTimeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const activeMinutes = payload.find(p => p.dataKey === 'activeMinutes')?.value || 0;
    const pausedMinutes = payload.find(p => p.dataKey === 'pausedMinutes')?.value || 0;
    const totalMinutes = activeMinutes + pausedMinutes;
    const focusRate = totalMinutes > 0 ? ((activeMinutes / totalMinutes) * 100).toFixed(0) : 0;

    // Convert minutes to hours for display
    const activeHours = minutesToHours(activeMinutes);
    const pausedHours = minutesToHours(pausedMinutes);
    const totalHours = minutesToHours(totalMinutes);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.active }} />
                        <span className="text-sm text-slate-600">Active</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{activeHours}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.paused }} />
                        <span className="text-sm text-slate-600">Paused</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{pausedHours}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-xs font-semibold text-slate-700">{totalHours}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Focus Rate</span>
                    <span className="text-xs font-semibold text-sky-600">{focusRate}%</span>
                </div>
            </div>
        </div>
    );
};

// Custom Tooltip for Distribution Chart
const DistributionTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold mb-1">{data.bucket}</p>
            <p className="text-sm text-slate-600">
                <span className="font-semibold text-sky-600">{data.count}</span> sessions
            </p>
            <p className="text-xs text-slate-400 mt-1">
                {data.percentage}% of total
            </p>
        </div>
    );
};

// Custom Tooltip for Assessment Usage Chart - Shows both metrics with style indicators
const AssessmentUsageTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0]?.payload || {};
    const sessions = data.sessions || 0;
    const uniqueUsers = data.uniqueUsers || 0;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {/* Solid line indicator */}
                        <div className="w-4 h-0.5 bg-sky-500 rounded" />
                        <span className="text-sm text-slate-600">Sessions</span>
                    </div>
                    <span className="text-sm font-semibold text-sky-600">{sessions.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {/* Dashed line indicator */}
                        <div className="flex items-center w-4 gap-0.5">
                            <div className="w-1 h-0.5 bg-sky-500 rounded" />
                            <div className="w-1 h-0.5 bg-sky-500 rounded" />
                        </div>
                        <span className="text-sm text-slate-600">Users (completed)</span>
                    </div>
                    <span className="text-sm font-semibold text-sky-600">{uniqueUsers.toLocaleString()}</span>
                </div>
                {uniqueUsers > 0 && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Sessions/User</span>
                        <span className="text-xs font-semibold text-slate-700">{(sessions / uniqueUsers).toFixed(1)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const AssessmentDeepDive = ({ dateRange }) => {
    const [startDate, endDate] = dateRange;
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Visibility state for usage chart metrics
    const [visibleMetrics, setVisibleMetrics] = useState(['sessions', 'uniqueUsers']);

    // Toggle metric visibility
    const toggleMetric = (metricKey) => {
        setVisibleMetrics(prev =>
            prev.includes(metricKey)
                ? prev.filter(m => m !== metricKey)
                : [...prev, metricKey]
        );
    };

    // Fetch data from attempt_durations view
    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                const { data: result, error: err } = await supabase
                    .from('attempt_durations')
                    .select('*')
                    .gte('attempt_date', startDateString)
                    .lte('attempt_date', endDateString)
                    .order('attempt_date', { ascending: true });

                if (err) throw err;

                setData(result || []);
            } catch (err) {
                console.error('Error fetching assessment data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Process data for KPIs and charts
    const {
        avgTimePerSession,
        totalStudyTime,
        uniqueUsers,
        sessionsPerUser,
        focusMeterData,
        distributionData,
        usageData,
        totalSessions
    } = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                avgTimePerSession: 0,
                totalStudyTime: 0,
                uniqueUsers: 0,
                sessionsPerUser: 0,
                focusMeterData: [],
                distributionData: [],
                usageData: [],
                totalSessions: 0
            };
        }

        // Aggregate totals
        // NOTE: Using net_seconds (active study time) as the primary duration metric
        // gross_seconds includes abandoned sessions left open for days
        let totalDuration = 0;
        let sessionCount = 0;

        // Track unique users
        const uniqueUserIds = new Set();

        // Group by date for Daily Study Time chart
        const dailyData = {};

        data.forEach(session => {
            // Use net_seconds (actual study time) and cap at 2 hours
            const netDuration = sanitizeDuration(session.net_seconds);
            const grossDuration = sanitizeDuration(session.gross_seconds);
            const pausedTime = sanitizeDuration(session.paused_seconds);

            // Skip completely invalid sessions (0 or negative net time)
            if (netDuration <= 0) return;

            sessionCount++;
            totalDuration += netDuration;

            // Track unique users
            if (session.student_profile_id) {
                uniqueUserIds.add(session.student_profile_id);
            }

            // Group by date - use net as active, calculate paused from gross-net
            const date = session.attempt_date;
            if (!dailyData[date]) {
                dailyData[date] = {
                    activeSeconds: 0,
                    pausedSeconds: 0,
                    sessions: 0,
                    userIds: new Set()
                };
            }
            dailyData[date].activeSeconds += netDuration;
            // Paused = gross - net, but both are capped so this stays reasonable
            dailyData[date].pausedSeconds += Math.max(0, Math.min(grossDuration - netDuration, pausedTime));
            dailyData[date].sessions += 1;
            // Track unique users per day
            if (session.student_profile_id) {
                dailyData[date].userIds.add(session.student_profile_id);
            }
        });

        // Convert daily data to chart format (stored as minutes for internal processing)
        const focusMeterData = Object.entries(dailyData)
            .map(([date, stats]) => ({
                date,
                activeMinutes: toMinutes(stats.activeSeconds),
                pausedMinutes: toMinutes(stats.pausedSeconds),
                totalMinutes: toMinutes(stats.activeSeconds + stats.pausedSeconds),
                sessions: stats.sessions,
                uniqueUsers: stats.userIds.size
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate duration distribution
        const bucketCounts = DURATION_BUCKETS.map(bucket => ({
            bucket: bucket.label,
            count: 0,
            min: bucket.min,
            max: bucket.max
        }));

        data.forEach(session => {
            // Use net_seconds for distribution (actual study time, capped)
            const duration = sanitizeDuration(session.net_seconds);
            if (duration <= 0) return; // Skip invalid sessions

            for (const bucket of bucketCounts) {
                if (duration >= bucket.min && duration < bucket.max) {
                    bucket.count++;
                    break;
                }
            }
        });

        // Add percentage to distribution (as number for label formatting)
        const distributionData = bucketCounts.map(bucket => ({
            bucket: bucket.bucket,
            count: bucket.count,
            percentage: sessionCount > 0 ? Math.round((bucket.count / sessionCount) * 100) : 0
        }));

        // Calculate KPIs
        const avgTimePerSession = sessionCount > 0 ? totalDuration / sessionCount : 0;
        const uniqueUserCount = uniqueUserIds.size;
        const sessionsPerUser = uniqueUserCount > 0 ? sessionCount / uniqueUserCount : 0;

        // Create usage data for line chart (daily session counts + unique users)
        const usageData = focusMeterData.map(day => ({
            date: day.date,
            sessions: day.sessions,
            uniqueUsers: day.uniqueUsers
        }));

        return {
            avgTimePerSession,
            totalStudyTime: totalDuration,
            uniqueUsers: uniqueUserCount,
            sessionsPerUser,
            focusMeterData,
            distributionData,
            usageData,
            totalSessions: sessionCount
        };
    }, [data]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-violet-600">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading assessment data: {error}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No assessment data available for this period.</p>
                <p className="text-sm text-slate-400 mt-1">Try selecting a different date range.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* KPI Cards Row - All time metrics in HOURS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    icon={Timer}
                    label="Avg Session Length"
                    value={formatHoursCompact(avgTimePerSession)}
                    subtext={`${totalSessions.toLocaleString()} total sessions`}
                    iconBg="bg-sky-100"
                    iconColor="text-sky-600"
                />
                <KPICard
                    icon={Clock}
                    label="Total Study Time"
                    value={formatHoursCompact(totalStudyTime)}
                    subtext={formatHoursWithContext(totalStudyTime / Math.max(uniqueUsers, 1), ' per user avg')}
                    iconBg="bg-violet-100"
                    iconColor="text-violet-600"
                />
                <KPICard
                    icon={Users}
                    label="Unique Students"
                    value={uniqueUsers.toLocaleString()}
                    subtext={`${sessionsPerUser.toFixed(1)} sessions per user`}
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <KPICard
                    icon={TrendingUp}
                    label="Engagement Depth"
                    value={sessionsPerUser.toFixed(1)}
                    subtext="Avg sessions per student"
                    iconBg="bg-amber-100"
                    iconColor="text-amber-600"
                />
            </div>

            {/* Assessment Usage - Full Width Area Chart with Two Lines */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col gap-3 mb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-base font-semibold text-slate-800 tracking-tight">Assessment Usage</h3>
                                <div className="relative group">
                                    <Info size={14} className="text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                                    <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                        <p className="leading-relaxed">
                                            This chart shows users who started <strong>AND completed</strong> assessment sessions on each date.
                                            The Overview tab shows all users who answered questions on each date, which may differ due to cross-day sessions.
                                        </p>
                                        <div className="absolute left-3 -bottom-1.5 w-3 h-3 bg-slate-800 rotate-45" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Completed sessions and users (sessions started on each date)</p>
                        </div>
                    </div>
                    {/* Metric Toggle Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <MetricToggle
                            metricKey="sessions"
                            config={USAGE_METRICS.sessions}
                            isVisible={visibleMetrics.includes('sessions')}
                            onToggle={toggleMetric}
                            totalValue={totalSessions}
                        />
                        <MetricToggle
                            metricKey="uniqueUsers"
                            config={USAGE_METRICS.uniqueUsers}
                            isVisible={visibleMetrics.includes('uniqueUsers')}
                            onToggle={toggleMetric}
                            totalValue={uniqueUsers}
                        />
                    </div>
                </div>
                <div className="h-[200px] md:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={usageData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                {/* Sessions gradient - more visible fill */}
                                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                </linearGradient>
                                {/* Users gradient - very subtle fill */}
                                <linearGradient id="colorUniqueUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.03} />
                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#94A3B8"
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => format(parseLocalDate(val), 'MMM d')}
                                interval="preserveStartEnd"
                                minTickGap={50}
                            />
                            <YAxis
                                stroke="#94A3B8"
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<AssessmentUsageTooltip />} />
                            {/* Sessions - solid line with fill */}
                            {visibleMetrics.includes('sessions') && (
                                <Area
                                    type="monotone"
                                    dataKey="sessions"
                                    stroke="#0EA5E9"
                                    strokeWidth={2}
                                    fill="url(#colorSessions)"
                                    name="Sessions"
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#0EA5E9' }}
                                />
                            )}
                            {/* Unique Users - dashed line, minimal fill */}
                            {visibleMetrics.includes('uniqueUsers') && (
                                <Area
                                    type="monotone"
                                    dataKey="uniqueUsers"
                                    stroke="#0EA5E9"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    fill="url(#colorUniqueUsers)"
                                    name="Users (completed)"
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#0EA5E9' }}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Daily Study Time - Stacked Bar Chart (Y-axis and Tooltip in HOURS) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="mb-3">
                        <h3 className="text-base font-semibold text-slate-800 tracking-tight">Daily Study Time</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Total time spent in assessments per day</p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={focusMeterData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => format(parseLocalDate(val), 'MMM d')}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatYAxisHours}
                                    width={45}
                                />
                                <Tooltip content={<DailyStudyTimeTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: '11px' }}
                                    formatter={(value) => (
                                        <span className="text-slate-600">
                                            {value === 'activeMinutes' ? 'Active' : 'Paused'}
                                        </span>
                                    )}
                                />
                                <Bar
                                    dataKey="activeMinutes"
                                    stackId="time"
                                    fill={COLORS.active}
                                    radius={[0, 0, 0, 0]}
                                    name="activeMinutes"
                                />
                                <Bar
                                    dataKey="pausedMinutes"
                                    stackId="time"
                                    fill={COLORS.paused}
                                    radius={[4, 4, 0, 0]}
                                    name="pausedMinutes"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Duration Distribution - Bar Chart (EXCEPTION: Stays in MINUTES for readability) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="mb-3">
                        <h3 className="text-base font-semibold text-slate-800 tracking-tight">Session Duration Distribution</h3>
                        <p className="text-xs text-slate-500 mt-0.5">How long students study per session</p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis
                                    dataKey="bucket"
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<DistributionTooltip />} />
                                <Bar
                                    dataKey="count"
                                    fill={COLORS.distribution}
                                    radius={[4, 4, 0, 0]}
                                >
                                    {distributionData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS.distribution}
                                            fillOpacity={0.7 + (index * 0.05)}
                                        />
                                    ))}
                                    <LabelList
                                        dataKey="percentage"
                                        position="top"
                                        formatter={(val) => val > 0 ? `${val}%` : ''}
                                        style={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentDeepDive;
