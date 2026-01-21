import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    Users,
    UserCheck,
    Crown,
    Shield,
    UserPlus,
    UserMinus,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

// Discord brand color
const DISCORD_BLUE = '#5865F2';
const DISCORD_GREEN = '#57F287';
const DISCORD_RED = '#ED4245';

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// KPI Card Component
const KPICard = ({ icon: Icon, label, value, subtext, delta, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1 truncate">{label}</p>
                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <p className="text-lg md:text-2xl font-bold text-slate-800">{value}</p>
                    {delta !== null && delta !== undefined && (
                        <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                    )}
                </div>
                {subtext && (
                    <p className="text-[10px] md:text-xs text-slate-400 mt-1 truncate">{subtext}</p>
                )}
            </div>
            <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl ${iconBg} flex-shrink-0`}>
                <Icon size={16} className={`${iconColor} md:hidden`} />
                <Icon size={20} className={`${iconColor} hidden md:block`} />
            </div>
        </div>
    </div>
);

// Custom Tooltip for Member Growth Chart
const GrowthTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">
                {format(parseLocalDate(label), 'MMM dd, yyyy')}
            </p>
            <p style={{ color: DISCORD_BLUE }} className="text-sm">
                Members: <span className="font-bold">{payload[0]?.value?.toLocaleString()}</span>
            </p>
        </div>
    );
};

// Custom Tooltip for Daily Activity Chart
const ActivityTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM dd, yyyy')}
            </p>
            {payload.map((entry, index) => (
                <p key={index} style={{ color: entry.color }} className="text-sm">
                    {entry.name}: <span className="font-bold">{entry.value?.toLocaleString()}</span>
                </p>
            ))}
        </div>
    );
};

const DiscordOverview = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];

    const [latestStats, setLatestStats] = useState(null);
    const [dailySummary, setDailySummary] = useState([]);
    const [memberGrowth, setMemberGrowth] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data from social_analytics schema
    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Fetch latest server stats
                const latestStatsPromise = supabaseSocialAnalytics
                    .from('discord_latest_stats')
                    .select('*')
                    .single();

                // Fetch daily summary for date range
                const dailySummaryPromise = supabaseSocialAnalytics
                    .from('discord_daily_summary')
                    .select('*')
                    .gte('date', startDateString)
                    .lte('date', endDateString)
                    .order('date', { ascending: true });

                // Fetch member growth for date range
                const memberGrowthPromise = supabaseSocialAnalytics
                    .from('discord_member_growth')
                    .select('*')
                    .gte('date', startDateString)
                    .lte('date', endDateString)
                    .order('date', { ascending: true });

                const [latestRes, dailyRes, growthRes] = await Promise.all([
                    latestStatsPromise,
                    dailySummaryPromise,
                    memberGrowthPromise
                ]);

                if (latestRes.error && latestRes.error.code !== 'PGRST116') throw latestRes.error;
                if (dailyRes.error) throw dailyRes.error;
                if (growthRes.error) throw growthRes.error;

                setLatestStats(latestRes.data);
                setDailySummary(dailyRes.data || []);
                setMemberGrowth(growthRes.data || []);

            } catch (err) {
                console.error('Error fetching Discord data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Process data for charts and KPIs
    const {
        totalMembers,
        onboardedMembers,
        verifiedMembers,
        premiumMembers,
        totalJoins,
        totalLeaves,
        netGrowth,
        growthChartData,
        activityChartData,
        growthDelta
    } = useMemo(() => {
        const totalMembers = latestStats?.total_members || 0;
        const onboardedMembers = latestStats?.member_role_count || 0;
        const verifiedMembers = latestStats?.verified_count || 0;
        const premiumMembers = latestStats?.premium_count || 0;

        // Aggregate daily stats
        const totalJoins = dailySummary.reduce((sum, d) => sum + (d.joins || 0), 0);
        const totalLeaves = dailySummary.reduce((sum, d) => sum + (d.leaves || 0), 0);
        const netGrowth = totalJoins - totalLeaves;

        // Chart data for member growth
        const growthChartData = memberGrowth.map(d => ({
            date: d.date,
            members: d.total_members || 0
        }));

        // Chart data for daily activity (joins vs leaves)
        const activityChartData = dailySummary.map(d => ({
            date: d.date,
            joins: d.joins || 0,
            leaves: d.leaves || 0,
            net: (d.joins || 0) - (d.leaves || 0)
        }));

        // Calculate growth delta (compare first and last data points)
        let growthDelta = null;
        if (memberGrowth.length >= 2) {
            const firstValue = memberGrowth[0]?.total_members || 0;
            const lastValue = memberGrowth[memberGrowth.length - 1]?.total_members || 0;
            if (firstValue > 0) {
                growthDelta = ((lastValue - firstValue) / firstValue) * 100;
            }
        }

        return {
            totalMembers,
            onboardedMembers,
            verifiedMembers,
            premiumMembers,
            totalJoins,
            totalLeaves,
            netGrowth,
            growthChartData,
            activityChartData,
            growthDelta
        };
    }, [latestStats, dailySummary, memberGrowth]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-[#5865F2]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading Discord data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Profile Context Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    {/* Left: Server Identity */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#5865F2] flex items-center justify-center shadow-sm flex-shrink-0">
                            <img
                                src="/logo-icon.png"
                                alt="Lumist"
                                className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-lg"
                            />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-semibold text-slate-800">Lumist Community</h2>
                            <p className="text-xs md:text-sm text-slate-500">Discord Server</p>
                        </div>
                    </div>

                    {/* Right: Key Stats */}
                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{totalMembers.toLocaleString()}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Total Members</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{latestStats?.online_members?.toLocaleString() || 0}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Online Now</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center flex-1 md:flex-none">
                            <div className="flex items-center justify-center gap-1">
                                {netGrowth >= 0 ? (
                                    <TrendingUp size={16} className="text-emerald-500" />
                                ) : (
                                    <TrendingDown size={16} className="text-red-500" />
                                )}
                                <p className={`text-lg md:text-2xl font-bold ${netGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {netGrowth >= 0 ? '+' : ''}{netGrowth.toLocaleString()}
                                </p>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-500">Net Growth</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    icon={Users}
                    label="Total Members"
                    value={totalMembers.toLocaleString()}
                    delta={growthDelta}
                    iconBg="bg-[#5865F2]/10"
                    iconColor="text-[#5865F2]"
                />
                <KPICard
                    icon={UserCheck}
                    label="Onboarded"
                    value={onboardedMembers.toLocaleString()}
                    subtext={totalMembers > 0 ? `${((onboardedMembers / totalMembers) * 100).toFixed(1)}% of members` : ''}
                    iconBg="bg-sky-50"
                    iconColor="text-sky-500"
                />
                <KPICard
                    icon={Shield}
                    label="Verified"
                    value={verifiedMembers.toLocaleString()}
                    subtext={totalMembers > 0 ? `${((verifiedMembers / totalMembers) * 100).toFixed(1)}% of members` : ''}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-500"
                />
                <KPICard
                    icon={Crown}
                    label="Premium"
                    value={premiumMembers.toLocaleString()}
                    subtext={totalMembers > 0 ? `${((premiumMembers / totalMembers) * 100).toFixed(1)}% of members` : ''}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-500"
                />
            </div>

            {/* Member Growth Chart */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Member Growth</h3>
                        <p className="text-xs text-slate-500 mt-1">Total server members over time</p>
                    </div>
                </div>

                <div className="h-[250px] md:h-[300px]">
                    {growthChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="discordGrowthGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={DISCORD_BLUE} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={DISCORD_BLUE} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(parseLocalDate(str), 'MMM d')}
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                />
                                <Tooltip content={<GrowthTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="members"
                                    stroke={DISCORD_BLUE}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#discordGrowthGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No member growth data available
                        </div>
                    )}
                </div>
            </div>

            {/* Daily Activity Chart (Joins/Leaves) */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Daily Activity</h3>
                        <p className="text-xs text-slate-500 mt-1">Member joins and leaves per day</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <UserPlus size={14} className="text-emerald-500" />
                            <span className="text-slate-600">{totalJoins.toLocaleString()} joins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <UserMinus size={14} className="text-red-500" />
                            <span className="text-slate-600">{totalLeaves.toLocaleString()} leaves</span>
                        </div>
                    </div>
                </div>

                <div className="h-[250px] md:h-[280px]">
                    {activityChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(parseLocalDate(str), 'MMM d')}
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<ActivityTooltip />} />
                                <Bar dataKey="joins" name="Joins" fill={DISCORD_GREEN} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="leaves" name="Leaves" fill={DISCORD_RED} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No activity data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscordOverview;
