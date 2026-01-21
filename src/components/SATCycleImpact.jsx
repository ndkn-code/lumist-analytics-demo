import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Loader2 } from 'lucide-react';

// Order of buckets from furthest to closest to SAT
const BUCKET_ORDER = ['30+ days', '22-30 days', '15-21 days', '8-14 days', '0-7 days'];

// Color gradient from light to dark violet (furthest to closest)
const BUCKET_COLORS = {
    '30+ days': '#DDD6FE',     // violet-200
    '22-30 days': '#C4B5FD',   // violet-300
    '15-21 days': '#A78BFA',   // violet-400
    '8-14 days': '#8B5CF6',    // violet-500
    '0-7 days': '#7C3AED'      // violet-600
};

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
                <p className="text-gray-900 font-semibold mb-1">{data.bucket}</p>
                <p className="text-violet-600 text-sm">
                    Avg DAU: <span className="font-bold">{data.avgDau?.toFixed(0)}</span>
                </p>
                <p className="text-gray-500 text-xs mt-1">
                    Based on {data.sampleDays} days
                </p>
            </div>
        );
    }
    return null;
};

const SATCycleImpact = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: result, error: err } = await supabase
                    .from('sat_cycle_engagement')
                    .select('*');

                if (err) throw err;
                setData(result || []);
            } catch (err) {
                console.error('Error fetching SAT cycle data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process and sort data by bucket order
    const { chartData, insightText } = useMemo(() => {
        if (!data || data.length === 0) {
            return { chartData: [], insightText: '' };
        }

        // Map data to our bucket order
        const processed = BUCKET_ORDER.map(bucket => {
            const item = data.find(d => d.days_bucket === bucket);
            return {
                bucket,
                shortLabel: bucket.replace(' days', 'd').replace('+ ', '+'),
                avgDau: item?.avg_dau || 0,
                sampleDays: item?.sample_days || 0,
                color: BUCKET_COLORS[bucket]
            };
        }).filter(d => d.avgDau > 0);

        // Calculate insight: compare week before SAT to 30+ days out
        const weekBefore = data.find(d => d.days_bucket === '0-7 days');
        const monthOut = data.find(d => d.days_bucket === '30+ days');

        let insight = '';
        if (weekBefore?.avg_dau && monthOut?.avg_dau && monthOut.avg_dau > 0) {
            const increase = ((weekBefore.avg_dau - monthOut.avg_dau) / monthOut.avg_dau * 100).toFixed(0);
            if (increase > 0) {
                insight = `Students engage ${increase}% more in the week before SAT`;
            } else if (increase < 0) {
                insight = `Engagement drops ${Math.abs(increase)}% closer to SAT`;
            }
        }

        return { chartData: processed, insightText: insight };
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
                <div className="text-rose-600 text-sm">Failed to load SAT cycle data</div>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full">
                <div className="mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">SAT Cycle Impact</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Engagement by days until SAT</p>
                </div>
                <div className="text-center py-12 text-slate-500">
                    No SAT cycle data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
            <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">SAT Cycle Impact</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Engagement by days until SAT</p>
            </div>

            <div className="flex-grow min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                            dataKey="shortLabel"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 10, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="avgDau"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={50}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList
                                dataKey="avgDau"
                                position="top"
                                fill="#6B7280"
                                fontSize={12}
                                fontWeight={500}
                                formatter={(value) => Math.round(value)}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Insight callout */}
            {insightText && (
                <div className="mt-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-violet-600 font-medium">Insight:</span>
                        <span className="text-slate-600">{insightText}</span>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium">Days to SAT:</span>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-violet-200" />
                        <span>Far</span>
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-violet-600" />
                        <span>Close</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SATCycleImpact;
