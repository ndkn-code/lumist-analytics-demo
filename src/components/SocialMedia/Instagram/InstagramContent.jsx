import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { subDays, format } from 'date-fns';
import { Loader2, Play, Image, Eye, Heart, MessageCircle, Bookmark, ExternalLink } from 'lucide-react';

const IG_PINK = '#E4405F';

const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Post Card Component
const PostCard = ({ post }) => {
    const isReel = post.post_type === 'reel' || post.media_type === 'reel';
    const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.saves || 0) + (post.shares || 0);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3">
                {/* Type Badge */}
                <div className={`p-2 rounded-lg ${isReel ? 'bg-pink-100' : 'bg-purple-100'}`}>
                    {isReel ? (
                        <Play size={20} className="text-pink-600" />
                    ) : (
                        <Image size={20} className="text-purple-600" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isReel ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'}`}>
                            {isReel ? 'Reel' : post.media_type || 'Post'}
                        </span>
                        <span className="text-xs text-slate-500">
                            {post.published_at ? format(parseLocalDate(post.published_at.split('T')[0]), 'MMM d, yyyy') : 'N/A'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 mb-3">
                        {post.content_text || 'No caption'}
                    </p>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-pink-500">
                                <Eye size={14} />
                                <span className="text-xs font-semibold">{(post.reach || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Reach</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-rose-500">
                                <Heart size={14} />
                                <span className="text-xs font-semibold">{(post.likes || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Likes</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-purple-500">
                                <MessageCircle size={14} />
                                <span className="text-xs font-semibold">{(post.comments || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Comments</p>
                        </div>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-orange-500">
                                <Bookmark size={14} />
                                <span className="text-xs font-semibold">{(post.saves || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500">Saves</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InstagramContent = () => {
    const context = useOutletContext();
    const selectedAccountId = context?.selectedAccountId || 'ig-demo-account';

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');  // all, reel, image, carousel

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
                console.error('Error fetching Instagram posts:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedAccountId]);

    // Filter and sort posts
    const filteredPosts = useMemo(() => {
        let result = [...posts];

        if (filter !== 'all') {
            result = result.filter(p => (p.post_type || p.media_type) === filter);
        }

        return result;
    }, [posts, filter]);

    // Stats
    const stats = useMemo(() => {
        const reels = posts.filter(p => p.post_type === 'reel' || p.media_type === 'reel');
        const images = posts.filter(p => p.post_type === 'image' || p.media_type === 'image');
        const carousels = posts.filter(p => p.post_type === 'carousel' || p.media_type === 'carousel');

        const avgReelReach = reels.length > 0 ? reels.reduce((s, p) => s + (p.reach || 0), 0) / reels.length : 0;
        const avgImageReach = images.length > 0 ? images.reduce((s, p) => s + (p.reach || 0), 0) / images.length : 0;

        return {
            totalPosts: posts.length,
            reelsCount: reels.length,
            imagesCount: images.length,
            carouselsCount: carousels.length,
            avgReelReach,
            avgImageReach,
            reelMultiplier: avgImageReach > 0 ? (avgReelReach / avgImageReach).toFixed(1) : '3.0'
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
                Error loading content: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.totalPosts}</p>
                            <p className="text-xs text-slate-500">Total Posts</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <p className="text-2xl font-bold text-pink-600">{stats.reelsCount}</p>
                            <p className="text-xs text-slate-500">Reels</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-purple-600">{stats.imagesCount + stats.carouselsCount}</p>
                            <p className="text-xs text-slate-500">Posts</p>
                        </div>
                    </div>
                    <div className="px-3 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                        <p className="text-xs text-slate-600">
                            Reels perform <span className="font-bold text-pink-600">{stats.reelMultiplier}x</span> better
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'all', label: 'All' },
                    { id: 'reel', label: 'Reels' },
                    { id: 'image', label: 'Images' },
                    { id: 'carousel', label: 'Carousels' }
                ].map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setFilter(id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                            filter === id
                                ? 'bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
            </div>

            {filteredPosts.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    No posts found for this filter
                </div>
            )}
        </div>
    );
};

export default InstagramContent;
