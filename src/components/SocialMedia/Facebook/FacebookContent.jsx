import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    FileText,
    TrendingUp,
    Eye,
    MousePointer,
    Heart,
    ExternalLink,
    X,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    MessageSquare,
    Pin,
    PinOff
} from 'lucide-react';

// LocalStorage key for pinned posts
const PINNED_POSTS_KEY = 'facebook_pinned_posts';
const MAX_PINNED_POSTS = 5;
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

// Facebook brand color
const FB_BLUE = '#1877F2';

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Reaction colors
const REACTION_CONFIG = {
    like: { label: 'Like', emoji: '👍', color: '#1877F2' },
    love: { label: 'Love', emoji: '❤️', color: '#F33E58' },
    haha: { label: 'Haha', emoji: '😂', color: '#F7B928' },
    wow: { label: 'Wow', emoji: '😮', color: '#F7B928' },
    sad: { label: 'Sad', emoji: '😢', color: '#F7B928' },
    angry: { label: 'Angry', emoji: '😠', color: '#E9710F' }
};

// Calculate total reactions from breakdown
const getTotalReactions = (reactionsBreakdown) => {
    if (!reactionsBreakdown) return 0;
    return Object.values(reactionsBreakdown).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
};

// Calculate engagement rate
const calcEngagementRate = (post) => {
    const reach = post.reach || 0;
    if (reach === 0) return 0;
    const clicks = post.clicks || 0;
    const reactions = getTotalReactions(post.reactions_breakdown);
    return ((clicks + reactions) / reach) * 100;
};

// Elevated Summary Card Component with premium styling
const SummaryCard = ({ icon: Icon, label, value, subtext, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-100 p-3 md:p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow duration-300">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-medium text-slate-400 uppercase tracking-wide mb-1 md:mb-2 truncate">{label}</p>
                <p className="text-lg md:text-2xl font-bold text-slate-800 truncate">{value}</p>
                {subtext && (
                    <p className="text-[10px] md:text-xs text-slate-400 mt-1 md:mt-1.5 truncate">{subtext}</p>
                )}
            </div>
            <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${iconBg} flex-shrink-0`}>
                <Icon size={18} className={`${iconColor} md:hidden`} />
                <Icon size={24} className={`${iconColor} hidden md:block`} />
            </div>
        </div>
    </div>
);

// Sort Icon Component - shows three states: neutral, desc, asc
const SortIcon = ({ direction }) => {
    if (!direction) return <ChevronsUpDown size={14} className="inline ml-1 text-slate-300" />;
    if (direction === 'desc') return <ChevronDown size={14} className="inline ml-1 text-blue-500" />;
    return <ChevronUp size={14} className="inline ml-1 text-blue-500" />;
};

// Context Menu Component for Pin/Unpin actions
const ContextMenu = ({ x, y, isPinned, canPin, onPin, onUnpin, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const handleScroll = () => {
            onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[160px]"
            style={{ top: y, left: x }}
        >
            {isPinned ? (
                <button
                    onClick={onUnpin}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <PinOff size={16} className="text-slate-400" />
                    Unpin Post
                </button>
            ) : (
                <button
                    onClick={onPin}
                    disabled={!canPin}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        canPin
                            ? 'text-slate-700 hover:bg-slate-50'
                            : 'text-slate-400 cursor-not-allowed'
                    }`}
                >
                    <Pin size={16} className={canPin ? 'text-slate-400' : 'text-slate-300'} />
                    {canPin ? 'Pin Post' : `Max ${MAX_PINNED_POSTS} pinned`}
                </button>
            )}
        </div>
    );
};

// Sortable Table Header Component - always center-aligned
const SortableHeader = ({ label, sortKey, currentSort, currentDirection, onSort }) => (
    <th
        onClick={() => onSort(sortKey)}
        className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none text-center"
    >
        <span className="inline-flex items-center justify-center">
            {label}
            <SortIcon direction={currentSort === sortKey ? currentDirection : null} />
        </span>
    </th>
);

// Post Detail Modal Component
const PostDetailModal = ({ post, onClose }) => {
    if (!post) return null;

    const totalReactions = getTotalReactions(post.reactions_breakdown);
    const engagementRate = calcEngagementRate(post);

    // Prepare reactions data for chart
    const reactionsData = Object.entries(REACTION_CONFIG).map(([key, config]) => ({
        name: config.emoji,
        label: config.label,
        value: parseInt(post.reactions_breakdown?.[key]) || 0,
        color: config.color
    })).filter(r => r.value > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <FileText size={16} className="text-blue-600" />
                        </div>
                        <span className="text-sm text-slate-600 font-medium">
                            {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy • h:mm a') : 'No date'}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Side - Post Content */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Post Content</h4>
                            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {post.content_text || 'No content available'}
                                </p>
                            </div>

                            {post.permalink && (
                                <a
                                    href={post.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1664d9] transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    View on Facebook
                                </a>
                            )}
                        </div>

                        {/* Right Side - Metrics */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Performance Metrics</h4>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Impressions</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.impressions || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Views</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.reach || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Clicks</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.clicks || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Engagement Rate</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {engagementRate.toFixed(2)}%
                                    </p>
                                </div>
                                {post.video_views > 0 && (
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-500 mb-1">Video Views</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {post.video_views.toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Shares</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.shares || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Reactions Breakdown */}
                            {reactionsData.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                        Reactions ({totalReactions.toLocaleString()})
                                    </h4>
                                    <div className="h-[120px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={reactionsData} layout="vertical" margin={{ left: 30, right: 20 }}>
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    tick={{ fontSize: 16 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={30}
                                                />
                                                <Tooltip
                                                    formatter={(value, name, props) => [value.toLocaleString(), props.payload.label]}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        borderColor: '#E2E8F0',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                    {reactionsData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Component
const FacebookContent = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId;
    const accountsLoading = context?.accountsLoading;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sort state - column-based sorting with three states: null -> 'desc' -> 'asc' -> null
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(null);

    // Modal state
    const [selectedPost, setSelectedPost] = useState(null);

    // Pinned posts state - load from localStorage on mount
    const [pinnedPostIds, setPinnedPostIds] = useState(() => {
        try {
            const stored = localStorage.getItem(PINNED_POSTS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    // Context menu state
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        postId: null
    });

    // Persist pinned posts to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(PINNED_POSTS_KEY, JSON.stringify(pinnedPostIds));
        } catch (err) {
            console.error('Failed to save pinned posts:', err);
        }
    }, [pinnedPostIds]);

    // Handle right-click on post row
    const handleContextMenu = useCallback((e, postId) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            postId
        });
    }, []);

    // Close context menu
    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    // Pin a post
    const pinPost = useCallback((postId) => {
        if (pinnedPostIds.length < MAX_PINNED_POSTS && !pinnedPostIds.includes(postId)) {
            setPinnedPostIds(prev => [...prev, postId]);
        }
        closeContextMenu();
    }, [pinnedPostIds, closeContextMenu]);

    // Unpin a post
    const unpinPost = useCallback((postId) => {
        setPinnedPostIds(prev => prev.filter(id => id !== postId));
        closeContextMenu();
    }, [closeContextMenu]);

    // Handle column sort - three-state cycle: null -> desc -> asc -> null
    const handleSort = (column) => {
        if (sortColumn !== column) {
            // New column, start with descending
            setSortColumn(column);
            setSortDirection('desc');
        } else if (sortDirection === 'desc') {
            // Same column, was desc, now asc
            setSortDirection('asc');
        } else if (sortDirection === 'asc') {
            // Same column, was asc, now reset to no sort
            setSortColumn(null);
            setSortDirection(null);
        }
    };

    // Fetch posts with metrics
    useEffect(() => {
        const fetchPosts = async () => {
            // Skip if accounts still loading or no account selected
            if (accountsLoading || !selectedAccountId) return;
            if (!startDate || !endDate) return;

            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Fetch posts - filter by account_id
                let postsQuery = supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .gte('published_at', startDateString)
                    .lte('published_at', endDateString + 'T23:59:59')
                    .order('published_at', { ascending: false });

                const { data: postsData, error: postsError } = await postsQuery;

                if (postsError) throw postsError;

                // Fetch metrics for each post
                if (postsData && postsData.length > 0) {
                    const postIds = postsData.map(p => p.id);

                    const { data: metricsData, error: metricsError } = await supabaseSocialAnalytics
                        .from('post_metrics_daily')
                        .select('*')
                        .in('post_id', postIds);

                    if (metricsError) throw metricsError;

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

            } catch (err) {
                console.error('Error fetching posts:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [dateRange, selectedAccountId, accountsLoading]);

    // Sort function for posts
    const sortPosts = useCallback((postsToSort) => {
        const result = [...postsToSort];

        // If no sort selected, default to published_at descending (most recent first)
        if (!sortColumn || !sortDirection) {
            result.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
            return result;
        }

        const multiplier = sortDirection === 'asc' ? 1 : -1;

        switch (sortColumn) {
            case 'reach':
                result.sort((a, b) => ((a.reach || 0) - (b.reach || 0)) * multiplier);
                break;
            case 'clicks':
                result.sort((a, b) => ((a.clicks || 0) - (b.clicks || 0)) * multiplier);
                break;
            case 'reactions':
                result.sort((a, b) => (getTotalReactions(a.reactions_breakdown) - getTotalReactions(b.reactions_breakdown)) * multiplier);
                break;
            case 'engagement':
                result.sort((a, b) => (calcEngagementRate(a) - calcEngagementRate(b)) * multiplier);
                break;
            case 'published_at':
                result.sort((a, b) => (new Date(a.published_at) - new Date(b.published_at)) * multiplier);
                break;
            default:
                break;
        }

        return result;
    }, [sortColumn, sortDirection]);

    // Sort posts with two-tier logic: pinned posts first, then unpinned posts
    // Each tier is sorted by the current sort criteria
    const sortedPosts = useMemo(() => {
        // Separate pinned and unpinned posts
        const pinnedPosts = posts.filter(p => pinnedPostIds.includes(p.id));
        const unpinnedPosts = posts.filter(p => !pinnedPostIds.includes(p.id));

        // Sort each group independently
        const sortedPinned = sortPosts(pinnedPosts);
        const sortedUnpinned = sortPosts(unpinnedPosts);

        // Concatenate: pinned first, then unpinned
        return [...sortedPinned, ...sortedUnpinned];
    }, [posts, pinnedPostIds, sortPosts]);

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        if (posts.length === 0) {
            return {
                topPost: null,
                mostEngaging: null,
                avgReach: 0,
                avgEngagement: 0
            };
        }

        // Top performing post (highest reach)
        const topPost = posts.reduce((best, post) =>
            (post.reach || 0) > (best?.reach || 0) ? post : best
            , posts[0]);

        // Most engaging post (highest engagement rate)
        const mostEngaging = posts.reduce((best, post) =>
            calcEngagementRate(post) > calcEngagementRate(best) ? post : best
            , posts[0]);

        // Average reach
        const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);
        const avgReach = totalReach / posts.length;

        // Average engagement rate
        const totalEngagement = posts.reduce((sum, p) => sum + calcEngagementRate(p), 0);
        const avgEngagement = totalEngagement / posts.length;

        return { topPost, mostEngaging, avgReach, avgEngagement };
    }, [posts]);

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
                Error loading content data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Section 1: Elevated Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <SummaryCard
                    icon={TrendingUp}
                    label="Top Performing Post"
                    value={summaryStats.topPost ? `${(summaryStats.topPost.reach || 0).toLocaleString()} views` : 'No data'}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-500"
                />
                <SummaryCard
                    icon={Heart}
                    label="Most Engaging Post"
                    value={summaryStats.mostEngaging ? `${calcEngagementRate(summaryStats.mostEngaging).toFixed(1)}% rate` : 'No data'}
                    iconBg="bg-pink-50"
                    iconColor="text-pink-500"
                />
                <SummaryCard
                    icon={Eye}
                    label="Avg Views per Post"
                    value={Math.round(summaryStats.avgReach).toLocaleString()}
                    subtext="Average across all posts"
                    iconBg="bg-cyan-50"
                    iconColor="text-cyan-500"
                />
                <SummaryCard
                    icon={MousePointer}
                    label="Avg Engagement Rate"
                    value={`${summaryStats.avgEngagement.toFixed(2)}%`}
                    subtext="(Clicks + Reactions) / Views"
                    iconBg="bg-violet-50"
                    iconColor="text-violet-500"
                />
            </div>

            {/* Section 2: Posts Table with sortable columns */}
            <div className="bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] overflow-hidden">
                {/* Post count header */}
                <div className="px-3 md:px-5 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs md:text-sm font-semibold text-slate-700">All Posts</h3>
                    <span className="text-[10px] md:text-xs text-slate-400">
                        {sortedPosts.length} post{sortedPosts.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-[320px]">
                                    Post
                                </th>
                                <SortableHeader
                                    label="Published"
                                    sortKey="published_at"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Views"
                                    sortKey="reach"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Reactions"
                                    sortKey="reactions"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Clicks"
                                    sortKey="clicks"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Eng. Rate"
                                    sortKey="engagement"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPosts.length > 0 ? (
                                sortedPosts.map((post, index) => {
                                    const totalReactions = getTotalReactions(post.reactions_breakdown);
                                    const engRate = calcEngagementRate(post);
                                    const isTopReach = summaryStats.topPost?.id === post.id;
                                    const isMostEngaging = summaryStats.mostEngaging?.id === post.id;
                                    const isPinned = pinnedPostIds.includes(post.id);

                                    // Check if this is the last pinned post (for visual separator)
                                    const pinnedCount = pinnedPostIds.filter(id => posts.some(p => p.id === id)).length;
                                    const isLastPinned = isPinned && index === pinnedCount - 1 && pinnedCount < sortedPosts.length;

                                    return (
                                        <tr
                                            key={post.id}
                                            className={`
                                                border-b transition-colors duration-150 cursor-pointer
                                                ${isPinned
                                                    ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-2 border-l-amber-400'
                                                    : 'hover:bg-slate-50/50'
                                                }
                                                ${isLastPinned ? 'border-b-2 border-b-amber-200' : 'border-slate-100'}
                                            `}
                                            onClick={() => setSelectedPost(post)}
                                            onContextMenu={(e) => handleContextMenu(e, post.id)}
                                        >
                                            <td className="px-4 py-4 w-[320px]">
                                                <div className="flex items-center gap-2">
                                                    {/* Pin indicator */}
                                                    {isPinned && (
                                                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0" title="Pinned">
                                                            <Pin size={12} className="text-amber-500" />
                                                        </div>
                                                    )}

                                                    {/* Post icon */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPinned ? 'bg-amber-100' : 'bg-blue-50'}`}>
                                                        <MessageSquare size={14} className={isPinned ? 'text-amber-500' : 'text-blue-400'} />
                                                    </div>

                                                    {/* Post text */}
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm text-slate-700 line-clamp-1 block">
                                                            {post.content_text || 'No content'}
                                                        </span>
                                                        {(isTopReach || isMostEngaging) && (
                                                            <div className="flex gap-1 mt-1">
                                                                {isTopReach && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-600 rounded-full whitespace-nowrap">
                                                                        Top Views
                                                                    </span>
                                                                )}
                                                                {isMostEngaging && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-pink-100 text-pink-600 rounded-full whitespace-nowrap">
                                                                        Top Engagement
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* External link */}
                                                    {post.permalink && (
                                                        <a
                                                            href={post.permalink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors flex-shrink-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="View on Facebook"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-slate-500 text-center whitespace-nowrap w-[100px]">
                                                {post.published_at ? format(new Date(post.published_at), 'MMM d') : '-'}
                                            </td>
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[80px]">
                                                {(post.reach || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[80px]">
                                                {totalReactions.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[70px]">
                                                {(post.clicks || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-center w-[80px]">
                                                <span className={`text-sm font-semibold ${engRate >= 3 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                    {engRate.toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <FileText size={24} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-600 font-medium">No posts found for this period</p>
                                        <p className="text-sm text-slate-400 mt-1">Try adjusting the date range</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}

            {/* Context Menu for Pin/Unpin */}
            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isPinned={pinnedPostIds.includes(contextMenu.postId)}
                    canPin={pinnedPostIds.length < MAX_PINNED_POSTS}
                    onPin={() => pinPost(contextMenu.postId)}
                    onUnpin={() => unpinPost(contextMenu.postId)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default FacebookContent;
