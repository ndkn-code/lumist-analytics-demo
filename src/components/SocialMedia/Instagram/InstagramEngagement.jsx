import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    Heart,
    TrendingUp,
    Eye,
    ThumbsUp,
    MessageCircle,
    Bookmark,
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

// Instagram gradient
const IG_PINK = '#E4405F';

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Engagement breakdown colors
const ENGAGEMENT_COLORS = {
    likes: '#E4405F',         // Instagram pink
    comments: '#833AB4',      // Purple
    saves: '#FCAF45',         // Orange/Gold
    shares: '#0EA5E9'         // Sky blue
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

// Custom Tooltip for Engagement Mix Donut
const EngagementMixTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="text-slate-900 font-semibold">{data.name}</span>
            </div>
            <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{data.value.toLocaleString()}</span> interactions
            </p>
            <p className="text-xs text-slate-400 mt-1">
                {data.percentage}% of total
            </p>
        </div>
    );
};

const InstagramEngagement = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId || 'ig-demo-account';

    const [posts, setPosts] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch posts
                const { data: postsData, error: postsErr } = await supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .order('published_at', { ascending: false });

                if (postsErr) throw postsErr;

                // Fetch daily metrics
                const { data: metricsData, error: metricsErr } = await supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .order('metric_date', { ascending: true });

                if (metricsErr) throw metricsErr;

                setPosts(postsData || []);
                setMetrics(metricsData || []);
            } catch (err) {
                console.error('Error fetching engagement data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedAccountId]);

    // Process data for KPIs and charts
    const {
        totalEngagements,
        engagementRate,
        totalLikes,
        totalComments,
        totalSaves,
        totalShares,
        avgReach,
        engagementOverTimeData,
        engagementMixData,
        topEngagedPost
    } = useMemo(() => {
        const emptyState = {
            totalEngagements: 0,
            engagementRate: 0,
            totalLikes: 0,
            totalComments: 0,
            totalSaves: 0,
            totalShares: 0,
            avgReach: 0,
            engagementOverTimeData: [],
            engagementMixData: [],
            topEngagedPost: null
        };

        if (!posts || posts.length === 0) {
            return emptyState;
        }

        // Aggregate from posts
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
        const totalSaves = posts.reduce((sum, p) => sum + (p.saves || 0), 0);
        const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);
        const totalEngagements = totalLikes + totalComments + totalSaves + totalShares;

        const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);
        const avgReach = posts.length > 0 ? totalReach / posts.length : 0;
        const engagementRate = totalReach > 0 ? (totalEngagements / totalReach) * 100 : 0;

        // Group posts by date for engagement over time
        const dateMap = {};
        posts.forEach(post => {
            const date = post.published_at?.split('T')[0];
            if (!date) return;
            if (!dateMap[date]) {
                dateMap[date] = { likes: 0, comments: 0, saves: 0, shares: 0 };
            }
            dateMap[date].likes += post.likes || 0;
            dateMap[date].comments += post.comments || 0;
            dateMap[date].saves += post.saves || 0;
            dateMap[date].shares += post.shares || 0;
        });

        const engagementOverTimeData = Object.entries(dateMap)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Engagement mix donut
        const engagementMixData = [
            { name: 'Likes', value: totalLikes, color: ENGAGEMENT_COLORS.likes },
            { name: 'Comments', value: totalComments, color: ENGAGEMENT_COLORS.comments },
            { name: 'Saves', value: totalSaves, color: ENGAGEMENT_COLORS.saves },
            { name: 'Shares', value: totalShares, color: ENGAGEMENT_COLORS.shares }
        ].filter(d => d.value > 0)
         .map(d => ({
             ...d,
             percentage: totalEngagements > 0 ? Math.round((d.value / totalEngagements) * 100) : 0
         }));

        // Top engaged post
        const topEngagedPost = posts.reduce((top, post) => {
            const engagement = (post.likes || 0) + (post.comments || 0) + (post.saves || 0) + (post.shares || 0);
            const topEngagement = (top?.likes || 0) + (top?.comments || 0) + (top?.saves || 0) + (top?.shares || 0);
            return engagement > topEngagement ? post : top;
        }, posts[0]);

        return {
            totalEngagements,
            engagementRate,
            totalLikes,
            totalComments,
            totalSaves,
            totalShares,
            avgReach,
            engagementOverTimeData,
            engagementMixData,
            topEngagedPost
        };
    }, [posts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
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
                    label="Total Engagements"
                    value={totalEngagements.toLocaleString()}
                    delta={null}
                    iconBg="bg-pink-100"
                    iconColor="text-pink-600"
                />
                <KPICard
                    icon={TrendingUp}
                    label="Engagement Rate"
                    value={`${engagementRate.toFixed(2)}%`}
                    delta={null}
                    iconBg="bg-emerald-100"
                    iconColor="text-emerald-600"
                />
                <KPICard
                    icon={ThumbsUp}
                    label="Likes"
                    value={totalLikes.toLocaleString()}
                    delta={null}
                    iconBg="bg-rose-100"
                    iconColor="text-rose-600"
                />
                <KPICard
                    icon={MessageCircle}
                    label="Comments"
                    value={totalComments.toLocaleString()}
                    delta={null}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                />
                <KPICard
                    icon={Bookmark}
                    label="Saves"
                    value={totalSaves.toLocaleString()}
                    delta={null}
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
                                <Bar dataKey="likes" name="Likes" stackId="a" fill={ENGAGEMENT_COLORS.likes} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="comments" name="Comments" stackId="a" fill={ENGAGEMENT_COLORS.comments} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="saves" name="Saves" stackId="a" fill={ENGAGEMENT_COLORS.saves} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="shares" name="Shares" stackId="a" fill={ENGAGEMENT_COLORS.shares} radius={[4, 4, 0, 0]} />
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
                {/* Engagement Mix */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Engagement Mix</h3>

                    {engagementMixData.length > 0 ? (
                        <div className="flex items-center gap-4">
                            {/* Donut Chart */}
                            <div className="relative" style={{ width: '160px', height: '160px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={engagementMixData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={2}
                                        >
                                            {engagementMixData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<EngagementMixTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-lg font-bold text-slate-800">{totalEngagements.toLocaleString()}</span>
                                    <span className="text-xs text-slate-500">Total</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 space-y-2">
                                {engagementMixData.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
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
                                <Heart size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No engagement data available</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance Stats */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Performance Stats</h3>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Total Posts</p>
                            <p className="text-lg font-bold text-slate-800">{posts.length}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Avg Reach</p>
                            <p className="text-lg font-bold text-slate-800">{avgReach.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Avg Engagement</p>
                            <p className="text-lg font-bold text-pink-600">{posts.length > 0 ? Math.round(totalEngagements / posts.length).toLocaleString() : 0}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-xs text-slate-500 mb-1">Save Rate</p>
                            <p className="text-lg font-bold text-amber-600">{totalEngagements > 0 ? ((totalSaves / totalEngagements) * 100).toFixed(1) : 0}%</p>
                        </div>
                    </div>

                    {/* Top Engaged Post */}
                    {topEngagedPost && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-500 mb-2">Top Performing Post</p>
                            <div className="p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${topEngagedPost.post_type === 'reel' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {topEngagedPost.post_type === 'reel' ? 'Reel' : 'Post'}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 line-clamp-2">
                                    {topEngagedPost.content_text?.substring(0, 80) || 'No caption'}
                                    {topEngagedPost.content_text?.length > 80 && '...'}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Heart size={12} className="text-pink-500" />
                                        {(topEngagedPost.likes || 0).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageCircle size={12} className="text-purple-500" />
                                        {(topEngagedPost.comments || 0).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Bookmark size={12} className="text-amber-500" />
                                        {(topEngagedPost.saves || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstagramEngagement;
