import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format } from 'date-fns';
import { Loader2, Play, Eye, Heart, MessageCircle, Share2, Flame, Clock } from 'lucide-react';

// TikTok colors
const TT_RED = '#FE2C55';
const TT_CYAN = '#25F4EE';

const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Video Card Component
const VideoCard = ({ post, isViral }) => {
    const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    const engagementRate = post.views > 0 ? ((totalEngagement / post.views) * 100).toFixed(1) : 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3">
                {/* Video thumbnail placeholder */}
                <div className="relative w-16 h-24 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Play size={24} className="text-white" />
                    {isViral && (
                        <div className="absolute top-1 right-1">
                            <Flame size={14} className="text-[#FE2C55]" />
                        </div>
                    )}
                    {post.duration && (
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[10px] text-white flex items-center gap-0.5">
                            <Clock size={8} />
                            {post.duration}s
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {isViral && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-[#FE2C55] to-[#25F4EE] text-white text-[10px] font-bold rounded-full">
                                <Flame size={10} />
                                VIRAL
                            </span>
                        )}
                        <span className="text-xs text-slate-500">
                            {post.published_at ? format(parseLocalDate(post.published_at.split('T')[0]), 'MMM d, yyyy') : 'N/A'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                        {post.content_text || 'No caption'}
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-cyan-500">
                                <Eye size={14} />
                                <span className="text-xs font-semibold">
                                    {(post.views || 0) >= 1000 ? `${((post.views || 0) / 1000).toFixed(1)}k` : (post.views || 0)}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500">Views</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-red-500">
                                <Heart size={14} />
                                <span className="text-xs font-semibold">
                                    {(post.likes || 0) >= 1000 ? `${((post.likes || 0) / 1000).toFixed(1)}k` : (post.likes || 0)}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500">Likes</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-slate-500">
                                <MessageCircle size={14} />
                                <span className="text-xs font-semibold">{(post.comments || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Comments</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-500">
                                <Share2 size={14} />
                                <span className="text-xs font-semibold">{(post.shares || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Shares</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TikTokContent = () => {
    const context = useOutletContext();
    const selectedAccountId = context?.selectedAccountId || 'tt-demo-account';

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('views'); // views, likes, recent

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: err } = await supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .order('published_at', { ascending: false });

                if (err) throw err;
                setPosts(data || []);
            } catch (err) {
                console.error('Error fetching TikTok posts:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedAccountId]);

    // Sort posts
    const sortedPosts = useMemo(() => {
        let result = [...posts];

        switch (sortBy) {
            case 'views':
                result.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'likes':
                result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                break;
            case 'recent':
            default:
                result.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        }

        return result;
    }, [posts, sortBy]);

    // Stats
    const stats = useMemo(() => {
        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const viralCount = posts.filter(p => (p.views || 0) > 50000).length;
        const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

        return {
            totalVideos: posts.length,
            totalViews,
            totalLikes,
            viralCount,
            avgViews,
            viralRate: posts.length > 0 ? Math.round((viralCount / posts.length) * 100) : 0
        };
    }, [posts]);

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
                Error loading content: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <div className="bg-black rounded-2xl p-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-2xl font-bold">{stats.totalVideos}</p>
                            <p className="text-xs text-slate-400">Total Videos</p>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                            <p className="text-2xl font-bold text-[#25F4EE]">
                                {stats.totalViews >= 1000000 ? `${(stats.totalViews / 1000000).toFixed(1)}M` : `${(stats.totalViews / 1000).toFixed(0)}K`}
                            </p>
                            <p className="text-xs text-slate-400">Total Views</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[#FE2C55]">{stats.viralCount}</p>
                            <p className="text-xs text-slate-400">Viral Videos</p>
                        </div>
                    </div>
                    <div className="px-3 py-2 bg-white/10 rounded-lg">
                        <p className="text-xs text-slate-300">
                            Viral rate: <span className="font-bold text-[#25F4EE]">{stats.viralRate}%</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Sort Tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'views', label: 'Top Views' },
                    { id: 'likes', label: 'Most Liked' },
                    { id: 'recent', label: 'Recent' }
                ].map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setSortBy(id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                            sortBy === id
                                ? 'bg-black text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Videos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedPosts.map((post) => (
                    <VideoCard
                        key={post.id}
                        post={post}
                        isViral={(post.views || 0) > 50000}
                    />
                ))}
            </div>

            {sortedPosts.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <Play size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No videos found</p>
                </div>
            )}
        </div>
    );
};

export default TikTokContent;
