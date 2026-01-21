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
    MousePointer,
    FileText,
    TrendingUp,
    ExternalLink,
    ThumbsUp,
    Trophy,
    MessageSquare,
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
    ReferenceLine,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Facebook brand color
const FB_BLUE = '#1877F2';

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
// Ensures round numbers (multiples of 10, 25, 50, 100, etc.) and always starts at 0
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
        // For larger ranges, use powers of 10
        const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
        step = magnitude / 2;
    }

    // Round max up to the nearest step
    const roundedMax = Math.ceil(maxValue / step) * step;

    // Generate ticks from 0 to roundedMax
    const ticks = [];
    for (let i = 0; i <= roundedMax; i += step) {
        ticks.push(i);
    }

    // Ensure we don't have too many ticks (max 6)
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

// Metric configuration for single-select radio buttons (matching KPI card order)
const CHART_METRICS = [
    { key: 'views', label: 'Views', color: FB_BLUE, icon: Eye },
    { key: 'engagements', label: 'Engagements', color: '#EC4899', icon: Heart },
    { key: 'visits', label: 'Visits', color: '#8B5CF6', icon: MousePointer },
    { key: 'newFollowers', label: 'New Followers', color: '#10B981', icon: UserPlus },
    { key: 'posts', label: 'Posts', color: '#F43F5E', icon: FileText }
];

// Time range presets
const TIME_RANGES = [
    { label: '7D', days: 7 },
    { label: '14D', days: 14 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 }
];

// FB Page Launch date for annotation
const FB_PAGE_LAUNCH_DATE = '2024-11-10';

// Custom SVG label component for the FB page launch annotation
const FBLaunchLabel = ({ viewBox }) => {
    const { x, y } = viewBox;
    const labelX = x + 8;
    const labelY = y + 16;

    return (
        <g>
            {/* Pill background */}
            <rect
                x={labelX}
                y={labelY - 12}
                width={95}
                height={20}
                rx={10}
                fill="#EFF6FF"
                stroke="#3B82F6"
                strokeWidth={1}
            />
            {/* Label text */}
            <text
                x={labelX + 47.5}
                y={labelY + 2}
                textAnchor="middle"
                fill="#2563EB"
                fontSize={10}
                fontWeight={600}
            >
                FB Page Launch
            </text>
        </g>
    );
};

// Delta Badge component for showing percentage change
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

// Metric Radio Button (single-select)
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

// Custom Tooltip for Performance Chart (matches DAU chart style)
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

// Performance Chart Component - Separated for cleaner code
const PerformanceChart = ({ chartData, activeMetric, setActiveMetric, deltas }) => {
    const selectedMetric = CHART_METRICS.find(m => m.key === activeMetric);

    // Calculate average and peak for selected metric
    const values = chartData.map(d => d[activeMetric] || 0);
    const nonZeroValues = values.filter(v => v > 0);
    const average = nonZeroValues.length > 0
        ? Math.round(nonZeroValues.reduce((a, b) => a + b, 0) / nonZeroValues.length)
        : 0;

    // Find peak and low points
    const peakValue = values.length > 0 ? Math.max(...values) : 0;
    const lowValue = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
    const peakData = chartData.find(d => d[activeMetric] === peakValue);
    const lowData = chartData.find(d => d[activeMetric] === lowValue);
    const peakDate = peakData?.date ? format(parseLocalDate(peakData.date), 'MMM d') : null;

    // Calculate smart ticks for Y-axis
    const yAxisTicks = getSmartTicks(peakValue);

    // Check if FB launch date is in data range
    const hasFBLaunch = chartData.some(d => d.date === FB_PAGE_LAUNCH_DATE);

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            {/* Rich Header with Title and Metrics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                {/* Left Side: Title */}
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Performance Overview</h3>

                {/* Right Side: Metrics */}
                <div className="flex items-center gap-6">
                    {/* Average Metric */}
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-xs text-gray-500">Average</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-900">{average.toLocaleString()}</p>
                        </div>
                        {deltas[activeMetric] !== undefined && (
                            <DeltaBadge value={deltas[activeMetric]} />
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-10 w-px bg-gray-200 hidden md:block" />

                    {/* Peak Metric */}
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

            {/* Metric Radio Buttons (single-select) - Below header */}
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
                                <linearGradient id={`perfGradient${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
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
                            {/* FB Page Launch Annotation - only show if date is in range */}
                            {hasFBLaunch && (
                                <ReferenceLine
                                    x={FB_PAGE_LAUNCH_DATE}
                                    stroke="#3B82F6"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={<FBLaunchLabel />}
                                />
                            )}
                            <Area
                                type="monotone"
                                dataKey={activeMetric}
                                stroke="none"
                                fillOpacity={1}
                                fill={`url(#perfGradient${activeMetric})`}
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

                                    // Offset: peak labels above, low labels below
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

// Reactions configuration with emoji and color mapping
const REACTION_CONFIG = {
    like: { emoji: '👍', color: '#1877F2', label: 'Like' },
    love: { emoji: '❤️', color: '#E74C3C', label: 'Love' },
    haha: { emoji: '😂', color: '#F7B928', label: 'Haha' },
    wow: { emoji: '😮', color: '#F7B928', label: 'Wow' },
    sad: { emoji: '😢', color: '#F7B928', label: 'Sad' },
    angry: { emoji: '😠', color: '#E9573F', label: 'Angry' }
};

// Calculate total reactions from breakdown object
const getTotalReactions = (reactionsBreakdown) => {
    if (!reactionsBreakdown) return 0;
    return Object.values(reactionsBreakdown).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
};

const FacebookOverview = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId;
    const accountsLoading = context?.accountsLoading;
    const accounts = context?.accounts || [];
    const onAccountChange = context?.onAccountChange;

    // Get selected account details
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    const [accountMetrics, setAccountMetrics] = useState([]);
    const [posts, setPosts] = useState([]);
    const [postsInRange, setPostsInRange] = useState(0);
    const [dailyPostCounts, setDailyPostCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Single-select state for chart metric
    const [activeMetric, setActiveMetric] = useState('views');
    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

    // Fetch data from social_analytics schema (using supabaseSocialAnalytics client)
    useEffect(() => {
        const fetchData = async () => {
            // Skip if accounts still loading or no account selected
            if (accountsLoading || !selectedAccountId) return;
            if (!startDate || !endDate) return;

            // Check if social client is available
            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured. Check environment variables.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Use selected account from context
                const accountId = selectedAccountId;
                console.log('[FacebookOverview] Using account_id:', accountId);

                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Calculate previous period for delta comparison
                const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                const prevStartDate = subDays(startDate, periodLength);
                const prevEndDate = subDays(startDate, 1);
                const prevStartString = toDateString(prevStartDate);
                const prevEndString = toDateString(prevEndDate);

                // Fetch account metrics for current period - filter by account_id
                let accountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });
                if (accountId) accountMetricsQuery = accountMetricsQuery.eq('account_id', accountId);

                // Fetch account metrics for previous period (for delta calculation)
                let prevMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', prevStartString)
                    .lte('metric_date', prevEndString);
                if (accountId) prevMetricsQuery = prevMetricsQuery.eq('account_id', accountId);

                // Fetch recent posts (last 5 for display) - filter by account_id
                const recentPostsPromise = supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', accountId)
                    .order('published_at', { ascending: false })
                    .limit(5);

                // Fetch posts in date range for count and chart - filter by account_id
                const postsInRangePromise = supabaseSocialAnalytics
                    .from('posts')
                    .select('id, published_at')
                    .eq('account_id', accountId)
                    .gte('published_at', startDateString)
                    .lte('published_at', endDateString + 'T23:59:59');

                const [accountRes, prevRes, recentPostsRes, postsInRangeRes] = await Promise.all([
                    accountMetricsQuery,
                    prevMetricsQuery,
                    recentPostsPromise,
                    postsInRangePromise
                ]);

                if (accountRes.error) throw accountRes.error;
                if (prevRes.error) throw prevRes.error;
                if (recentPostsRes.error) throw recentPostsRes.error;
                if (postsInRangeRes.error) throw postsInRangeRes.error;

                setAccountMetrics(accountRes.data || []);

                // Calculate posts in date range and daily counts
                const postsInRangeData = postsInRangeRes.data || [];
                setPostsInRange(postsInRangeData.length);

                // Create daily post count map
                const dailyCounts = {};
                postsInRangeData.forEach(post => {
                    if (post.published_at) {
                        const dateKey = post.published_at.split('T')[0];
                        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
                    }
                });
                setDailyPostCounts(dailyCounts);

                // Fetch metrics for posts from post_metrics_daily table
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

                    // Merge metrics into posts (take latest metrics per post)
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

                // Store previous period data for delta calculations
                setAccountMetrics(prev => {
                    const data = accountRes.data || [];
                    data._prevPeriod = prevRes.data || [];
                    return data;
                });

            } catch (err) {
                console.error('Error fetching Facebook data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId, accountsLoading]);

    // Process data for KPIs and charts
    const {
        currentFollowers,
        totalNewFollowers,
        totalViews,
        totalEngagements,
        totalVisits,
        engagementRate,
        totalPosts,
        chartData,
        deltas,
        bestPost,
        reactionsBreakdown
    } = useMemo(() => {
        if (!accountMetrics || accountMetrics.length === 0) {
            return {
                currentFollowers: 0,
                totalNewFollowers: 0,
                totalViews: 0,
                totalEngagements: 0,
                totalVisits: 0,
                engagementRate: 0,
                totalPosts: 0,
                chartData: [],
                deltas: {},
                bestPost: null,
                reactionsBreakdown: []
            };
        }

        // Current period aggregations
        const latestMetric = accountMetrics[accountMetrics.length - 1];
        const currentFollowers = latestMetric?.followers_count || 0;

        const totalNewFollowers = accountMetrics.reduce((sum, m) => sum + (m.daily_follows || 0), 0);
        const totalViews = accountMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
        const totalEngagements = accountMetrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const totalVisits = accountMetrics.reduce((sum, m) => sum + (m.page_views || 0), 0);
        const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

        // Previous period aggregations for deltas
        const prevData = accountMetrics._prevPeriod || [];
        const prevViews = prevData.reduce((sum, m) => sum + (m.reach || 0), 0);
        const prevEngagements = prevData.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const prevVisits = prevData.reduce((sum, m) => sum + (m.page_views || 0), 0);
        const prevFollowers = prevData.length > 0 ? prevData[prevData.length - 1]?.followers_count || 0 : 0;
        const prevNewFollowers = prevData.reduce((sum, m) => sum + (m.daily_follows || 0), 0);

        // Calculate deltas (percentage change)
        const calcDelta = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const deltas = {
            followers: calcDelta(currentFollowers, prevFollowers),
            newFollowers: calcDelta(totalNewFollowers, prevNewFollowers),
            views: calcDelta(totalViews, prevViews),
            engagements: calcDelta(totalEngagements, prevEngagements),
            visits: calcDelta(totalVisits, prevVisits)
        };

        // Chart data with absolute values (single metric view, Y-axis scales dynamically)
        const chartData = accountMetrics.map(m => ({
            date: m.metric_date,
            views: m.reach || 0,
            engagements: m.engagements || 0,
            visits: m.page_views || 0,
            newFollowers: m.daily_follows || 0,
            posts: dailyPostCounts[m.metric_date] || 0
        }));

        // Mock reactions breakdown (would come from post_metrics_daily)
        const reactionsBreakdown = [
            { key: 'like', name: REACTION_CONFIG.like.label, emoji: REACTION_CONFIG.like.emoji, value: 65, color: REACTION_CONFIG.like.color },
            { key: 'love', name: REACTION_CONFIG.love.label, emoji: REACTION_CONFIG.love.emoji, value: 20, color: REACTION_CONFIG.love.color },
            { key: 'haha', name: REACTION_CONFIG.haha.label, emoji: REACTION_CONFIG.haha.emoji, value: 8, color: REACTION_CONFIG.haha.color },
            { key: 'wow', name: REACTION_CONFIG.wow.label, emoji: REACTION_CONFIG.wow.emoji, value: 4, color: REACTION_CONFIG.wow.color },
            { key: 'sad', name: REACTION_CONFIG.sad.label, emoji: REACTION_CONFIG.sad.emoji, value: 2, color: REACTION_CONFIG.sad.color },
            { key: 'angry', name: REACTION_CONFIG.angry.label, emoji: REACTION_CONFIG.angry.emoji, value: 1, color: REACTION_CONFIG.angry.color }
        ];

        return {
            currentFollowers,
            totalNewFollowers,
            totalViews,
            totalEngagements,
            totalVisits,
            engagementRate,
            totalPosts: postsInRange,
            chartData,
            deltas,
            bestPost: posts[0] || null,
            reactionsBreakdown
        };
    }, [accountMetrics, posts, postsInRange, dailyPostCounts]);

    if (accountsLoading || loading) {
        return (
            <div className="flex items-center justify-center py-20 text-[#1877F2]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!selectedAccountId) {
        return (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl">
                No Facebook account configured. Please contact your administrator.
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading Facebook data: {error}
            </div>
        );
    }

    // Calculate total reactions for center display
    const totalReactions = reactionsBreakdown.reduce((sum, r) => sum + r.value, 0);

    // Determine profile picture - use account's profile_picture or fallback to default logo
    const profilePicture = selectedAccount?.profile_picture || '/logo-icon.png';
    const accountName = selectedAccount?.account_name || 'Facebook Page';
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
                                <p className="text-xs md:text-sm text-slate-500">Facebook Page</p>
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
                                                account.id === selectedAccountId ? 'bg-blue-50' : ''
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
                                            <span className={`text-sm ${account.id === selectedAccountId ? 'font-semibold text-[#1877F2]' : 'text-slate-700'}`}>
                                                {account.account_name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Key Account Stats (static/identity metrics) */}
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
                            <p className="text-[10px] md:text-xs text-slate-500">Total Posts</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards - Single Row of 5 Time-Based Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KPICard
                    icon={Eye}
                    label="Views"
                    value={totalViews.toLocaleString()}
                    delta={deltas.views}
                    iconBg="bg-sky-50"
                    iconColor="text-sky-500"
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
                    icon={MousePointer}
                    label="Visits"
                    value={totalVisits.toLocaleString()}
                    delta={deltas.visits}
                    iconBg="bg-violet-50"
                    iconColor="text-violet-500"
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
                    label="Posts"
                    value={totalPosts.toLocaleString()}
                    subtext="In date range"
                    iconBg="bg-rose-50"
                    iconColor="text-rose-500"
                />
            </div>

            {/* Performance Chart - Matching DAU chart style */}
            <PerformanceChart
                chartData={chartData}
                activeMetric={activeMetric}
                setActiveMetric={setActiveMetric}
                deltas={deltas}
            />

            {/* Bottom Row: Recent Posts & Reactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Posts with Inline Metrics */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="text-sm md:text-base font-semibold text-slate-800 tracking-tight">Recent Posts</h3>
                        <span className="text-[10px] md:text-xs text-slate-400">Last 5 posts</span>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                        {posts.length > 0 ? (
                            posts.map((post) => (
                                <div
                                    key={post.id}
                                    className="flex items-start md:items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    {/* Post Icon */}
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                        <MessageSquare size={14} className="text-blue-400 md:hidden" />
                                        <MessageSquare size={18} className="text-blue-400 hidden md:block" />
                                    </div>

                                    {/* Post Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs md:text-sm text-slate-700 line-clamp-2 md:line-clamp-1">
                                            {post.content_text?.substring(0, 60) || 'No content'}
                                            {post.content_text?.length > 60 && '...'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] md:text-xs text-slate-400">
                                                {post.published_at ? format(new Date(post.published_at), 'MMM d') : 'No date'}
                                            </p>
                                            {/* Mobile Inline Metrics */}
                                            <div className="flex items-center gap-2 md:hidden text-slate-400">
                                                <span className="text-[10px] flex items-center gap-0.5">
                                                    <Eye size={10} /> {(post.reach || 0).toLocaleString()}
                                                </span>
                                                <span className="text-[10px] flex items-center gap-0.5">
                                                    <Heart size={10} /> {getTotalReactions(post.reactions_breakdown)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Inline Metrics: Views, Reactions, Clicks */}
                                    <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Eye size={14} />
                                            <span className="text-xs font-medium">{(post.reach || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <Heart size={14} />
                                            <span className="text-xs font-medium">{getTotalReactions(post.reactions_breakdown).toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <MousePointer size={14} />
                                            <span className="text-xs font-medium">{(post.clicks || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* External Link */}
                                    {post.permalink && (
                                        <a
                                            href={post.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 md:p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors flex-shrink-0"
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
                                <p className="text-xs md:text-sm">No posts found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Reactions Breakdown with Larger Donut */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-sm md:text-base font-semibold text-slate-800 tracking-tight mb-3 md:mb-4">Reactions Breakdown</h3>

                    {/* Larger Donut Chart with Total in Center */}
                    <div className="relative mx-auto w-[160px] h-[160px] md:w-[200px] md:h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={reactionsBreakdown}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="55%"
                                    outerRadius="85%"
                                    paddingAngle={2}
                                >
                                    {reactionsBreakdown.map((entry, index) => (
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
                        {/* Center Total */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-xl md:text-2xl font-bold text-slate-800">{totalReactions}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Reactions</p>
                        </div>
                    </div>

                    {/* Horizontal Legend Below */}
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-3 md:mt-4">
                        {reactionsBreakdown.map((reaction, index) => (
                            <div key={index} className="flex items-center gap-1">
                                <span className="text-sm md:text-base">{reaction.emoji}</span>
                                <span className="text-[10px] md:text-xs text-slate-600 font-medium">{reaction.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Best Performing Post - Trophy Card */}
                    {bestPost && (
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg md:rounded-xl border border-amber-200 p-3 md:p-4 mt-3 md:mt-4">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <Trophy size={14} className="text-amber-500 md:hidden" />
                                <Trophy size={16} className="text-amber-500 hidden md:block" />
                                <span className="text-[10px] md:text-xs font-semibold text-amber-700 uppercase tracking-wide">Top Performer</span>
                            </div>

                            {/* Mini Post Card */}
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
                                    className="flex items-center justify-center gap-1 mt-3 text-xs text-amber-700 hover:text-amber-800"
                                >
                                    View on Facebook <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacebookOverview;
