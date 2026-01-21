import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Users,
    UserCheck,
    TrendingUp,
    Clock,
    RefreshCw,
    Globe,
    MapPin
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import ConversionSankey from './ConversionSankey';

// Colors for charts
const COLORS = {
    primary: '#8b5cf6',
    secondary: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    slate: '#64748b'
};

// Brand colors for referral sources - matching social media platforms
const SOURCE_COLORS = {
    'Threads': '#000000',
    'TikTok': '#ff0050',      // TikTok red/pink accent
    'Facebook': '#1877F2',
    'Instagram': '#E4405F',
    'Unknown': '#94a3b8',
    'Friends/Family': '#f59e0b',
    'Partner': '#8b5cf6',
    'Search Engine': '#10b981',
    'YouTube': '#FF0000',
    'Other': '#64748b',
};

// Fallback colors for sources not in the map
const FALLBACK_COLORS = [
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#ec4899', // pink
    '#84cc16', // lime
    '#f97316', // orange
];

// Get color for a source
const getSourceColor = (sourceName, index) => {
    return SOURCE_COLORS[sourceName] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, color = 'violet', trend }) => {
    const colorClasses = {
        violet: 'bg-violet-100 text-violet-600',
        sky: 'bg-sky-100 text-sky-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">{title}</p>
                <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
                    <Icon size={18} />
                </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            {trend !== undefined && (
                <p className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs previous period
                </p>
            )}
        </div>
    );
};

// Custom tooltip for bar charts
const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                <p className="text-sm font-medium text-slate-700 mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        {entry.name}: {entry.value?.toLocaleString()}
                        {entry.name.includes('Rate') ? '%' : ''}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Custom tooltip for pie chart - fixed version
const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                <p className="text-sm font-semibold text-slate-800 mb-1">{data.name}</p>
                <p className="text-sm text-slate-600">
                    {data.value?.toLocaleString()} users
                </p>
                <p className="text-sm text-slate-600">
                    {data.conversions?.toLocaleString()} converted ({data.rate}%)
                </p>
            </div>
        );
    }
    return null;
};

const AcquisitionOverview = () => {
    const { dateRange } = useOutletContext();
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [weeklyStats, setWeeklyStats] = useState([]);
    const [sourcePerformance, setSourcePerformance] = useState([]);
    const [geographyStats, setGeographyStats] = useState([]);
    const [totalUsers, setTotalUsers] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'weekly'

    // Fetch all data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [monthlyRes, weeklyRes, sourceRes, geoRes, usersRes] = await Promise.all([
                    supabase
                        .from('monthly_conversion_stats')
                        .select('*')
                        .order('signup_month', { ascending: true }),
                    supabase
                        .from('weekly_conversion_stats')
                        .select('*')
                        .order('signup_week', { ascending: true }),
                    supabase
                        .from('referral_source_performance')
                        .select('*')
                        .order('total_users', { ascending: false }),
                    supabase
                        .from('geography_conversion_stats')
                        .select('*'),
                    // Fetch total users from retention_summary (same as User Engagement)
                    supabase
                        .from('retention_summary')
                        .select('total_users')
                ]);

                if (monthlyRes.error) throw monthlyRes.error;
                if (weeklyRes.error) throw weeklyRes.error;
                if (sourceRes.error) throw sourceRes.error;
                if (geoRes.error) throw geoRes.error;
                // Don't throw on usersRes error, just use fallback

                setMonthlyStats(monthlyRes.data || []);
                setWeeklyStats(weeklyRes.data || []);
                setSourcePerformance(sourceRes.data || []);
                setGeographyStats(geoRes.data || []);
                setTotalUsers(usersRes.data?.[0]?.total_users || null);
            } catch (err) {
                console.error('Error fetching acquisition data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Calculate aggregate KPIs
    const kpis = useMemo(() => {
        const totalSignups = monthlyStats.reduce((sum, m) => sum + (m.total_signups || 0), 0);
        const totalConversions = monthlyStats.reduce((sum, m) => sum + (m.total_conversions || 0), 0);
        const conversionRate = totalSignups > 0
            ? ((totalConversions / totalSignups) * 100).toFixed(1)
            : 0;

        // Calculate average days to convert across all months
        const monthsWithData = monthlyStats.filter(m => m.avg_days_to_convert !== null);
        const avgDaysToConvert = monthsWithData.length > 0
            ? (monthsWithData.reduce((sum, m) => sum + (m.avg_days_to_convert || 0), 0) / monthsWithData.length).toFixed(1)
            : '-';

        return {
            totalSignups,
            totalConversions,
            conversionRate,
            avgDaysToConvert
        };
    }, [monthlyStats]);

    // Format month label
    const formatMonth = (monthStr) => {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    // Format week label
    const formatWeek = (weekStr) => {
        if (!weekStr) return '';
        const [year, week] = weekStr.split('-W');
        return `W${week} '${year.slice(2)}`;
    };

    // Prepare chart data
    const conversionChartData = useMemo(() => {
        const data = viewMode === 'monthly' ? monthlyStats : weeklyStats;
        return data.map(item => ({
            label: viewMode === 'monthly'
                ? formatMonth(item.signup_month)
                : formatWeek(item.signup_week),
            signups: item.total_signups || 0,
            conversions: item.total_conversions || 0,
            rate: item.conversion_rate || 0
        }));
    }, [monthlyStats, weeklyStats, viewMode]);

    // Prepare source pie chart data with proper colors
    const sourcePieData = useMemo(() => {
        return sourcePerformance
            .filter(s => s.total_users > 0)
            .slice(0, 10)
            .map((s, index) => ({
                name: s.referral_source,
                value: s.total_users,
                conversions: s.converted_users,
                rate: s.conversion_rate,
                color: getSourceColor(s.referral_source, index)
            }));
    }, [sourcePerformance]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-rose-700">Error loading acquisition data: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Signups"
                    value={kpis.totalSignups.toLocaleString()}
                    subtitle="Since Nov 2024"
                    icon={Users}
                    color="violet"
                />
                <KPICard
                    title="Conversions"
                    value={kpis.totalConversions.toLocaleString()}
                    subtitle="Paid subscribers"
                    icon={UserCheck}
                    color="emerald"
                />
                <KPICard
                    title="Conversion Rate"
                    value={`${kpis.conversionRate}%`}
                    subtitle="Signup → Paid"
                    icon={TrendingUp}
                    color="sky"
                />
                <KPICard
                    title="Avg Days to Convert"
                    value={kpis.avgDaysToConvert}
                    subtitle="From signup to payment"
                    icon={Clock}
                    color="amber"
                />
            </div>

            {/* Conversion Funnel Sankey */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Conversion Funnel</h3>
                <ConversionSankey
                    signups={kpis.totalSignups}
                    users={totalUsers || 0}
                    paid={kpis.totalConversions}
                />
            </div>

            {/* Conversion Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-800">Conversion Trend</h3>
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setViewMode('monthly')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'monthly'
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'weekly'
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Weekly
                        </button>
                    </div>
                </div>

                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={conversionChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 12, fill: '#64748b' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Legend />
                            <Bar
                                yAxisId="left"
                                dataKey="signups"
                                name="Signups"
                                fill={COLORS.primary}
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="conversions"
                                name="Conversions"
                                fill={COLORS.success}
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Referral Sources */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">Referral Sources</h3>

                    <div className="h-64 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourcePieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {sourcePieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomPieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Source Table */}
                    <div className="space-y-2">
                        {sourcePieData.slice(0, 6).map((source) => (
                            <div
                                key={source.name}
                                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: source.color }}
                                    />
                                    <span className="text-sm text-slate-700">{source.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-500">{source.value} users</span>
                                    <span className={`text-sm font-medium ${
                                        source.rate >= 10 ? 'text-emerald-600' :
                                        source.rate >= 5 ? 'text-amber-600' :
                                        'text-slate-600'
                                    }`}>
                                        {source.rate}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Geography Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6">Geography Breakdown</h3>

                    <div className="space-y-4">
                        {geographyStats
                            .filter(g => g.geography !== 'Not Converted')
                            .map(geo => {
                                const isVietnam = geo.geography === 'Vietnam';
                                return (
                                    <div
                                        key={geo.geography}
                                        className="p-4 bg-slate-50 rounded-xl"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isVietnam ? (
                                                    <MapPin size={18} className="text-rose-500" />
                                                ) : (
                                                    <Globe size={18} className="text-sky-500" />
                                                )}
                                                <span className="font-medium text-slate-800">{geo.geography}</span>
                                            </div>
                                            <span className="text-lg font-bold text-slate-900">
                                                {geo.converted_users} conversions
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-slate-500">
                                            <span>Conversion Rate</span>
                                            <span className={`font-medium ${
                                                geo.conversion_rate >= 10 ? 'text-emerald-600' : 'text-slate-700'
                                            }`}>
                                                {geo.conversion_rate}%
                                            </span>
                                        </div>
                                        {geo.total_revenue_usd > 0 && (
                                            <div className="flex items-center justify-between text-sm text-slate-500 mt-1">
                                                <span>Revenue</span>
                                                <span className="font-medium text-slate-700">
                                                    ${geo.total_revenue_usd?.toLocaleString() || 0}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                        {/* Not Converted Summary */}
                        {geographyStats.find(g => g.geography === 'Not Converted') && (
                            <div className="p-4 bg-slate-100 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Not Yet Converted</span>
                                    <span className="font-medium text-slate-700">
                                        {geographyStats.find(g => g.geography === 'Not Converted')?.total_users || 0} users
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AcquisitionOverview;
