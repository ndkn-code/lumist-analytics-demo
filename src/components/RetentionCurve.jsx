import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Loader2 } from 'lucide-react';

// Industry benchmark for SAT prep retention (approximate)
const INDUSTRY_BENCHMARK = 20;

// Chart colors
const CHART_COLOR = '#8B5CF6'; // Violet-500
const BENCHMARK_COLOR = '#CBD5E1'; // Slate-300

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
                <p className="text-gray-900 font-semibold mb-1">Week {data.week}</p>
                <p className="text-violet-600 text-sm">
                    Retention: <span className="font-bold">{data.avgRetention?.toFixed(1)}%</span>
                </p>
                <p className="text-gray-500 text-xs mt-1">
                    Avg of {data.cohortCount} cohorts
                </p>
            </div>
        );
    }
    return null;
};

const RetentionCurve = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: result, error: err } = await supabase
                    .from('monthly_cohort_retention')
                    .select('*')
                    .order('week_number', { ascending: true });

                if (err) throw err;
                setData(result || []);
            } catch (err) {
                console.error('Error fetching retention curve data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Aggregate data by week (average across all cohorts)
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Group by week number
        const weekGroups = {};
        data.forEach(item => {
            const week = item.week_number;
            if (!weekGroups[week]) {
                weekGroups[week] = { rates: [], count: 0 };
            }
            if (item.retention_rate !== null && item.retention_rate !== undefined) {
                weekGroups[week].rates.push(item.retention_rate);
                weekGroups[week].count++;
            }
        });

        // Calculate averages
        return Object.entries(weekGroups)
            .map(([week, group]) => ({
                week: parseInt(week),
                avgRetention: group.rates.length > 0
                    ? group.rates.reduce((a, b) => a + b, 0) / group.rates.length
                    : 0,
                cohortCount: group.count
            }))
            .sort((a, b) => a.week - b.week);
    }, [data]);

    if (loading) {
        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
                <div className="mb-4">
                    <div className="h-5 bg-slate-200 rounded w-32 mb-2 animate-pulse" />
                    <div className="h-3 bg-slate-100 rounded w-48 animate-pulse" />
                </div>
                <div className="flex-grow flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full">
                <div className="text-rose-600 text-sm">Failed to load retention curve</div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
            <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Retention Curve</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Average retention decay over time</p>
            </div>

            <div className="flex-grow min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                            dataKey="week"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(week) => `W${week}`}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Industry benchmark reference line */}
                        <ReferenceLine
                            y={INDUSTRY_BENCHMARK}
                            stroke={BENCHMARK_COLOR}
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                                value: `${INDUSTRY_BENCHMARK}% benchmark`,
                                position: 'right',
                                fill: '#94A3B8',
                                fontSize: 10
                            }}
                        />

                        {/* Actual retention curve */}
                        <Line
                            type="monotone"
                            dataKey="avgRetention"
                            stroke={CHART_COLOR}
                            strokeWidth={3}
                            dot={{ r: 4, fill: CHART_COLOR, strokeWidth: 0 }}
                            activeDot={{ r: 6, fill: CHART_COLOR, strokeWidth: 2, stroke: 'white' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-2 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-violet-500 rounded" />
                        <span>Your retention</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-slate-300 rounded border-dashed" style={{ borderStyle: 'dashed' }} />
                        <span>Industry benchmark</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetentionCurve;
