import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    Users,
    UserPlus,
    Eye,
    Heart,
    FileText,
    TrendingUp,
    ExternalLink,
    MessageSquare,
    Trophy,
    Repeat2,
    Quote,
    MessageCircle,
    ChevronDown
} from 'lucide-react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Threads brand color (black)
const THREADS_BLACK = '#000000';

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper: Generate "pretty" tick values for Y-axis
const getSmartTicks = (maxValue) => {
    if (maxValue <= 0) return [0];

    let step;
    if (maxValue <= 10) {
        step = 2;
    } else if (maxValue <= 25) {
        step = 5;
    } else if (maxValue <= 50) {
        step = 10;
    } else if (maxValue <= 100) {
        step = 25;
    } else if (maxValue <= 250) {
        step = 50;
    } else if (maxValue <= 500) {
        step = 100;
    } else if (maxValue <= 1000) {
        step = 250;
    } else if (maxValue <= 2500) {
        step = 500;
    } else if (maxValue <= 5000) {
        step = 1000;
    } else {
        const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
        step = magnitude / 2;
    }

    const roundedMax = Math.ceil(maxValue / step) * step;
    const ticks = [];
    for (let i = 0; i <= roundedMax; i += step) {
        ticks.push(i);
    }

    if (ticks.length > 6) {
        const newStep = step * 2;
        const newTicks = [];
        for (let i = 0; i <= roundedMax; i += newStep) {
            newTicks.push(i);
        }
        return newTicks;
    }

    return ticks;
};

// Metric configuration for Threads (adjusted metrics)
const CHART_METRICS = [
    { key: 'views', label: 'Views', color: THREADS_BLACK, icon: Eye },
    { key: 'engagements', label: 'Engagements', color: '#6B7280', icon: Heart },
    { key: 'newFollowers', label: 'New Followers', color: '#10B981', icon: UserPlus },
    { key: 'posts', label: 'Threads', color: '#8B5CF6', icon: FileText }
];

// Threads engagement types (different from Facebook reactions)
const ENGAGEMENT_CONFIG = {
    likes: { icon: Heart, color: '#EF4444', label: 'Likes' },
    reposts: { icon: Repeat2, color: '#10B981', label: 'Reposts' },
    quotes: { icon: Quote, color: '#3B82F6', label: 'Quotes' },
    replies: { icon: MessageCircle, color: '#F59E0B', label: 'Replies' }
};

// Delta Badge component
const DeltaBadge = ({ value }) => {
    if (value === null || value === undefined) return null;

    const isPositive = value >= 0;
    const formattedValue = Math.abs(value).toFixed(1);

    return (
        <span className={`
            inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold
            ${isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }
        `}>
            {isPositive ? '↑' : '↓'} {formattedValue}%
        </span>
    );
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

// Metric Radio Button
const MetricRadioButton = ({ metric, isActive, onClick }) => {
    const Icon = metric.icon;
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-200 ease-in-out
                ${isActive
                    ? 'text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }
            `}
            style={isActive ? { backgroundColor: metric.color } : {}}
        >
            <Icon size={14} />
            {metric.label}
        </button>
    );
};

// Custom Tooltip for Performance Chart
const PerformanceTooltip = ({ active, payload, label, metric }) => {
    if (!active || !payload || payload.length === 0) return null;

    const value = payload[0]?.value || 0;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">
                {format(parseLocalDate(label), 'MMM dd, yyyy')}
            </p>
            <p style={{ color: metric.color }} className="text-sm">
                {metric.label}: <span className="font-bold">{value.toLocaleString()}</span>
            </p>
        </div>
    );
};

// Performance Chart Component
const PerformanceChart = ({ chartData, activeMetric, setActiveMetric, deltas }) => {
    const selectedMetric = CHART_METRICS.find(m => m.key === activeMetric);

    const values = chartData.map(d => d[activeMetric] || 0);
    const nonZeroValues = values.filter(v => v > 0);
    const average = nonZeroValues.length > 0
        ? Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length)
        : 0;

    const peakValue = values.length > 0 ? Math.max(...values) : 0;
    const lowValue = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
    const peakData = chartData.find(d => d[activeMetric] === peakValue);
    const peakDate = peakData?.date ? format(parseLocalDate(peakData.date), 'MMM d') : null;

    const yAxisTicks = getSmartTicks(peakValue);

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Performance Overview</h3>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-xs text-gray-500">Average</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-900">{average.toLocaleString()}</p>
                        </div>
                        {deltas[activeMetric] !== undefined && (
                            <DeltaBadge value={deltas[activeMetric]} />
                        )}
                    </div>

                    <div className="h-10 w-px bg-gray-200 hidden md:block" />

                    <div>
                        <p className="text-xs text-gray-500">Peak</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl md:text-2xl font-bold text-gray-900">{peakValue.toLocaleString()}</p>
                            {peakDate && (
                                <span className="text-xs text-gray-500">{peakDate}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metric Toggles */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide mb-4">
                <div className="flex gap-2 min-w-max">
                    {CHART_METRICS.map((metric) => (
                        <MetricRadioButton
                            key={metric.key}
                            metric={metric}
                            isActive={activeMetric === metric.key}
                            onClick={() => setActiveMetric(metric.key)}
                        />
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="h-[250px] md:h-[300px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`threadsGradient${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={selectedMetric.color} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={selectedMetric.color} stopOpacity={0} />
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
                                tickMargin={10}
                            />
                            <YAxis
                                stroke="#6B7280"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                                domain={[0, yAxisTicks[yAxisTicks.length - 1]]}
                                ticks={yAxisTicks}
                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                            />
                            <Tooltip content={<PerformanceTooltip metric={selectedMetric} />} />
                            <Area
                                type="monotone"
                                dataKey={activeMetric}
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#threadsGradient${activeMetric})`}
                            />
                            <Line
                                type="monotone"
                                dataKey={activeMetric}
                                stroke={selectedMetric.color}
                                strokeWidth={3}
                                dot={(props) => {
                                    const { cx, cy, payload } = props;
                                    const value = payload[activeMetric];
                                    const isPeak = value === peakValue && peakValue > 0;
                                    const isLow = value === lowValue && lowValue > 0 && peakValue !== lowValue;

                                    if (!isPeak && !isLow) return null;

                                    return (
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={6}
                                            fill={selectedMetric.color}
                                            stroke="white"
                                            strokeWidth={2}
                                        />
                                    );
                                }}
                                activeDot={{ r: 6, strokeWidth: 0, fill: selectedMetric.color }}
                                label={(props) => {
                                    const { x, y, value } = props;
                                    const isPeak = value === peakValue && peakValue > 0;
                                    const isLow = value === lowValue && lowValue > 0 && peakValue !== lowValue;

                                    if (!isPeak && !isLow) return null;

                                    const yOffset = isPeak ? -15 : 20;

                                    return (
                                        <text
                                            x={x}
                                            y={y + yOffset}
                                            fill={selectedMetric.color}
                                            fontSize={11}
                                            fontWeight="bold"
                                            textAnchor="middle"
                                        >
                                            {isPeak ? '↑' : '↓'} {value.toLocaleString()}
                                        </text>
                                    );
                                }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        No data available for this period
                    </div>
                )}
            </div>
        </div>
    );
};

// Calculate total engagements
const getTotalEngagements = (post) => {
    return (post.likes || 0) + (post.reposts || 0) + (post.quotes || 0) + (post.replies || 0);
};

const ThreadsOverview = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId;
    const accountsLoading = context?.accountsLoading;
    const accounts = context?.accounts || [];
    const onAccountChange = context?.onAccountChange;

    // Get the platform_account_id for the selected account (used for daily_metrics_summary)
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const platformAccountId = selectedAccount?.platform_account_id;

    const [accountMetrics, setAccountMetrics] = useState([]);
    const [dailySummary, setDailySummary] = useState([]);
    const [posts, setPosts] = useState([]);
    const [postsInRange, setPostsInRange] = useState(0);
    const [dailyPostCounts, setDailyPostCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeMetric, setActiveMetric] = useState('views');
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            // Skip if accounts still loading or no account selected
            if (accountsLoading || !selectedAccountId || !platformAccountId) return;
            if (!startDate || !endDate) return;

            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Use selected account from context
                const accountId = selectedAccountId;
                console.log('[ThreadsOverview] Using account_id:', accountId, 'platform_account_id:', platformAccountId);

                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                const prevStartDate = subDays(startDate, periodLength);
                const prevEndDate = subDays(startDate, 1);
                const prevStartString = toDateString(prevStartDate);
                const prevEndString = toDateString(prevEndDate);

                // Fetch daily_metrics_summary filtered by platform_id (account-specific)
                const dailySummaryPromise = supabaseSocialAnalytics
                    .from('daily_metrics_summary')
                    .select('*')
                    .eq('platform_id', platformAccountId)
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });

                const prevDailySummaryPromise = supabaseSocialAnalytics
                    .from('daily_metrics_summary')
                    .select('*')
                    .eq('platform_id', platformAccountId)
                    .gte('metric_date', prevStartString)
                    .lte('metric_date', prevEndString);

                // Fetch account metrics - filter by account_id
                let accountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });
                if (accountId) accountMetricsQuery = accountMetricsQuery.eq('account_id', accountId);

                let prevMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', prevStartString)
                    .lte('metric_date', prevEndString);
                if (accountId) prevMetricsQuery = prevMetricsQuery.eq('account_id', accountId);

                // Fetch recent posts - filter by account_id
                const recentPostsPromise = supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', accountId)
                    .order('published_at', { ascending: false })
                    .limit(5);

                // Fetch posts in date range - filter by account_id
                const postsInRangePromise = supabaseSocialAnalytics
                    .from('posts')
                    .select('id, published_at')
                    .eq('account_id', accountId)
                    .gte('published_at', startDateString)
                    .lte('published_at', endDateString + 'T23:59:59');

                const [dailySummaryRes, prevDailySummaryRes, accountRes, prevRes, recentPostsRes, postsInRangeRes] = await Promise.all([
                    dailySummaryPromise,
                    prevDailySummaryPromise,
                    accountMetricsQuery,
                    prevMetricsQuery,
                    recentPostsPromise,
                    postsInRangePromise
                ]);

                if (dailySummaryRes.error) throw dailySummaryRes.error;
                if (prevDailySummaryRes.error) throw prevDailySummaryRes.error;
                if (accountRes.error) throw accountRes.error;
                if (prevRes.error) throw prevRes.error;
                if (recentPostsRes.error) throw recentPostsRes.error;
                if (postsInRangeRes.error) throw postsInRangeRes.error;

                // Store daily summary with previous period
                const summaryData = dailySummaryRes.data || [];
                summaryData._prevPeriod = prevDailySummaryRes.data || [];
                setDailySummary(summaryData);

                setAccountMetrics(accountRes.data || []);

                const postsInRangeData = postsInRangeRes.data || [];
                setPostsInRange(postsInRangeData.length);

                const dailyCounts = {};
                postsInRangeData.forEach(post => {
                    if (post.published_at) {
                        const dateKey = post.published_at.split('T')[0];
                        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
                    }
                });
                setDailyPostCounts(dailyCounts);

                // Fetch metrics for posts
                const postsData = recentPostsRes.data || [];
                if (postsData.length > 0) {
                    const postIds = postsData.map(p => p.id);

                    const { data: metricsData, error: metricsError } = await supabaseSocialAnalytics
                        .from('post_metrics_daily')
                        .select('*')
                        .in('post_id', postIds);

                    if (metricsError) {
                        console.error('Error fetching post metrics:', metricsError);
                    }

                    const metricsMap = {};
                    (metricsData || []).forEach(m => {
                        if (!metricsMap[m.post_id] || m.metric_date > metricsMap[m.post_id].metric_date) {
                            metricsMap[m.post_id] = m;
                        }
                    });

                    const postsWithMetrics = postsData.map(post => ({
                        ...post,
                        ...(metricsMap[post.id] || {})
                    }));

                    setPosts(postsWithMetrics);
                } else {
                    setPosts([]);
                }

                // Store previous period for deltas
                setAccountMetrics(prev => {
                    const data = accountRes.data || [];
                    data._prevPeriod = prevRes.data || [];
                    return data;
                });

            } catch (err) {
                console.error('Error fetching Threads data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId, accountsLoading, platformAccountId]);

    // Process data
    const {
        currentFollowers,
        totalNewFollowers,
        totalViews,
        totalEngagements,
        engagementRate,
        totalPosts,
        chartData,
        deltas,
        bestPost,
        engagementBreakdown
    } = useMemo(() => {
        if (!accountMetrics || accountMetrics.length === 0) {
            return {
                currentFollowers: 0,
                totalNewFollowers: 0,
                totalViews: 0,
                totalEngagements: 0,
                engagementRate: 0,
                totalPosts: 0,
                chartData: [],
                deltas: {},
                bestPost: null,
                engagementBreakdown: []
            };
        }

        const latestMetric = accountMetrics[accountMetrics.length - 1];
        const currentFollowers = latestMetric?.followers_count || 0;

        // Use daily_new_followers from daily_metrics_summary instead of daily_follows from account_metrics_daily
        const totalNewFollowers = dailySummary.reduce((sum, m) => sum + (m.daily_new_followers || 0), 0);
        const totalViews = accountMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
        const totalEngagements = accountMetrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

        // Previous period
        const prevData = accountMetrics._prevPeriod || [];
        const prevDailySummary = dailySummary._prevPeriod || [];
        const prevViews = prevData.reduce((sum, m) => sum + (m.reach || 0), 0);
        const prevEngagements = prevData.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const prevFollowers = prevData.length > 0 ? prevData[prevData.length - 1]?.followers_count || 0 : 0;
        const prevNewFollowers = prevDailySummary.reduce((sum, m) => sum + (m.daily_new_followers || 0), 0);

        const calcDelta = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const deltas = {
            followers: calcDelta(currentFollowers, prevFollowers),
            newFollowers: calcDelta(totalNewFollowers, prevNewFollowers),
            views: calcDelta(totalViews, prevViews),
            engagements: calcDelta(totalEngagements, prevEngagements)
        };

        // Create a lookup map for daily_new_followers by date
        const dailySummaryByDate = {};
        dailySummary.forEach(m => {
            dailySummaryByDate[m.metric_date] = m;
        });

        const chartData = accountMetrics.map(m => ({
            date: m.metric_date,
            views: m.reach || 0,
            engagements: m.engagements || 0,
            newFollowers: dailySummaryByDate[m.metric_date]?.daily_new_followers || 0,
            posts: dailyPostCounts[m.metric_date] || 0
        }));

        // Engagement breakdown for Threads (likes, reposts, quotes, replies)
        const engagementBreakdown = [
            { key: 'likes', label: 'Likes', value: 60, color: '#EF4444', icon: Heart },
            { key: 'reposts', label: 'Reposts', value: 25, color: '#10B981', icon: Repeat2 },
            { key: 'quotes', label: 'Quotes', value: 10, color: '#3B82F6', icon: Quote },
            { key: 'replies', label: 'Replies', value: 5, color: '#F59E0B', icon: MessageCircle }
        ];

        return {
            currentFollowers,
            totalNewFollowers,
            totalViews,
            totalEngagements,
            engagementRate,
            totalPosts: postsInRange,
            chartData,
            deltas,
            bestPost: posts[0] || null,
            engagementBreakdown
        };
    }, [accountMetrics, dailySummary, posts, postsInRange, dailyPostCounts]);

    if (accountsLoading || loading) {
        return (
            <div className="flex items-center justify-center py-20 text-black">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!selectedAccountId) {
        return (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl">
                No Threads account configured. Please contact your administrator.
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading Threads data: {error}
            </div>
        );
    }

    const totalEngagementsBreakdown = engagementBreakdown.reduce((sum, r) => sum + r.value, 0);

    // Determine profile picture - use account's profile_picture or fallback to default logo
    const profilePicture = selectedAccount?.profile_picture || '/logo-icon.png';
    const accountName = selectedAccount?.account_name || 'Threads Profile';
    const hasMultipleAccounts = accounts.length > 1;

    return (
        <div className="space-y-4">
            {/* Profile Context Bar with Account Switcher */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    {/* Account Selector (clickable if multiple accounts) */}
                    <div className="relative">
                        <button
                            onClick={() => hasMultipleAccounts && setAccountDropdownOpen(!accountDropdownOpen)}
                            className={`flex items-center gap-3 ${hasMultipleAccounts ? 'cursor-pointer hover:bg-slate-50 -m-2 p-2 rounded-xl transition-colors' : 'cursor-default'}`}
                            disabled={!hasMultipleAccounts}
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                                <img
                                    src={profilePicture}
                                    alt={accountName}
                                    className="w-10 h-10 md:w-12 md:h-12 object-cover"
                                    onError={(e) => { e.target.src = '/logo-icon.png'; }}
                                />
                            </div>
                            <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                    <h2 className="text-base md:text-lg font-semibold text-slate-800">{accountName}</h2>
                                    {hasMultipleAccounts && (
                                        <ChevronDown
                                            size={16}
                                            className={`text-slate-400 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`}
                                        />
                                    )}
                                </div>
                                <p className="text-xs md:text-sm text-slate-500">Threads Profile</p>
                            </div>
                        </button>

                        {/* Account Dropdown */}
                        {accountDropdownOpen && hasMultipleAccounts && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setAccountDropdownOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[240px] py-1">
                                    {accounts.map((account) => (
                                        <button
                                            key={account.id}
                                            onClick={() => {
                                                onAccountChange?.(account.id);
                                                setAccountDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                                                account.id === selectedAccountId ? 'bg-slate-100' : ''
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                                                <img
                                                    src={account.profile_picture || '/logo-icon.png'}
                                                    alt={account.account_name}
                                                    className="w-8 h-8 object-cover"
                                                    onError={(e) => { e.target.src = '/logo-icon.png'; }}
                                                />
                                            </div>
                                            <span className={`text-sm ${account.id === selectedAccountId ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                                {account.account_name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{currentFollowers.toLocaleString()}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Total Followers</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{engagementRate.toFixed(2)}%</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Avg Engagement</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{totalPosts}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Total Threads</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    icon={Eye}
                    label="Views"
                    value={totalViews.toLocaleString()}
                    delta={deltas.views}
                    iconBg="bg-slate-100"
                    iconColor="text-slate-700"
                />
                <KPICard
                    icon={Heart}
                    label="Engagements"
                    value={totalEngagements.toLocaleString()}
                    delta={deltas.engagements}
                    iconBg="bg-pink-50"
                    iconColor="text-pink-500"
                />
                <KPICard
                    icon={UserPlus}
                    label="New Followers"
                    value={totalNewFollowers.toLocaleString()}
                    delta={deltas.newFollowers}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-500"
                />
                <KPICard
                    icon={FileText}
                    label="Threads"
                    value={totalPosts.toLocaleString()}
                    subtext="In date range"
                    iconBg="bg-violet-50"
                    iconColor="text-violet-500"
                />
            </div>

            {/* Performance Chart */}
            <PerformanceChart
                chartData={chartData}
                activeMetric={activeMetric}
                setActiveMetric={setActiveMetric}
                deltas={deltas}
            />

            {/* Bottom Row: Recent Posts & Engagement Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Threads */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="text-sm md:text-base font-semibold text-slate-800 tracking-tight">Recent Threads</h3>
                        <span className="text-[10px] md:text-xs text-slate-400">Last 5 threads</span>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                        {posts.length > 0 ? (
                            posts.map((post) => (
                                <div
                                    key={post.id}
                                    className="flex items-start md:items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <MessageSquare size={14} className="text-slate-500 md:hidden" />
                                        <MessageSquare size={18} className="text-slate-500 hidden md:block" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs md:text-sm text-slate-700 line-clamp-2 md:line-clamp-1">
                                            {post.content_text?.substring(0, 60) || 'No content'}
                                            {post.content_text?.length > 60 && '...'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] md:text-xs text-slate-400">
                                                {post.published_at ? format(new Date(post.published_at), 'MMM d') : 'No date'}
                                            </p>
                                            <div className="flex items-center gap-2 md:hidden text-slate-400">
                                                <span className="text-[10px] flex items-center gap-0.5">
                                                    <Eye size={10} /> {(post.reach || 0).toLocaleString()}
                                                </span>
                                                <span className="text-[10px] flex items-center gap-0.5">
                                                    <Heart size={10} /> {(post.likes || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Eye size={14} />
                                            <span className="text-xs font-medium">{(post.reach || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Heart size={14} />
                                            <span className="text-xs font-medium">{(post.likes || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Repeat2 size={14} />
                                            <span className="text-xs font-medium">{(post.reposts || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {post.permalink && (
                                        <a
                                            href={post.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 md:p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
                                        >
                                            <ExternalLink size={12} className="md:hidden" />
                                            <ExternalLink size={14} className="hidden md:block" />
                                        </a>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 md:py-8 text-slate-400">
                                <MessageSquare size={24} className="mx-auto mb-2 opacity-50 md:hidden" />
                                <MessageSquare size={32} className="mx-auto mb-2 opacity-50 hidden md:block" />
                                <p className="text-xs md:text-sm">No threads found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Engagement Breakdown */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-sm md:text-base font-semibold text-slate-800 tracking-tight mb-3 md:mb-4">Engagement Breakdown</h3>

                    <div className="relative mx-auto w-[160px] h-[160px] md:w-[200px] md:h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={engagementBreakdown}
                                    dataKey="value"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="55%"
                                    outerRadius="85%"
                                    paddingAngle={2}
                                >
                                    {engagementBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `${value}%`}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        borderColor: '#E2E8F0',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-xl md:text-2xl font-bold text-slate-800">{totalEngagementsBreakdown}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Total</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-3 md:mt-4">
                        {engagementBreakdown.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <div key={index} className="flex items-center gap-1">
                                    <Icon size={14} style={{ color: item.color }} />
                                    <span className="text-[10px] md:text-xs text-slate-600 font-medium">{item.value}%</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Top Performer */}
                    {bestPost && (
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg md:rounded-xl border border-slate-200 p-3 md:p-4 mt-3 md:mt-4">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <Trophy size={14} className="text-slate-600 md:hidden" />
                                <Trophy size={16} className="text-slate-600 hidden md:block" />
                                <span className="text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wide">Top Performer</span>
                            </div>

                            <div className="bg-white rounded-lg p-2.5 md:p-3 shadow-sm">
                                <p className="text-xs md:text-sm text-slate-700 line-clamp-2 mb-2">
                                    {bestPost.content_text?.substring(0, 80) || 'No content'}
                                    {bestPost.content_text?.length > 80 && '...'}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] md:text-xs text-slate-400">
                                        {bestPost.published_at ? format(new Date(bestPost.published_at), 'MMM d') : ''}
                                    </span>
                                    <div className="flex items-center gap-1 text-emerald-600">
                                        <TrendingUp size={12} className="md:hidden" />
                                        <TrendingUp size={14} className="hidden md:block" />
                                        <span className="text-[10px] md:text-xs font-semibold">{(bestPost.reach || 0).toLocaleString()} views</span>
                                    </div>
                                </div>
                            </div>

                            {bestPost.permalink && (
                                <a
                                    href={bestPost.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 mt-3 text-xs text-slate-600 hover:text-slate-800"
                                >
                                    View on Threads <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThreadsOverview;
