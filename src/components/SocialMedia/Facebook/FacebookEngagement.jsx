import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    Heart,
    TrendingUp,
    MousePointer,
    ThumbsUp,
    MessageCircle,
    ExternalLink
} from 'lucide-react';

import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
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

// Engagement breakdown colors
const ENGAGEMENT_COLORS = {
    clicks: '#0EA5E9',         // Sky blue
    reactions: '#10B981',      // Emerald
    commentsShares: '#F59E0B'  // Amber (comments + shares combined)
};

// Date when daily delta calculation became reliable (daily syncs started)
const RELIABLE_DATA_START = '2024-12-05';

// Campaign start date - filter empty data before this date
// December 8, 2024 is when meaningful engagement data starts
const CAMPAIGN_START_DATE = '2024-12-08';

// Reaction configuration with emojis and colors
const REACTION_CONFIG = {
    like: { emoji: '👍', color: '#1877F2', label: 'Like' },
    love: { emoji: '❤️', color: '#E74C3C', label: 'Love' },
    haha: { emoji: '😂', color: '#F7B928', label: 'Haha' },
    wow: { emoji: '😮', color: '#F7B928', label: 'Wow' },
    sad: { emoji: '😢', color: '#74B9FF', label: 'Sad' },
    angry: { emoji: '😠', color: '#E9573F', label: 'Angry' }
};

// KPI Card Component - With icons, matching Performance Overview style
const KPICard = ({ icon: Icon, label, value, delta, iconBg, iconColor }) => (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
                    {delta !== null && delta !== undefined && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon size={20} className={iconColor} />
            </div>
        </div>
    </div>
);

// Custom Tooltip for Engagement Over Time Chart
const EngagementTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            <div className="space-y-1.5">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-slate-600">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                            {entry.value?.toLocaleString() || 0}
                        </span>
                    </div>
                ))}
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className="text-xs font-semibold text-slate-700">{total.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

// Custom Tooltip for Reactions Donut
const ReactionsTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{data.emoji}</span>
                <span className="text-slate-900 font-semibold">{data.name}</span>
            </div>
            <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{data.value.toLocaleString()}</span> reactions
            </p>
            <p className="text-xs text-slate-400 mt-1">
                {data.percentage}% of total
            </p>
        </div>
    );
};

const FacebookEngagement = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId;
    const accountsLoading = context?.accountsLoading;
    const accounts = context?.accounts || [];

    // Get the platform_account_id for the selected account (used for daily_metrics_summary)
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const platformAccountId = selectedAccount?.platform_account_id;

    const [dailySummary, setDailySummary] = useState([]);
    const [accountMetrics, setAccountMetrics] = useState([]);
    const [postMetrics, setPostMetrics] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Calculate previous period for delta comparison
                const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                const prevStartDate = subDays(startDate, periodLength);
                const prevEndDate = subDays(startDate, 1);
                const prevStartString = toDateString(prevStartDate);
                const prevEndString = toDateString(prevEndDate);

                // Fetch daily_metrics_summary view - filter by platform_id (account-specific)
                let dailySummaryQuery = supabaseSocialAnalytics
                    .from('daily_metrics_summary')
                    .select('*')
                    .eq('platform_id', platformAccountId)
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });

                // Fetch daily_metrics_summary for previous period - filter by platform_id (account-specific)
                let prevDailySummaryQuery = supabaseSocialAnalytics
                    .from('daily_metrics_summary')
                    .select('*')
                    .eq('platform_id', platformAccountId)
                    .gte('metric_date', prevStartString)
                    .lte('metric_date', prevEndString);

                // Fetch account metrics for current period - filter by account_id
                let accountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });
                if (accountId) accountMetricsQuery = accountMetricsQuery.eq('account_id', accountId);

                // Fetch account metrics for previous period - filter by account_id
                let prevAccountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', prevStartString)
                    .lte('metric_date', prevEndString);
                if (accountId) prevAccountMetricsQuery = prevAccountMetricsQuery.eq('account_id', accountId);

                // Fetch posts with metrics - filter by account_id
                const postsPromise = supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', accountId)
                    .gte('published_at', startDateString)
                    .lte('published_at', endDateString + 'T23:59:59')
                    .order('published_at', { ascending: false });

                const [dailySummaryRes, prevDailySummaryRes, accountRes, prevAccountRes, postsRes] = await Promise.all([
                    dailySummaryQuery,
                    prevDailySummaryQuery,
                    accountMetricsQuery,
                    prevAccountMetricsQuery,
                    postsPromise
                ]);

                if (dailySummaryRes.error) throw dailySummaryRes.error;
                if (prevDailySummaryRes.error) throw prevDailySummaryRes.error;
                if (accountRes.error) throw accountRes.error;
                if (prevAccountRes.error) throw prevAccountRes.error;
                if (postsRes.error) throw postsRes.error;

                // Store daily summary data with previous period
                const summaryData = dailySummaryRes.data || [];
                summaryData._prevPeriod = prevDailySummaryRes.data || [];
                setDailySummary(summaryData);

                // Store account metrics with previous period
                const accountData = accountRes.data || [];
                accountData._prevPeriod = prevAccountRes.data || [];
                setAccountMetrics(accountData);
                setPosts(postsRes.data || []);

                // Fetch post metrics for reactions breakdown (still needed for per-post data)
                if (postsRes.data && postsRes.data.length > 0) {
                    const postIds = postsRes.data.map(p => p.id);

                    const { data: metricsData, error: metricsError } = await supabaseSocialAnalytics
                        .from('post_metrics_daily')
                        .select('*')
                        .in('post_id', postIds);

                    if (metricsError) throw metricsError;
                    setPostMetrics(metricsData || []);
                }

            } catch (err) {
                console.error('Error fetching engagement data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId, accountsLoading, platformAccountId]);

    // Process data for KPIs and charts
    const {
        totalEngagements,
        engagementRate,
        totalClicks,
        totalReactions,
        totalCommentsShares,
        deltas,
        engagementOverTimeData,
        reactionsBreakdown,
        reactionsTotals,
        avgClicksPerPost,
        clickThroughRate,
        topClickedPost
    } = useMemo(() => {
        const emptyState = {
            totalEngagements: 0,
            engagementRate: 0,
            totalClicks: 0,
            totalReactions: 0,
            totalCommentsShares: 0,
            deltas: {},
            engagementOverTimeData: [],
            reactionsBreakdown: [],
            reactionsTotals: {},
            avgClicksPerPost: 0,
            clickThroughRate: 0,
            topClickedPost: null
        };

        if (!dailySummary || dailySummary.length === 0) {
            return emptyState;
        }

        // Current period aggregations from daily_metrics_summary (actual daily deltas)
        const totalClicks = dailySummary.reduce((sum, m) => sum + (m.daily_clicks || 0), 0);
        const totalReactions = dailySummary.reduce((sum, m) => sum + (m.daily_reactions || 0), 0);
        const totalCommentsShares = dailySummary.reduce((sum, m) => sum + (m.daily_comments_shares || 0), 0);

        // Engagements and engagement rate from account_metrics_daily
        const totalEngagements = accountMetrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const totalViews = accountMetrics.reduce((sum, m) => sum + (m.reach || 0), 0);
        const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

        // Previous period calculations for deltas
        const prevSummary = dailySummary._prevPeriod || [];
        const prevClicks = prevSummary.reduce((sum, m) => sum + (m.daily_clicks || 0), 0);
        const prevReactions = prevSummary.reduce((sum, m) => sum + (m.daily_reactions || 0), 0);
        const prevCommentsShares = prevSummary.reduce((sum, m) => sum + (m.daily_comments_shares || 0), 0);

        const prevAccountData = accountMetrics._prevPeriod || [];
        const prevEngagements = prevAccountData.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const prevViews = prevAccountData.reduce((sum, m) => sum + (m.reach || 0), 0);
        const prevEngagementRate = prevViews > 0 ? (prevEngagements / prevViews) * 100 : 0;

        // Calculate deltas
        const calcDelta = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const deltas = {
            engagements: calcDelta(totalEngagements, prevEngagements),
            engagementRate: engagementRate - prevEngagementRate,
            clicks: calcDelta(totalClicks, prevClicks),
            reactions: calcDelta(totalReactions, prevReactions),
            commentsShares: calcDelta(totalCommentsShares, prevCommentsShares)
        };

        // Engagement over time data from daily_metrics_summary (actual daily values!)
        // Filter out dates before campaign started to avoid showing empty bars
        const engagementOverTimeData = dailySummary
            .filter(d => d.metric_date >= CAMPAIGN_START_DATE)
            .map(d => ({
                date: d.metric_date,
                clicks: d.daily_clicks || 0,
                reactions: d.daily_reactions || 0,
                commentsShares: d.daily_comments_shares || 0,
                isReliable: d.is_delta_reliable !== false && d.metric_date >= RELIABLE_DATA_START
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Reactions breakdown for donut chart (still from post_metrics_daily for per-reaction detail)
        const reactionsTotals = { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };

        // Create a map of post_id to latest metrics for reactions breakdown
        const latestMetricsMap = {};
        postMetrics.forEach(m => {
            if (!latestMetricsMap[m.post_id] || m.metric_date > latestMetricsMap[m.post_id].metric_date) {
                latestMetricsMap[m.post_id] = m;
            }
        });

        // Calculate reaction totals from latest metrics per post
        Object.values(latestMetricsMap).forEach(m => {
            if (m.reactions_breakdown) {
                Object.keys(reactionsTotals).forEach(key => {
                    reactionsTotals[key] += parseInt(m.reactions_breakdown[key]) || 0;
                });
            }
        });

        const totalReactionsFromBreakdown = Object.values(reactionsTotals).reduce((sum, val) => sum + val, 0);

        const reactionsBreakdown = Object.entries(reactionsTotals)
            .filter(([_, value]) => value > 0)
            .map(([key, value]) => ({
                key,
                name: REACTION_CONFIG[key].label,
                emoji: REACTION_CONFIG[key].emoji,
                value,
                color: REACTION_CONFIG[key].color,
                percentage: totalReactionsFromBreakdown > 0 ? Math.round((value / totalReactionsFromBreakdown) * 100) : 0
            }))
            .sort((a, b) => b.value - a.value);

        // Click analysis using post metrics for per-post data
        const postsWithMetrics = posts.map(post => ({
            ...post,
            ...(latestMetricsMap[post.id] || {})
        }));

        const avgClicksPerPost = posts.length > 0 ? totalClicks / posts.length : 0;

        const totalReach = postsWithMetrics.reduce((sum, p) => sum + (p.reach || 0), 0);
        const clickThroughRate = totalReach > 0 ? (totalClicks / totalReach) * 100 : 0;

        const topClickedPost = postsWithMetrics.length > 0
            ? postsWithMetrics.reduce((top, post) =>
                (post.clicks || 0) > (top?.clicks || 0) ? post : top
            , postsWithMetrics[0])
            : null;

        return {
            totalEngagements,
            engagementRate,
            totalClicks,
            totalReactions,
            totalCommentsShares,
            deltas,
            engagementOverTimeData,
            reactionsBreakdown,
            reactionsTotals,
            avgClicksPerPost,
            clickThroughRate,
            topClickedPost
        };
    }, [dailySummary, accountMetrics, postMetrics, posts]);

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
                Error loading engagement data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Section 1: KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KPICard
                    icon={Heart}
                    label="Engagements"
                    value={totalEngagements.toLocaleString()}
                    delta={deltas.engagements}
                    iconBg="bg-pink-100"
                    iconColor="text-pink-600"
                />
                <KPICard
                    icon={TrendingUp}
                    label="Engagement Rate"
                    value={`${engagementRate.toFixed(2)}%`}
                    delta={deltas.engagementRate}
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <KPICard
                    icon={MousePointer}
                    label="Clicks"
                    value={totalClicks.toLocaleString()}
                    delta={deltas.clicks}
                    iconBg="bg-sky-100"
                    iconColor="text-sky-600"
                />
                <KPICard
                    icon={ThumbsUp}
                    label="Reactions"
                    value={totalReactions.toLocaleString()}
                    delta={deltas.reactions}
                    iconBg="bg-blue-100"
                    iconColor="text-blue-600"
                />
                <KPICard
                    icon={MessageCircle}
                    label="Comments & Shares"
                    value={totalCommentsShares.toLocaleString()}
                    delta={deltas.commentsShares}
                    iconBg="bg-amber-100"
                    iconColor="text-amber-600"
                />
            </div>

            {/* Section 2: Engagement Over Time */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
                <div className="h-[250px] md:h-[300px] w-full">
                    {engagementOverTimeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={engagementOverTimeData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                />
                                <Tooltip content={<EngagementTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                    formatter={(value) => <span className="text-slate-600">{value}</span>}
                                />
                                <Bar dataKey="clicks" name="Clicks" stackId="a" fill={ENGAGEMENT_COLORS.clicks} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="reactions" name="Reactions" stackId="a" fill={ENGAGEMENT_COLORS.reactions} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="commentsShares" name="Comments & Shares" stackId="a" fill={ENGAGEMENT_COLORS.commentsShares} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No engagement data available for this period
                        </div>
                    )}
                </div>
            </div>

            {/* Section 3 & 4: Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Reactions Breakdown */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Reactions Breakdown</h3>

                    {reactionsBreakdown.length > 0 ? (
                        <div className="flex items-center gap-4">
                            {/* Donut Chart */}
                            <div className="relative" style={{ width: '160px', height: '160px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={reactionsBreakdown}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={2}
                                        >
                                            {reactionsBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ReactionsTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-bold text-slate-800">{totalReactions.toLocaleString()}</span>
                                    <span className="text-xs text-slate-500">Total</span>
                                </div>
                            </div>

                            {/* Legend with emoji icons */}
                            <div className="flex-1 space-y-2">
                                {reactionsBreakdown.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{entry.emoji}</span>
                                            <span className="text-sm text-slate-600">{entry.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-slate-700">{entry.value.toLocaleString()}</span>
                                            <span className="text-xs text-slate-400">({entry.percentage}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <div className="text-center">
                                <ThumbsUp size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No reaction data available</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Click Analysis */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Click Analysis</h3>

                    {/* Click Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Total Clicks</p>
                            <p className="text-lg font-bold text-slate-800">{totalClicks.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Avg per Post</p>
                            <p className="text-lg font-bold text-slate-800">{avgClicksPerPost.toFixed(1)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Click-Through Rate</p>
                            <p className="text-lg font-bold text-sky-600">{clickThroughRate.toFixed(2)}%</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Posts Analyzed</p>
                            <p className="text-lg font-bold text-slate-800">{posts.length}</p>
                        </div>
                    </div>

                    {/* Top Clicked Post */}
                    {topClickedPost && topClickedPost.clicks > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">Top Clicked Post</p>
                            <div className="p-3 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100">
                                <p className="text-sm text-slate-700 line-clamp-2">
                                    {topClickedPost.content_text?.substring(0, 80) || 'No content'}
                                    {topClickedPost.content_text?.length > 80 && '...'}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs font-semibold text-sky-600">
                                        {topClickedPost.clicks?.toLocaleString()} clicks
                                    </span>
                                    {topClickedPost.permalink && (
                                        <a
                                            href={topClickedPost.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            View <ExternalLink size={10} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FacebookEngagement;
