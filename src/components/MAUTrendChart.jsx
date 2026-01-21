import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { format } from 'date-fns';

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Sky-500 color for MAU chart
const CHART_COLOR = '#0ea5e9';
const CHART_COLOR_LIGHT = '#7dd3fc';

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
                <p className="text-gray-900 font-semibold mb-1">
                    {format(parseLocalDate(data.month_start), 'MMMM yyyy')}
                </p>
                <p className="text-sky-600 text-sm">
                    MAU: <span className="font-bold">{data.mau?.toLocaleString()}</span>
                </p>
            </div>
        );
    }
    return null;
};

// Custom label for bar values
const CustomBarLabel = ({ x, y, width, value, maxValue }) => {
    if (!value) return null;

    const isPeak = value === maxValue;

    return (
        <text
            x={x + width / 2}
            y={y - 8}
            fill={isPeak ? CHART_COLOR : '#9CA3AF'}
            textAnchor="middle"
            fontWeight={isPeak ? 700 : 400}
            fontSize={isPeak ? 13 : 11}
        >
            {value.toLocaleString()}
        </text>
    );
};

const MAUTrendChart = ({ data }) => {
    const { chartData, maxValue } = useMemo(() => {
        if (!data || data.length === 0) {
            return { chartData: [], maxValue: 0 };
        }

        // Format data for chart
        const formatted = data.map(item => ({
            ...item,
            monthLabel: format(parseLocalDate(item.month_start), 'MMM')
        }));

        const max = Math.max(...formatted.map(d => d.mau || 0));

        return {
            chartData: formatted,
            maxValue: max
        };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
                <div className="mb-4 md:mb-6">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">Monthly Active Users</h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">MAU trend over time</p>
                </div>
                <div className="flex-grow flex items-center justify-center text-slate-400">
                    No MAU data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
            <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Monthly Active Users</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">MAU trend over time</p>
            </div>
            <div className="flex-grow min-h-[250px] md:min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 25, right: 10, left: 0, bottom: 10 }}
                        barSize={40}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                            dataKey="monthLabel"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="mau"
                            radius={[6, 6, 0, 0]}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.mau === maxValue ? CHART_COLOR : CHART_COLOR_LIGHT}
                                />
                            ))}
                            <LabelList
                                dataKey="mau"
                                position="top"
                                content={(props) => (
                                    <CustomBarLabel {...props} maxValue={maxValue} />
                                )}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MAUTrendChart;
