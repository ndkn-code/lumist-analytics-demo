import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    FileText,
    TrendingUp,
    Eye,
    Heart,
    ExternalLink,
    X,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    MessageSquare,
    Pin,
    PinOff,
    Repeat2,
    MessageCircle
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

// LocalStorage key for pinned threads
const PINNED_POSTS_KEY = 'threads_pinned_posts';
const MAX_PINNED_THREADS = 5;

// Threads brand color
const THREADS_BLACK = '#000000';

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Threads engagement types
const ENGAGEMENT_CONFIG = {
    likes: { label: 'Likes', icon: Heart, color: '#EF4444' },
    reposts: { label: 'Reposts', icon: Repeat2, color: '#10B981' },
    quotes: { label: 'Quotes', icon: MessageSquare, color: '#3B82F6' },
    replies: { label: 'Replies', icon: MessageCircle, color: '#F59E0B' }
};

// Calculate total engagements
const getTotalEngagements = (post) => {
    return (post.likes || 0) + (post.reposts || 0) + (post.quotes || 0) + (post.replies || 0);
};

// Calculate engagement rate
const calcEngagementRate = (post) => {
    const reach = post.reach || 0;
    if (reach === 0) return 0;
    const engagements = getTotalEngagements(post);
    return (engagements / reach) * 100;
};

// Summary Card Component
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

// Sort Icon Component
const SortIcon = ({ direction }) => {
    if (!direction) return <ChevronsUpDown size={14} className="inline ml-1 text-slate-300" />;
    if (direction === 'desc') return <ChevronDown size={14} className="inline ml-1 text-slate-600" />;
    return <ChevronUp size={14} className="inline ml-1 text-slate-600" />;
};

// Context Menu Component
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
                    Unpin Thread
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
                    {canPin ? 'Pin Thread' : `Max ${MAX_PINNED_THREADS} pinned`}
                </button>
            )}
        </div>
    );
};

// Sortable Table Header - always center-aligned
const SortableHeader = ({ label, sortKey, currentSort, currentDirection, onSort }) => (
    <th
        onClick={() => onSort(sortKey)}
        className="px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-50 transition-colors select-none text-center"
    >
        <span className="inline-flex items-center justify-center">
            {label}
            <SortIcon direction={currentSort === sortKey ? currentDirection : null} />
        </span>
    </th>
);

// Thread Detail Modal
const PostDetailModal = ({ post, onClose }) => {
    if (!post) return null;

    const totalEngagements = getTotalEngagements(post);
    const engagementRate = calcEngagementRate(post);

    // Prepare engagement data for chart
    const engagementData = Object.entries(ENGAGEMENT_CONFIG).map(([key, config]) => ({
        name: config.label,
        value: post[key] || 0,
        color: config.color
    })).filter(r => r.value > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100">
                            <FileText size={16} className="text-slate-600" />
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

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Thread Content</h4>
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
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                                >
                                    <ExternalLink size={14} />
                                    View on Threads
                                </a>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Performance Metrics</h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Views</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.reach || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Engagement Rate</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {engagementRate.toFixed(2)}%
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Likes</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.likes || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Reposts</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.reposts || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Quotes</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.quotes || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-xs text-slate-500 mb-1">Replies</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        {(post.replies || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {engagementData.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                        Engagement Breakdown ({totalEngagements.toLocaleString()})
                                    </h4>
                                    <div className="h-[120px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={engagementData} layout="vertical" margin={{ left: 60, right: 20 }}>
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={60}
                                                />
                                                <Tooltip
                                                    formatter={(value) => value.toLocaleString()}
                                                    contentStyle={{
                                                        backgroundColor: 'white',
                                                        borderColor: '#E2E8F0',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                    {engagementData.map((entry, index) => (
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
const ThreadsContent = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId;
    const accountsLoading = context?.accountsLoading;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(null);
    const [selectedPost, setSelectedPost] = useState(null);

    const [pinnedPostIds, setPinnedPostIds] = useState(() => {
        try {
            const stored = localStorage.getItem(PINNED_POSTS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        postId: null
    });

    useEffect(() => {
        try {
            localStorage.setItem(PINNED_POSTS_KEY, JSON.stringify(pinnedPostIds));
        } catch (err) {
            console.error('Failed to save pinned posts:', err);
        }
    }, [pinnedPostIds]);

    const handleContextMenu = useCallback((e, postId) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            postId
        });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    const pinPost = useCallback((postId) => {
        if (pinnedPostIds.length < MAX_PINNED_THREADS && !pinnedPostIds.includes(postId)) {
            setPinnedPostIds(prev => [...prev, postId]);
        }
        closeContextMenu();
    }, [pinnedPostIds, closeContextMenu]);

    const unpinPost = useCallback((postId) => {
        setPinnedPostIds(prev => prev.filter(id => id !== postId));
        closeContextMenu();
    }, [closeContextMenu]);

    const handleSort = (column) => {
        if (sortColumn !== column) {
            setSortColumn(column);
            setSortDirection('desc');
        } else if (sortDirection === 'desc') {
            setSortDirection('asc');
        } else if (sortDirection === 'asc') {
            setSortColumn(null);
            setSortDirection(null);
        }
    };

    // Fetch posts
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

                // Fetch posts filtered by account_id
                const { data: postsData, error: postsError } = await supabaseSocialAnalytics
                    .from('posts')
                    .select('*')
                    .eq('account_id', selectedAccountId)
                    .gte('published_at', startDateString)
                    .lte('published_at', endDateString + 'T23:59:59')
                    .order('published_at', { ascending: false });

                if (postsError) throw postsError;

                if (postsData && postsData.length > 0) {
                    const postIds = postsData.map(p => p.id);

                    const { data: metricsData, error: metricsError } = await supabaseSocialAnalytics
                        .from('post_metrics_daily')
                        .select('*')
                        .in('post_id', postIds);

                    if (metricsError) throw metricsError;

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

    const sortPosts = useCallback((postsToSort) => {
        const result = [...postsToSort];

        if (!sortColumn || !sortDirection) {
            result.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
            return result;
        }

        const multiplier = sortDirection === 'asc' ? 1 : -1;

        switch (sortColumn) {
            case 'reach':
                result.sort((a, b) => ((a.reach || 0) - (b.reach || 0)) * multiplier);
                break;
            case 'likes':
                result.sort((a, b) => ((a.likes || 0) - (b.likes || 0)) * multiplier);
                break;
            case 'replies':
                result.sort((a, b) => ((a.replies || 0) - (b.replies || 0)) * multiplier);
                break;
            case 'reposts':
                result.sort((a, b) => ((a.reposts || 0) - (b.reposts || 0)) * multiplier);
                break;
            case 'quotes':
                result.sort((a, b) => ((a.quotes || 0) - (b.quotes || 0)) * multiplier);
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

    const sortedPosts = useMemo(() => {
        const pinnedPosts = posts.filter(p => pinnedPostIds.includes(p.id));
        const unpinnedPosts = posts.filter(p => !pinnedPostIds.includes(p.id));

        const sortedPinned = sortPosts(pinnedPosts);
        const sortedUnpinned = sortPosts(unpinnedPosts);

        return [...sortedPinned, ...sortedUnpinned];
    }, [posts, pinnedPostIds, sortPosts]);

    const summaryStats = useMemo(() => {
        if (posts.length === 0) {
            return {
                topThread: null,
                mostEngaging: null,
                avgReach: 0,
                avgEngagement: 0
            };
        }

        const topThread = posts.reduce((best, post) =>
            (post.reach || 0) > (best?.reach || 0) ? post : best
            , posts[0]);

        const mostEngaging = posts.reduce((best, post) =>
            calcEngagementRate(post) > calcEngagementRate(best) ? post : best
            , posts[0]);

        const totalReach = posts.reduce((sum, p) => sum + (p.reach || 0), 0);
        const avgReach = totalReach / posts.length;

        const totalEngagement = posts.reduce((sum, p) => sum + calcEngagementRate(p), 0);
        const avgEngagement = totalEngagement / posts.length;

        return { topThread, mostEngaging, avgReach, avgEngagement };
    }, [posts]);

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
                Error loading content data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <SummaryCard
                    icon={TrendingUp}
                    label="Top Performing Thread"
                    value={summaryStats.topThread ? `${(summaryStats.topThread.reach || 0).toLocaleString()} views` : 'No data'}
                    iconBg="bg-slate-100"
                    iconColor="text-slate-700"
                />
                <SummaryCard
                    icon={Heart}
                    label="Most Engaging Thread"
                    value={summaryStats.mostEngaging ? `${calcEngagementRate(summaryStats.mostEngaging).toFixed(1)}% rate` : 'No data'}
                    iconBg="bg-pink-50"
                    iconColor="text-pink-500"
                />
                <SummaryCard
                    icon={Eye}
                    label="Avg Views per Thread"
                    value={Math.round(summaryStats.avgReach).toLocaleString()}
                    subtext="Average across all threads"
                    iconBg="bg-slate-50"
                    iconColor="text-slate-500"
                />
                <SummaryCard
                    icon={Repeat2}
                    label="Avg Engagement Rate"
                    value={`${summaryStats.avgEngagement.toFixed(2)}%`}
                    subtext="Engagements / Views"
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-500"
                />
            </div>

            {/* Threads Table */}
            <div className="bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] overflow-hidden">
                <div className="px-3 md:px-5 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs md:text-sm font-semibold text-slate-700">All Threads</h3>
                    <span className="text-[10px] md:text-xs text-slate-400">
                        {sortedPosts.length} thread{sortedPosts.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-[320px]">
                                    Thread
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
                                    label="Likes"
                                    sortKey="likes"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Replies"
                                    sortKey="replies"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Reposts"
                                    sortKey="reposts"
                                    currentSort={sortColumn}
                                    currentDirection={sortDirection}
                                    onSort={handleSort}
                                />
                                <SortableHeader
                                    label="Quotes"
                                    sortKey="quotes"
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
                                    const engRate = calcEngagementRate(post);
                                    const isTopReach = summaryStats.topThread?.id === post.id;
                                    const isMostEngaging = summaryStats.mostEngaging?.id === post.id;
                                    const isPinned = pinnedPostIds.includes(post.id);

                                    const pinnedCount = pinnedPostIds.filter(id => posts.some(p => p.id === id)).length;
                                    const isLastPinned = isPinned && index === pinnedCount - 1 && pinnedCount < sortedPosts.length;

                                    return (
                                        <tr
                                            key={post.id}
                                            className={`
                                                border-b transition-colors duration-150 cursor-pointer
                                                ${isPinned
                                                    ? 'bg-slate-50/50 hover:bg-slate-100/50 border-l-2 border-l-slate-400'
                                                    : 'hover:bg-slate-50/50'
                                                }
                                                ${isLastPinned ? 'border-b-2 border-b-slate-200' : 'border-slate-100'}
                                            `}
                                            onClick={() => setSelectedPost(post)}
                                            onContextMenu={(e) => handleContextMenu(e, post.id)}
                                        >
                                            <td className="px-4 py-4 w-[320px]">
                                                <div className="flex items-center gap-2">
                                                    {isPinned && (
                                                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0" title="Pinned">
                                                            <Pin size={12} className="text-slate-500" />
                                                        </div>
                                                    )}

                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPinned ? 'bg-slate-200' : 'bg-slate-100'}`}>
                                                        <MessageSquare size={14} className={isPinned ? 'text-slate-600' : 'text-slate-400'} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm text-slate-700 line-clamp-1 block">
                                                            {post.content_text || 'No content'}
                                                        </span>
                                                        {(isTopReach || isMostEngaging) && (
                                                            <div className="flex gap-1 mt-1">
                                                                {isTopReach && (
                                                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-600 rounded-full whitespace-nowrap">
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

                                                    {post.permalink && (
                                                        <a
                                                            href={post.permalink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors flex-shrink-0"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="View on Threads"
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
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[70px]">
                                                {(post.likes || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[70px]">
                                                {(post.replies || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[70px]">
                                                {(post.reposts || 0).toLocaleString()}
                                            </td>
                                            <td className="px-3 py-4 text-sm font-semibold text-slate-800 text-center w-[70px]">
                                                {(post.quotes || 0).toLocaleString()}
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
                                    <td colSpan={8} className="px-5 py-16 text-center">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <FileText size={24} className="text-slate-400" />
                                        </div>
                                        <p className="text-slate-600 font-medium">No threads found for this period</p>
                                        <p className="text-sm text-slate-400 mt-1">Try adjusting the date range</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}

            {contextMenu.visible && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    isPinned={pinnedPostIds.includes(contextMenu.postId)}
                    canPin={pinnedPostIds.length < MAX_PINNED_THREADS}
                    onPin={() => pinPost(contextMenu.postId)}
                    onUnpin={() => unpinPost(contextMenu.postId)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default ThreadsContent;
