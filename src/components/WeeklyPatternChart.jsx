import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';

// Helper to get day name from YYYY-MM-DD string using strict UTC interpretation
// This prevents timezone shifts that cause off-by-one day errors
// e.g., '2025-11-24' -> 'Monday' (always, regardless of user's timezone)
const getDayNameUTC = (dateString) => {
    // Append 'T00:00:00Z' to force UTC interpretation
    const date = new Date(dateString + 'T00:00:00Z');
    // Use UTC timezone to get the day name
    return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
};

// Sophisticated monochromatic color palette
// Goal: Chart looks unified at a glance, only extremes subtly stand out
const COLORS = {
    peak: '#7C3AED',     // Deep Violet - Primary brand, draws attention to best day
    low: '#FCA5A5',      // Soft Pastel Red - Clear low-traffic indicator without alarm
    base: '#C4B5FD',     // Light Violet - Soft secondary, blends into background
    labelDefault: '#9CA3AF' // Gray - Default label color
};

// Custom Bar Label Component with conditional formatting
// Labels match the visual intensity of their corresponding bars
const CustomBarLabel = ({ x, y, width, value, maxValue, minValue }) => {
    if (value === 0) return null;

    // Determine styling based on value
    const isPeak = value === maxValue;
    const isLow = value === minValue;

    let fill = COLORS.labelDefault;
    let fontWeight = 400;
    let fontSize = 11;

    if (isPeak) {
        fill = COLORS.peak;
        fontWeight = 700;
        fontSize = 13;
    } else if (isLow) {
        fill = COLORS.low;
        fontWeight = 700;
        fontSize = 12;
    }

    return (
        <text
            x={x + width / 2}
            y={y - 8}
            fill={fill}
            textAnchor="middle"
            fontWeight={fontWeight}
            fontSize={fontSize}
        >
            {value}
        </text>
    );
};

const WeeklyPatternChart = ({ data, globalAverage }) => {
    const { weeklyData, maxValue, minValue } = useMemo(() => {
        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Initialize accumulator
        const dayStats = daysOrder.reduce((acc, day) => {
            acc[day] = { total: 0, count: 0 };
            return acc;
        }, {});

        data.forEach(item => {
            // ALWAYS calculate day of week from activity_date using UTC
            // This prevents timezone shifts that cause off-by-one day errors
            if (!item.activity_date) return;

            // Use strict UTC interpretation to get accurate day name
            const dayName = getDayNameUTC(item.activity_date);

            // Match against our daysOrder
            const match = daysOrder.find(d => d.toLowerCase() === dayName.toLowerCase());
            if (match) {
                dayStats[match].total += item.active_users;
                dayStats[match].count += 1;
            }
        });

        const processedData = daysOrder.map(day => {
            const { total, count } = dayStats[day];
            return {
                name: day.substring(0, 3), // Mon, Tue
                fullDay: day,
                average: count > 0 ? Math.round(total / count) : 0
            };
        });

        // Calculate min/max for bar coloring (per-day averages)
        const values = processedData.map(d => d.average).filter(v => v > 0);
        const max = values.length > 0 ? Math.max(...values) : 0;
        const min = values.length > 0 ? Math.min(...values) : 0;

        return {
            weeklyData: processedData,
            maxValue: max,
            minValue: min
        };
    }, [data]);

    // Use globalAverage from parent (single source of truth) for the reference line
    const averageValue = globalAverage || 0;

    // Get bar color based on value - sophisticated monochromatic approach
    const getBarColor = (value) => {
        if (value === 0) return COLORS.base;
        if (value === maxValue) return COLORS.peak;
        if (value === minValue) return COLORS.low;
        return COLORS.base;
    };

    // Custom tooltip - clean and minimal
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const value = data.average;
            const color = getBarColor(value);
            const isPeak = value === maxValue;
            const isLow = value === minValue;

            return (
                <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{data.fullDay}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-gray-600">
                            {value} <span className="text-gray-400">avg</span>
                        </span>
                    </div>
                    {(isPeak || isLow) && (
                        <p className="text-[10px] mt-1.5 font-medium uppercase tracking-wide" style={{ color }}>
                            {isPeak ? 'Peak Day' : 'Lowest Day'}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
            <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Weekly Engagement</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Average DAU (Selected Range)</p>
            </div>
            {/* No legend - direct labeling on bars and reference line makes it redundant */}
            <div className="flex-grow min-h-[250px] md:min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={weeklyData}
                        margin={{ top: 20, right: 50, left: 10, bottom: 10 }}
                        barSize={32}
                    >
                        {/* Reference line with inline label */}
                        <ReferenceLine
                            y={averageValue}
                            stroke="#E5E7EB"
                            strokeWidth={1}
                            label={{
                                position: 'right',
                                value: `Avg ${averageValue}`,
                                fill: '#9CA3AF',
                                fontSize: 11
                            }}
                        />
                        <XAxis
                            dataKey="name"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(124, 58, 237, 0.05)' }}
                        />
                        <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                            {weeklyData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={getBarColor(entry.average)}
                                />
                            ))}
                            <LabelList
                                dataKey="average"
                                position="top"
                                content={(props) => (
                                    <CustomBarLabel
                                        {...props}
                                        maxValue={maxValue}
                                        minValue={minValue}
                                    />
                                )}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WeeklyPatternChart;
