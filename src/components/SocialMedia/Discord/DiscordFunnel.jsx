import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { subDays } from 'date-fns';
import {
    Loader2,
    Users,
    UserCheck,
    Shield,
    Crown,
    ArrowRight,
    TrendingDown,
    Filter
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

// Discord brand color
const DISCORD_BLUE = '#5865F2';

// Funnel stage colors (from light to dark)
const FUNNEL_COLORS = {
    joined: '#5865F2',        // Discord Blue
    onboarded: '#57F287',     // Discord Green
    verified: '#FEE75C',      // Discord Yellow
    premium: '#EB459E'        // Discord Fuchsia
};

// Conversion Rate Card
const ConversionCard = ({ from, to, rate, dropoff, icon: Icon, color }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={14} style={{ color }} />
                </div>
                <span className="text-xs font-medium text-slate-500">{from} → {to}</span>
            </div>
        </div>
        <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-800">{rate.toFixed(1)}%</p>
            <span className="text-xs text-slate-400">conversion</span>
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
            <TrendingDown size={12} />
            <span>{dropoff.toLocaleString()} drop-off</span>
        </div>
    </div>
);

// Funnel Stage Row
const FunnelStageRow = ({ stage, count, percentage, color, isLast }) => (
    <div className="flex items-center gap-4">
        <div className="w-24 text-right">
            <p className="text-sm font-medium text-slate-700">{stage}</p>
        </div>
        <div className="flex-1 relative">
            <div
                className="h-10 rounded-lg flex items-center justify-end px-4 transition-all duration-500"
                style={{
                    width: `${Math.max(percentage, 10)}%`,
                    backgroundColor: color
                }}
            >
                <span className="text-sm font-bold text-white">{count.toLocaleString()}</span>
            </div>
            {!isLast && (
                <div className="absolute right-0 top-1/2 transform translate-x-4 -translate-y-1/2">
                    <ArrowRight size={16} className="text-slate-300" />
                </div>
            )}
        </div>
        <div className="w-16 text-right">
            <span className="text-sm font-medium text-slate-500">{percentage.toFixed(1)}%</span>
        </div>
    </div>
);

// Custom Tooltip for Funnel Bar Chart
const FunnelTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">{label}</p>
            <p style={{ color: payload[0]?.fill }} className="text-sm">
                Members: <span className="font-bold">{payload[0]?.value?.toLocaleString()}</span>
            </p>
        </div>
    );
};

const DiscordFunnel = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];

    const [funnelData, setFunnelData] = useState(null);
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
                // Fetch funnel stats
                const { data, error: fetchError } = await supabaseSocialAnalytics
                    .from('discord_funnel_stats')
                    .select('*')
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

                setFunnelData(data);

            } catch (err) {
                console.error('Error fetching Discord funnel data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process funnel data
    const {
        stages,
        barChartData,
        conversions,
        overallConversion
    } = useMemo(() => {
        if (!funnelData) {
            return {
                stages: [],
                barChartData: [],
                conversions: {},
                overallConversion: 0
            };
        }

        const totalJoined = funnelData.total_joined || 0;
        const completedOnboarding = funnelData.completed_onboarding || 0;
        const verified = funnelData.verified || 0;
        const premium = funnelData.premium || 0;

        // Calculate stages with percentages relative to joined
        const stages = [
            {
                name: 'Joined',
                count: totalJoined,
                percentage: 100,
                color: FUNNEL_COLORS.joined
            },
            {
                name: 'Onboarded',
                count: completedOnboarding,
                percentage: totalJoined > 0 ? (completedOnboarding / totalJoined) * 100 : 0,
                color: FUNNEL_COLORS.onboarded
            },
            {
                name: 'Verified',
                count: verified,
                percentage: totalJoined > 0 ? (verified / totalJoined) * 100 : 0,
                color: FUNNEL_COLORS.verified
            },
            {
                name: 'Premium',
                count: premium,
                percentage: totalJoined > 0 ? (premium / totalJoined) * 100 : 0,
                color: FUNNEL_COLORS.premium
            }
        ];

        // Bar chart data
        const barChartData = stages.map(s => ({
            stage: s.name,
            members: s.count,
            color: s.color
        }));

        // Calculate step-by-step conversions
        const conversions = {
            joinedToOnboarded: {
                rate: totalJoined > 0 ? (completedOnboarding / totalJoined) * 100 : 0,
                dropoff: totalJoined - completedOnboarding
            },
            onboardedToVerified: {
                rate: completedOnboarding > 0 ? (verified / completedOnboarding) * 100 : 0,
                dropoff: completedOnboarding - verified
            },
            verifiedToPremium: {
                rate: verified > 0 ? (premium / verified) * 100 : 0,
                dropoff: verified - premium
            }
        };

        // Overall conversion (Joined → Premium)
        const overallConversion = totalJoined > 0 ? (premium / totalJoined) * 100 : 0;

        return {
            stages,
            barChartData,
            conversions,
            overallConversion
        };
    }, [funnelData]);

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
                Error loading Discord funnel data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Overall Conversion */}
            <div className="bg-gradient-to-r from-[#5865F2] to-[#7289DA] rounded-2xl p-4 md:p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Filter size={20} />
                            <h2 className="text-lg md:text-xl font-semibold">Member Conversion Funnel</h2>
                        </div>
                        <p className="text-sm text-white/80">Track member journey from joining to premium</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
                        <p className="text-3xl md:text-4xl font-bold">{overallConversion.toFixed(1)}%</p>
                        <p className="text-sm text-white/80 mt-1">Overall Conversion</p>
                        <p className="text-xs text-white/60">Joined → Premium</p>
                    </div>
                </div>
            </div>

            {/* Conversion Rate Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ConversionCard
                    from="Joined"
                    to="Onboarded"
                    rate={conversions.joinedToOnboarded?.rate || 0}
                    dropoff={conversions.joinedToOnboarded?.dropoff || 0}
                    icon={UserCheck}
                    color={FUNNEL_COLORS.onboarded}
                />
                <ConversionCard
                    from="Onboarded"
                    to="Verified"
                    rate={conversions.onboardedToVerified?.rate || 0}
                    dropoff={conversions.onboardedToVerified?.dropoff || 0}
                    icon={Shield}
                    color={FUNNEL_COLORS.verified}
                />
                <ConversionCard
                    from="Verified"
                    to="Premium"
                    rate={conversions.verifiedToPremium?.rate || 0}
                    dropoff={conversions.verifiedToPremium?.dropoff || 0}
                    icon={Crown}
                    color={FUNNEL_COLORS.premium}
                />
            </div>

            {/* Horizontal Funnel Bar Chart */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">Funnel Visualization</h3>
                    <p className="text-xs text-slate-500 mt-1">Members at each stage of the journey</p>
                </div>

                <div className="h-[280px] md:h-[320px]">
                    {barChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={barChartData}
                                layout="vertical"
                                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                                <XAxis
                                    type="number"
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="stage"
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={70}
                                />
                                <Tooltip content={<FunnelTooltip />} />
                                <Bar
                                    dataKey="members"
                                    radius={[0, 8, 8, 0]}
                                    barSize={40}
                                >
                                    {barChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No funnel data available
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Funnel (Progressive Bars) */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">Funnel Progression</h3>
                    <p className="text-xs text-slate-500 mt-1">Visual representation of member drop-off at each stage</p>
                </div>

                <div className="space-y-4">
                    {stages.map((stage, index) => (
                        <FunnelStageRow
                            key={stage.name}
                            stage={stage.name}
                            count={stage.count}
                            percentage={stage.percentage}
                            color={stage.color}
                            isLast={index === stages.length - 1}
                        />
                    ))}
                </div>

                {/* Funnel Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-slate-100">
                    {stages.map((stage) => (
                        <div key={stage.name} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.color }}
                            />
                            <span className="text-xs text-slate-600">{stage.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Drop-off Analysis */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">Drop-off Analysis</h3>
                    <p className="text-xs text-slate-500 mt-1">Where members are leaving the funnel</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Joined to Onboarded */}
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-600">Join → Onboard</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                {conversions.joinedToOnboarded?.dropoff?.toLocaleString() || 0} lost
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#57F287] rounded-full"
                                style={{ width: `${conversions.joinedToOnboarded?.rate || 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {(100 - (conversions.joinedToOnboarded?.rate || 0)).toFixed(1)}% drop-off rate
                        </p>
                    </div>

                    {/* Onboarded to Verified */}
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-600">Onboard → Verify</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                {conversions.onboardedToVerified?.dropoff?.toLocaleString() || 0} lost
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#FEE75C] rounded-full"
                                style={{ width: `${conversions.onboardedToVerified?.rate || 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {(100 - (conversions.onboardedToVerified?.rate || 0)).toFixed(1)}% drop-off rate
                        </p>
                    </div>

                    {/* Verified to Premium */}
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-600">Verify → Premium</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                {conversions.verifiedToPremium?.dropoff?.toLocaleString() || 0} lost
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#EB459E] rounded-full"
                                style={{ width: `${conversions.verifiedToPremium?.rate || 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {(100 - (conversions.verifiedToPremium?.rate || 0)).toFixed(1)}% drop-off rate
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiscordFunnel;
