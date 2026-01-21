import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
    Loader2,
    MessageSquare,
    Hash,
    Clock,
    Trophy
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Discord brand color
const DISCORD_BLUE = '#5865F2';

// Colors for channel distribution pie chart
const CHANNEL_COLORS = [
    '#5865F2', // Discord Blue
    '#57F287', // Discord Green
    '#FEE75C', // Discord Yellow
    '#EB459E', // Discord Fuchsia
    '#ED4245', // Discord Red
    '#3BA55D', // Emerald
    '#FAA81A', // Orange
    '#9B59B6', // Purple
    '#3498DB', // Blue
    '#1ABC9C'  // Teal
];

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Channel Leaderboard Item
const ChannelItem = ({ rank, name, messages, maxMessages }) => {
    const percentage = maxMessages > 0 ? (messages / maxMessages) * 100 : 0;

    return (
        <div className="flex items-center gap-3 py-2">
            <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${rank === 1 ? 'bg-amber-100 text-amber-700' :
                  rank === 2 ? 'bg-slate-200 text-slate-600' :
                  rank === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'}
            `}>
                {rank}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                    <Hash size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 truncate">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: CHANNEL_COLORS[rank - 1] || DISCORD_BLUE
                            }}
                        />
                    </div>
                    <span className="text-xs text-slate-500 font-medium w-16 text-right">
                        {messages.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Custom Tooltip for Hourly Activity Chart
const HourlyTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">
                {label}:00
            </p>
            <p style={{ color: DISCORD_BLUE }} className="text-sm">
                Messages: <span className="font-bold">{payload[0]?.value?.toLocaleString()}</span>
            </p>
        </div>
    );
};

const DiscordEngagement = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];

    const [channelLeaderboard, setChannelLeaderboard] = useState([]);
    const [hourlyActivity, setHourlyActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Fetch channel leaderboard (top channels by messages in last 7 days)
                const channelPromise = supabaseSocialAnalytics
                    .from('discord_channel_leaderboard')
                    .select('*')
                    .order('total_messages', { ascending: false })
                    .limit(10);

                // Fetch hourly activity (last 24 hours)
                const hourlyPromise = supabaseSocialAnalytics
                    .from('discord_hourly_activity')
                    .select('*')
                    .order('hour', { ascending: true });

                const [channelRes, hourlyRes] = await Promise.all([
                    channelPromise,
                    hourlyPromise
                ]);

                if (channelRes.error) throw channelRes.error;
                if (hourlyRes.error) throw hourlyRes.error;

                setChannelLeaderboard(channelRes.data || []);
                setHourlyActivity(hourlyRes.data || []);

            } catch (err) {
                console.error('Error fetching Discord engagement data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Process data for charts
    const {
        totalMessages,
        topChannel,
        hourlyChartData,
        pieChartData,
        peakHour
    } = useMemo(() => {
        const totalMessages = channelLeaderboard.reduce((sum, c) => sum + (c.total_messages || 0), 0);
        const topChannel = channelLeaderboard[0] || null;

        // Hourly chart data
        const hourlyChartData = hourlyActivity.map(h => ({
            hour: h.hour,
            messages: h.message_count || 0
        }));

        // Find peak hour
        let peakHour = null;
        let maxMessages = 0;
        hourlyActivity.forEach(h => {
            if ((h.message_count || 0) > maxMessages) {
                maxMessages = h.message_count || 0;
                peakHour = h.hour;
            }
        });

        // Pie chart data for channel distribution
        const pieChartData = channelLeaderboard.slice(0, 6).map((c, i) => ({
            name: c.channel_name || 'Unknown',
            value: c.total_messages || 0,
            color: CHANNEL_COLORS[i]
        }));

        // Add "Other" category if there are more than 6 channels
        if (channelLeaderboard.length > 6) {
            const otherMessages = channelLeaderboard.slice(6).reduce((sum, c) => sum + (c.total_messages || 0), 0);
            if (otherMessages > 0) {
                pieChartData.push({
                    name: 'Other',
                    value: otherMessages,
                    color: '#94A3B8'
                });
            }
        }

        return {
            totalMessages,
            topChannel,
            hourlyChartData,
            pieChartData,
            peakHour
        };
    }, [channelLeaderboard, hourlyActivity]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-[#5865F2]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading Discord engagement data: {error}
            </div>
        );
    }

    const maxChannelMessages = channelLeaderboard[0]?.total_messages || 1;

    return (
        <div className="space-y-4">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={16} className="text-[#5865F2]" />
                        <span className="text-xs font-medium text-slate-500">Total Messages</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{totalMessages.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Last 7 days</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Hash size={16} className="text-emerald-500" />
                        <span className="text-xs font-medium text-slate-500">Active Channels</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{channelLeaderboard.length}</p>
                    <p className="text-xs text-slate-400 mt-1">With messages</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy size={16} className="text-amber-500" />
                        <span className="text-xs font-medium text-slate-500">Top Channel</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800 truncate">#{topChannel?.channel_name || 'N/A'}</p>
                    <p className="text-xs text-slate-400 mt-1">{topChannel?.total_messages?.toLocaleString() || 0} msgs</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-violet-500" />
                        <span className="text-xs font-medium text-slate-500">Peak Hour</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{peakHour !== null ? `${peakHour}:00` : 'N/A'}</p>
                    <p className="text-xs text-slate-400 mt-1">Most active time</p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Channel Leaderboard */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800">Channel Leaderboard</h3>
                            <p className="text-xs text-slate-500 mt-1">Top channels by message count (7 days)</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {channelLeaderboard.length > 0 ? (
                            channelLeaderboard.slice(0, 10).map((channel, index) => (
                                <ChannelItem
                                    key={channel.channel_name || index}
                                    rank={index + 1}
                                    name={channel.channel_name || 'Unknown'}
                                    messages={channel.total_messages || 0}
                                    maxMessages={maxChannelMessages}
                                />
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                No channel data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Distribution Pie Chart */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Message Distribution</h3>
                        <p className="text-xs text-slate-500 mt-1">Share of messages by channel</p>
                    </div>

                    {pieChartData.length > 0 ? (
                        <>
                            <div className="h-[200px] md:h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="50%"
                                            outerRadius="80%"
                                            paddingAngle={2}
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => value.toLocaleString()}
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                borderColor: '#E2E8F0',
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                                {pieChartData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-1.5">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-xs text-slate-600">#{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            {/* Hourly Activity Chart */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Hourly Activity</h3>
                        <p className="text-xs text-slate-500 mt-1">Message count by hour (last 24 hours)</p>
                    </div>
                </div>

                <div className="h-[250px] md:h-[280px]">
                    {hourlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(h) => `${h}:00`}
                                    stroke="#6B7280"
                                    tick={{ fontSize: 11, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={2}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<HourlyTooltip />} />
                                <Bar
                                    dataKey="messages"
                                    fill={DISCORD_BLUE}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No hourly activity data available
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiscordEngagement;
