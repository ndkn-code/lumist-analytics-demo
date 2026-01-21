import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { subDays, format } from 'date-fns';
import { Loader2, Users, Eye, Heart, TrendingUp, Play, Image } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Instagram gradient colors
const IG_PINK = '#E4405F';
const IG_PURPLE = '#833AB4';
const IG_ORANGE = '#FCAF45';

const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// KPI Card Component
const KPICard = ({ icon: Icon, label, value, subtext, delta, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1">{label}</p>
                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <p className="text-lg md:text-2xl font-bold text-slate-800">{value}</p>
                    {delta !== null && delta !== undefined && (
                        <span className={`text-[10px] md:text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                    )}
                </div>
                {subtext && <p className="text-[10px] md:text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl ${iconBg} flex-shrink-0`}>
                <Icon size={20} className={iconColor} />
            </div>
        </div>
    </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
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

const InstagramOverview = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId || 'ig-demo-account';

    const [metrics, setMetrics] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                const [metricsRes, postsRes] = await Promise.all([
                    supabaseSocialAnalytics
                        .from('account_metrics_daily')
                        .select('*')
                        .eq('account_id', selectedAccountId)
                        .gte('metric_date', startDateString)
                        .lte('metric_date', endDateString)
                        .order('metric_date', { ascending: true }),
                    supabaseSocialAnalytics
                        .from('posts')
                        .select('*')
                        .eq('account_id', selectedAccountId)
                        .order('published_at', { ascending: false })
                        .limit(10)
                ]);

                if (metricsRes.error) throw metricsRes.error;
                if (postsRes.error) throw postsRes.error;

                setMetrics(metricsRes.data || []);
                setPosts(postsRes.data || []);
            } catch (err) {
                console.error('Error fetching Instagram data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId]);

    const { currentFollowers, totalReach, totalEngagement, avgEngagementRate, followerGrowth, chartData } = useMemo(() => {
        if (!metrics || metrics.length === 0) {
            return {
                currentFollowers: 0, totalReach: 0, totalEngagement: 0,
                avgEngagementRate: 0, followerGrowth: 0, chartData: []
            };
        }

        const latest = metrics[metrics.length - 1];
        const first = metrics[0];
        const currentFollowers = latest?.followers_count || 0;
        const followerGrowth = first?.followers_count > 0
            ? ((currentFollowers - first.followers_count) / first.followers_count) * 100
            : 0;

        const totalReach = metrics.reduce((sum, m) => sum + (m.reach || 0), 0);
        const totalEngagement = metrics.reduce((sum, m) => sum + (m.engagements || 0), 0);
        const avgEngagementRate = metrics.length > 0
            ? metrics.reduce((sum, m) => sum + parseFloat(m.engagement_rate || 0), 0) / metrics.length
            : 0;

        const chartData = metrics.map(m => ({
            date: m.metric_date,
            followers: m.followers_count,
            reach: m.reach,
            engagement: m.engagements
        }));

        return { currentFollowers, totalReach, totalEngagement, avgEngagementRate, followerGrowth, chartData };
    }, [metrics]);

    // Count reels vs posts
    const { reelsCount, postsCount } = useMemo(() => {
        const reels = posts.filter(p => p.post_type === 'reel' || p.media_type === 'reel').length;
        return { reelsCount: reels, postsCount: posts.length - reels };
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
                Error loading Instagram data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Profile Context Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45] flex items-center justify-center shadow-sm flex-shrink-0">
                            <img src="/logo-icon.png" alt="Lumist" className="w-8 h-8 md:w-10 md:h-10 object-contain rounded-lg" />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-semibold text-slate-800">@lumist.sat</h2>
                            <p className="text-xs md:text-sm text-slate-500">Instagram Business</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{currentFollowers.toLocaleString()}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Followers</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{posts.length}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Posts</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-center flex-1 md:flex-none">
                            <p className="text-lg md:text-2xl font-bold text-pink-600">{avgEngagementRate.toFixed(1)}%</p>
                            <p className="text-[10px] md:text-xs text-slate-500">Eng. Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    icon={Users}
                    label="Total Followers"
                    value={currentFollowers.toLocaleString()}
                    delta={followerGrowth}
                    iconBg="bg-gradient-to-br from-pink-50 to-purple-50"
                    iconColor="text-pink-500"
                />
                <KPICard
                    icon={Eye}
                    label="Total Reach"
                    value={totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}K` : totalReach.toLocaleString()}
                    subtext="In date range"
                    iconBg="bg-purple-50"
                    iconColor="text-purple-500"
                />
                <KPICard
                    icon={Heart}
                    label="Total Engagement"
                    value={totalEngagement >= 1000 ? `${(totalEngagement / 1000).toFixed(1)}K` : totalEngagement.toLocaleString()}
                    subtext="Likes, comments, saves"
                    iconBg="bg-rose-50"
                    iconColor="text-rose-500"
                />
                <KPICard
                    icon={Play}
                    label="Reels Performance"
                    value="3x"
                    subtext="Better than posts"
                    iconBg="bg-orange-50"
                    iconColor="text-orange-500"
                />
            </div>

            {/* Follower Growth Chart */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">Follower Growth</h3>
                    <p className="text-xs text-slate-500 mt-1">Daily followers over time</p>
                </div>
                <div className="h-[250px] md:h-[300px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="igGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={IG_PINK} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={IG_PINK} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(parseLocalDate(str), 'MMM d')}
                                    stroke="#6B7280"
                                    tick={{ fontSize: 11, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    tick={{ fontSize: 11, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="followers"
                                    name="Followers"
                                    stroke={IG_PINK}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#igGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No data available for this period
                        </div>
                    )}
                </div>
            </div>

            {/* Content Mix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4">Content Mix</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Play size={18} className="text-pink-500" />
                                <span className="text-sm text-slate-700">Reels</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{reelsCount} ({posts.length > 0 ? Math.round((reelsCount / posts.length) * 100) : 0}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Image size={18} className="text-purple-500" />
                                <span className="text-sm text-slate-700">Posts & Carousels</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{postsCount} ({posts.length > 0 ? Math.round((postsCount / posts.length) * 100) : 0}%)</span>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                        <p className="text-xs text-slate-600">
                            <span className="font-semibold text-pink-600">Tip:</span> Reels perform 3x better on average. Consider increasing reel content.
                        </p>
                    </div>
                </div>

                {/* Top Performing Content */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4">Top Posts</h3>
                    <div className="space-y-3">
                        {posts.slice(0, 3).map((post, i) => (
                            <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 truncate">{post.content_text?.slice(0, 40)}...</p>
                                    <p className="text-xs text-slate-500">{post.media_type || 'post'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-pink-600">{(post.reach || 0).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">reach</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstagramOverview;
