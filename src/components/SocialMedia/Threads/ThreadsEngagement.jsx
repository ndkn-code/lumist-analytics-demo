import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    Heart,
    TrendingUp,
    Repeat2,
    Quote,
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

// Threads brand color
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

// Threads engagement breakdown colors
const ENGAGEMENT_COLORS = {
    likes: '#EF4444',        // Red for likes/hearts
    reposts: '#10B981',      // Emerald
    quotes: '#3B82F6',       // Blue
    replies: '#F59E0B'       // Amber
};

// Engagement configuration
const ENGAGEMENT_CONFIG = {
    likes: { label: 'Likes', icon: Heart, color: '#EF4444' },
    reposts: { label: 'Reposts', icon: Repeat2, color: '#10B981' },
    quotes: { label: 'Quotes', icon: Quote, color: '#3B82F6' },
    replies: { label: 'Replies', icon: MessageCircle, color: '#F59E0B' }
};

// KPI Card Component
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

// Custom Tooltip for Engagement Donut
const EngagementBreakdownTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="text-slate-900 font-semibold">{data.name}</span>
            </div>
            <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{data.value.toLocaleString()}</span> engagements
            </p>
            <p className="text-xs text-slate-400 mt-1">
                {data.percentage}% of total
            </p>
        </div>
    );
};

const ThreadsEngagement = () => {
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

                // Fetch account metrics - filter by account_id (not platform)
                let accountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });
                if (accountId) accountMetricsQuery = accountMetricsQuery.eq('account_id', accountId);

                let prevAccountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .gte('metric_date', prevStartString)
                    .lte('metric_date', prevEndString);
                if (accountId) prevAccountMetricsQuery = prevAccountMetricsQuery.eq('account_id', accountId);

                // Fetch posts - filter by account_id
                const postsPromise = supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', accountId)
                    .gte('published_at', startDateString)
                    .lte('published_at', endDateString + 'T23:59:59')
                    .order('published_at', { ascending: false });

                const [dailySummaryRes, prevDailySummaryRes, accountRes, prevAccountRes, postsRes] = await Promise.all([
                    dailySummaryPromise,
                    prevDailySummaryPromise,
                    accountMetricsQuery,
                    prevAccountMetricsQuery,
                    postsPromise
                ]);

                if (dailySummaryRes.error) throw dailySummaryRes.error;
                if (prevDailySummaryRes.error) throw prevDailySummaryRes.error;
                if (accountRes.error) throw accountRes.error;
                if (prevAccountRes.error) throw prevAccountRes.error;
                if (postsRes.error) throw postsRes.error;

                const summaryData = dailySummaryRes.data || [];
                summaryData._prevPeriod = prevDailySummaryRes.data || [];
                setDailySummary(summaryData);

                const accountData = accountRes.data || [];
                accountData._prevPeriod = prevAccountRes.data || [];
                setAccountMetrics(accountData);
                setPosts(postsRes.data || []);

            } catch (err) {
                console.error('Error fetching engagement data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId, accountsLoading, platformAccountId]);

    // Process data
    const {
        totalEngagements,
        engagementRate,
        totalLikes,
        totalReposts,
        totalQuotes,
        totalReplies,
        deltas,
        engagementOverTimeData,
        engagementBreakdown,
        avgEngagementsPerPost,
        topEngagedPost
    } = useMemo(() => {
        const emptyState = {
            totalEngagements: 0,
            engagementRate: 0,
            totalLikes: 0,
            totalReposts: 0,
            totalQuotes: 0,
            totalReplies: 0,
            deltas: {},
            engagementOverTimeData: [],
            engagementBreakdown: [],
            avgEngagementsPerPost: 0,
            topEngagedPost: null
        };

        // Return empty state only if dailySummary is empty
        if (!dailySummary || dailySummary.length === 0) {
            return emptyState;
        }

        // Current period aggregations from account metrics (if available)
        const totalEngagements = (accountMetrics || []).reduce((sum, m) => sum + (m.engagements || 0), 0);
        const totalViews = (accountMetrics || []).reduce((sum, m) => sum + (m.reach || 0), 0);
        const engagementRate = totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;

        // Aggregate engagement types from daily_metrics_summary (sum of daily deltas)
        const totalLikes = dailySummary.reduce((sum, m) => sum + (m.daily_likes || 0), 0);
        const totalReposts = dailySummary.reduce((sum, m) => sum + (m.daily_reposts || 0), 0);
        const totalQuotes = dailySummary.reduce((sum, m) => sum + (m.daily_quotes || 0), 0);
        const totalReplies = dailySummary.reduce((sum, m) => sum + (m.daily_replies || 0), 0);

        // Previous period calculations
        const prevAccountData = (accountMetrics && accountMetrics._prevPeriod) || [];
        const prevEngagements = prevAccountData.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const prevViews = prevAccountData.reduce((sum, m) => sum + (m.reach || 0), 0);
        const prevEngagementRate = prevViews > 0 ? (prevEngagements / prevViews) * 100 : 0;

        // Previous period engagement types from daily_metrics_summary
        const prevDailySummary = dailySummary._prevPeriod || [];
        const prevLikes = prevDailySummary.reduce((sum, m) => sum + (m.daily_likes || 0), 0);
        const prevReposts = prevDailySummary.reduce((sum, m) => sum + (m.daily_reposts || 0), 0);
        const prevQuotes = prevDailySummary.reduce((sum, m) => sum + (m.daily_quotes || 0), 0);
        const prevReplies = prevDailySummary.reduce((sum, m) => sum + (m.daily_replies || 0), 0);

        const calcDelta = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const deltas = {
            engagements: calcDelta(totalEngagements, prevEngagements),
            engagementRate: engagementRate - prevEngagementRate,
            likes: calcDelta(totalLikes, prevLikes),
            reposts: calcDelta(totalReposts, prevReposts),
            quotes: calcDelta(totalQuotes, prevQuotes),
            replies: calcDelta(totalReplies, prevReplies)
        };

        // Engagement over time data from daily_metrics_summary
        const engagementOverTimeData = dailySummary
            .filter(m => m.daily_likes !== null || m.daily_reposts !== null || m.daily_quotes !== null || m.daily_replies !== null)
            .map(m => ({
                date: m.metric_date,
                likes: m.daily_likes || 0,
                reposts: m.daily_reposts || 0,
                quotes: m.daily_quotes || 0,
                replies: m.daily_replies || 0
            }));

        // Engagement breakdown for donut chart
        const totalBreakdown = totalLikes + totalReposts + totalQuotes + totalReplies;
        const engagementBreakdown = [
            {
                key: 'likes',
                name: 'Likes',
                value: totalLikes,
                color: ENGAGEMENT_COLORS.likes,
                percentage: totalBreakdown > 0 ? Math.round((totalLikes / totalBreakdown) * 100) : 0
            },
            {
                key: 'reposts',
                name: 'Reposts',
                value: totalReposts,
                color: ENGAGEMENT_COLORS.reposts,
                percentage: totalBreakdown > 0 ? Math.round((totalReposts / totalBreakdown) * 100) : 0
            },
            {
                key: 'quotes',
                name: 'Quotes',
                value: totalQuotes,
                color: ENGAGEMENT_COLORS.quotes,
                percentage: totalBreakdown > 0 ? Math.round((totalQuotes / totalBreakdown) * 100) : 0
            },
            {
                key: 'replies',
                name: 'Replies',
                value: totalReplies,
                color: ENGAGEMENT_COLORS.replies,
                percentage: totalBreakdown > 0 ? Math.round((totalReplies / totalBreakdown) * 100) : 0
            }
        ].filter(e => e.value > 0);

        const avgEngagementsPerPost = posts.length > 0 ? totalEngagements / posts.length : 0;

        const topEngagedPost = posts.length > 0
            ? posts.reduce((top, post) => {
                const postEngagements = (post.likes || 0) + (post.reposts || 0) + (post.quotes || 0) + (post.replies || 0);
                const topEngagements = (top.likes || 0) + (top.reposts || 0) + (top.quotes || 0) + (top.replies || 0);
                return postEngagements > topEngagements ? post : top;
            }, posts[0])
            : null;

        return {
            totalEngagements,
            engagementRate,
            totalLikes,
            totalReposts,
            totalQuotes,
            totalReplies,
            deltas,
            engagementOverTimeData,
            engagementBreakdown,
            avgEngagementsPerPost,
            topEngagedPost
        };
    }, [dailySummary, accountMetrics, posts]);

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
                Error loading engagement data: {error}
            </div>
        );
    }

    const totalBreakdown = engagementBreakdown.reduce((sum, e) => sum + e.value, 0);

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
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
                    icon={Heart}
                    label="Likes"
                    value={totalLikes.toLocaleString()}
                    delta={deltas.likes}
                    iconBg="bg-red-100"
                    iconColor="text-red-600"
                />
                <KPICard
                    icon={Repeat2}
                    label="Reposts"
                    value={totalReposts.toLocaleString()}
                    delta={deltas.reposts}
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <KPICard
                    icon={MessageCircle}
                    label="Replies"
                    value={totalReplies.toLocaleString()}
                    delta={deltas.replies}
                    iconBg="bg-amber-100"
                    iconColor="text-amber-600"
                />
            </div>

            {/* Engagement Over Time */}
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
                                <Bar dataKey="likes" name="Likes" stackId="a" fill={ENGAGEMENT_COLORS.likes} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="reposts" name="Reposts" stackId="a" fill={ENGAGEMENT_COLORS.reposts} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="quotes" name="Quotes" stackId="a" fill={ENGAGEMENT_COLORS.quotes} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="replies" name="Replies" stackId="a" fill={ENGAGEMENT_COLORS.replies} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No engagement data available for this period
                        </div>
                    )}
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Engagement Breakdown */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h3>

                    {engagementBreakdown.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <div className="relative" style={{ width: '160px', height: '160px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={engagementBreakdown}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={2}
                                        >
                                            {engagementBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<EngagementBreakdownTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-bold text-slate-800">{totalBreakdown.toLocaleString()}</span>
                                    <span className="text-xs text-slate-500">Total</span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2">
                                {engagementBreakdown.map((entry, index) => {
                                    const Icon = ENGAGEMENT_CONFIG[entry.key]?.icon || Heart;
                                    return (
                                        <div key={index} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon size={16} style={{ color: entry.color }} />
                                                <span className="text-sm text-slate-600">{entry.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-700">{entry.value.toLocaleString()}</span>
                                                <span className="text-xs text-slate-400">({entry.percentage}%)</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-slate-400">
                            <div className="text-center">
                                <Heart size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No engagement data available</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Engagement Stats */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Engagement Stats</h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Total Engagements</p>
                            <p className="text-lg font-bold text-slate-800">{totalEngagements.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Avg per Thread</p>
                            <p className="text-lg font-bold text-slate-800">{avgEngagementsPerPost.toFixed(1)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Engagement Rate</p>
                            <p className="text-lg font-bold text-emerald-600">{engagementRate.toFixed(2)}%</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Threads Analyzed</p>
                            <p className="text-lg font-bold text-slate-800">{posts.length}</p>
                        </div>
                    </div>

                    {/* Top Engaged Thread */}
                    {topEngagedPost && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">Top Engaged Thread</p>
                            <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 border border-slate-100">
                                <p className="text-sm text-slate-700 line-clamp-2">
                                    {topEngagedPost.content_text?.substring(0, 80) || 'No content'}
                                    {topEngagedPost.content_text?.length > 80 && '...'}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs font-semibold text-slate-600">
                                        {((topEngagedPost.likes || 0) + (topEngagedPost.reposts || 0) + (topEngagedPost.quotes || 0) + (topEngagedPost.replies || 0)).toLocaleString()} engagements
                                    </span>
                                    {topEngagedPost.permalink && (
                                        <a
                                            href={topEngagedPost.permalink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-slate-600 hover:underline flex items-center gap-1"
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

export default ThreadsEngagement;
