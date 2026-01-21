import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays, parseISO } from 'date-fns';
import {
    Loader2,
    Users,
    Eye,
    Heart,
    TrendingUp,
    Play,
    Flame,
    Zap
} from 'lucide-react';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// TikTok brand colors
const TT_RED = '#FE2C55';
const TT_CYAN = '#25F4EE';
const TT_BLACK = '#000000';

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// KPI Card Component
const KPICard = ({ icon: Icon, label, value, change, iconBg, iconColor, subtext }) => (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xl md:text-2xl font-bold text-slate-900">{value}</p>
                    {change !== null && change !== undefined && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${change >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                            {change >= 0 ? '+' : ''}{change}%
                        </span>
                    )}
                </div>
                {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon size={20} className={iconColor} />
            </div>
        </div>
    </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-slate-600">{entry.name}:</span>
                    <span className="text-sm font-semibold text-slate-800">
                        {entry.value?.toLocaleString() || 0}
                    </span>
                </div>
            ))}
        </div>
    );
};

// Viral indicator component
const ViralBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-[#FE2C55] to-[#25F4EE] text-white text-[10px] font-bold rounded-full">
        <Flame size={10} />
        VIRAL
    </span>
);

const TikTokOverview = () => {
    const context = useOutletContext();
    const selectedAccountId = context?.selectedAccountId || 'tt-demo-account';

    const [metrics, setMetrics] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch account metrics
                const { data: metricsData, error: metricsErr } = await supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .order('metric_date', { ascending: true });

                if (metricsErr) throw metricsErr;

                // Fetch posts
                const { data: postsData, error: postsErr } = await supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .order('published_at', { ascending: false });

                if (postsErr) throw postsErr;

                setMetrics(metricsData || []);
                setPosts(postsData || []);
            } catch (err) {
                console.error('Error fetching TikTok data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedAccountId]);

    // Process data
    const {
        currentFollowers,
        followerGrowth,
        totalViews,
        totalLikes,
        totalVideos,
        avgViewsPerVideo,
        growthChart,
        contentMixData,
        viralPosts
    } = useMemo(() => {
        const emptyState = {
            currentFollowers: 0,
            followerGrowth: 0,
            totalViews: 0,
            totalLikes: 0,
            totalVideos: 0,
            avgViewsPerVideo: 0,
            growthChart: [],
            contentMixData: [],
            viralPosts: []
        };

        if (!metrics || metrics.length === 0) {
            return emptyState;
        }

        // Latest metrics
        const latestMetrics = metrics[metrics.length - 1];
        const firstMetrics = metrics[0];
        const currentFollowers = latestMetrics?.followers_count || latestMetrics?.followers || 0;
        const startFollowers = firstMetrics?.followers_count || firstMetrics?.followers || 0;
        const followerGrowth = startFollowers > 0 ? Math.round(((currentFollowers - startFollowers) / startFollowers) * 100) : 0;

        // Posts stats
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalVideos = posts.length;
        const avgViewsPerVideo = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;

        // Growth chart
        const growthChart = metrics.map(m => ({
            date: m.metric_date,
            followers: m.followers_count || m.followers || 0,
            views: m.reach || m.video_views || 0
        }));

        // Content type breakdown
        const videoTypes = {};
        posts.forEach(p => {
            const type = p.post_type || 'video';
            videoTypes[type] = (videoTypes[type] || 0) + 1;
        });

        const contentMixData = Object.entries(videoTypes).map(([type, count], i) => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
            color: i === 0 ? TT_RED : i === 1 ? TT_CYAN : '#94A3B8'
        }));

        // Viral posts (views > 50K)
        const viralPosts = posts.filter(p => (p.views || 0) > 50000).slice(0, 3);

        return {
            currentFollowers,
            followerGrowth,
            totalViews,
            totalLikes,
            totalVideos,
            avgViewsPerVideo,
            growthChart,
            contentMixData,
            viralPosts
        };
    }, [metrics, posts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-black" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading TikTok data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Platform Header */}
            <div className="bg-black rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                            <Play size={24} className="text-black ml-1" />
                        </div>
                        <div className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-[#FE2C55]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Lumist TikTok</h2>
                        <p className="text-sm text-slate-400">Fastest growing platform</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Zap size={16} className="text-[#25F4EE]" />
                        <span className="text-sm font-semibold text-[#25F4EE]">+{followerGrowth}% growth</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    icon={Users}
                    label="Followers"
                    value={currentFollowers.toLocaleString()}
                    change={followerGrowth}
                    iconBg="bg-slate-100"
                    iconColor="text-slate-700"
                    subtext="24x growth since start"
                />
                <KPICard
                    icon={Eye}
                    label="Total Views"
                    value={totalViews >= 1000000 ? `${(totalViews / 1000000).toFixed(1)}M` : totalViews.toLocaleString()}
                    change={null}
                    iconBg="bg-cyan-100"
                    iconColor="text-cyan-600"
                />
                <KPICard
                    icon={Heart}
                    label="Total Likes"
                    value={totalLikes.toLocaleString()}
                    change={null}
                    iconBg="bg-red-100"
                    iconColor="text-red-500"
                />
                <KPICard
                    icon={Play}
                    label="Avg Views/Video"
                    value={avgViewsPerVideo.toLocaleString()}
                    change={null}
                    iconBg="bg-purple-100"
                    iconColor="text-purple-600"
                />
            </div>

            {/* Follower Growth Chart */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900">Follower Growth</h3>
                        <p className="text-xs text-slate-500">From 500 to 12,000 followers</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                        <TrendingUp size={14} className="text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-600">+{followerGrowth}%</span>
                    </div>
                </div>
                <div className="h-[250px] md:h-[300px] w-full">
                    {growthChart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthChart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="ttGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={TT_RED} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={TT_RED} stopOpacity={0} />
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
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="followers"
                                    name="Followers"
                                    stroke={TT_RED}
                                    strokeWidth={2}
                                    fill="url(#ttGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            {/* Two Column: Viral Videos & Content Mix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Viral Videos */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                        <Flame size={20} className="text-[#FE2C55]" />
                        <h3 className="text-base md:text-lg font-semibold text-slate-900">Viral Videos</h3>
                    </div>

                    {viralPosts.length > 0 ? (
                        <div className="space-y-3">
                            {viralPosts.map((post, index) => (
                                <div key={post.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                                            <ViralBadge />
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {post.published_at ? format(parseLocalDate(post.published_at.split('T')[0]), 'MMM d') : ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 line-clamp-2 mb-2">
                                        {post.content_text || 'No caption'}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className="flex items-center gap-1 text-cyan-600 font-semibold">
                                            <Eye size={12} />
                                            {(post.views || 0).toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1 text-red-500">
                                            <Heart size={12} />
                                            {(post.likes || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <Flame size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No viral videos yet</p>
                        </div>
                    )}
                </div>

                {/* Content Mix */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-4">Content Performance</h3>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-slate-50">
                            <p className="text-xs text-slate-500 mb-1">Total Videos</p>
                            <p className="text-xl font-bold text-slate-800">{totalVideos}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50">
                            <p className="text-xs text-slate-500 mb-1">Viral Rate</p>
                            <p className="text-xl font-bold text-[#FE2C55]">
                                {totalVideos > 0 ? Math.round((viralPosts.length / totalVideos) * 100) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-[#25F4EE]" />
                            <span className="text-sm font-semibold">Growth Insight</span>
                        </div>
                        <p className="text-xs text-slate-300">
                            TikTok is your fastest-growing platform with <span className="text-[#25F4EE] font-semibold">24x follower growth</span>.
                            Educational SAT content performs exceptionally well, with "SAT Math Hack" videos driving the most engagement.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TikTokOverview;
