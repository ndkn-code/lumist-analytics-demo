import React, { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

// Helper to parse YYYY-MM-DD string as local date (avoids timezone shift)
// "2025-11-30" -> Date object representing Nov 30 in local time
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to get today's date as YYYY-MM-DD string in local time
const getLocalTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Primary chart color (matches brand violet)
const CHART_COLOR = '#8B5CF6';

// Beta launch date for annotation
const BETA_LAUNCH_DATE = '2025-11-09';

// SAT test date for annotation
const SAT_DEC_DATE = '2025-12-06';

// Custom SVG label component for the beta launch annotation
const BetaLaunchLabel = ({ viewBox }) => {
    const { x, y } = viewBox;
    const labelX = x + 8;
    const labelY = y + 16;

    return (
        <g>
            {/* Pill background */}
            <rect
                x={labelX}
                y={labelY - 12}
                width={86}
                height={20}
                rx={10}
                fill="#ECFDF5"
                stroke="#10B981"
                strokeWidth={1}
            />
            {/* Label text */}
            <text
                x={labelX + 43}
                y={labelY + 2}
                textAnchor="middle"
                fill="#059669"
                fontSize={10}
                fontWeight={600}
            >
                VN Open Beta
            </text>
        </g>
    );
};

// Custom SVG label component for the SAT date annotation
const SATDateLabel = ({ viewBox }) => {
    const { x, y } = viewBox;
    const labelX = x + 8;
    const labelY = y + 40; // Offset lower to avoid overlap with beta label

    return (
        <g>
            {/* Pill background */}
            <rect
                x={labelX}
                y={labelY - 12}
                width={70}
                height={20}
                rx={10}
                fill="#ECFDF5"
                stroke="#10B981"
                strokeWidth={1}
            />
            {/* Label text */}
            <text
                x={labelX + 35}
                y={labelY + 2}
                textAnchor="middle"
                fill="#059669"
                fontSize={10}
                fontWeight={600}
            >
                Dec 6 SAT
            </text>
        </g>
    );
};

// Light theme custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
                <p className="text-gray-900 font-semibold mb-1">{format(parseLocalDate(label), 'MMM dd, yyyy')}</p>
                <p className="text-violet-600 text-sm">
                    Active Users: <span className="font-bold">{payload[0].value}</span>
                </p>
                <p className="text-gray-500 text-xs mt-1">
                    {payload[0].payload.day_of_week}
                </p>
            </div>
        );
    }
    return null;
};

// Custom Dot component for min/max highlighting (matches FeatureAdoption style)
const MinMaxDot = ({ cx, cy, payload, minValue, maxValue }) => {
    const value = payload?.active_users;
    if (value === undefined || cx === undefined || cy === undefined) return null;

    // Hide dot for zero values to keep bottom axis clean
    if (value === 0) return null;

    const isExtreme = value === maxValue || value === minValue;
    if (!isExtreme) return null;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={6}
            fill={CHART_COLOR}
            stroke="white"
            strokeWidth={2}
        />
    );
};

// Custom Label component for min/max values (matches FeatureAdoption style)
const MinMaxLabel = ({ x, y, value, minValue, maxValue }) => {
    if (value === undefined || x === undefined || y === undefined) return null;

    // Hide label for zero values to prevent clutter at bottom axis
    if (value === 0) return null;

    const isMax = value === maxValue;
    const isMin = value === minValue;

    if (!isMax && !isMin) return null;

    // Vertical offset: -15 for max (above), +20 for min (below, avoiding X-axis overlap)
    const yOffset = isMax ? -15 : 20;

    return (
        <text
            x={x}
            y={y + yOffset}
            fill={CHART_COLOR}
            fontSize={11}
            fontWeight="bold"
            textAnchor="middle"
        >
            {isMax ? '↑' : '↓'} {value}
        </text>
    );
};

// Delta Badge component for showing percentage change
const DeltaBadge = ({ value }) => {
    if (value === null || value === undefined) return null;

    const isPositive = value >= 0;
    const formattedValue = Math.abs(value).toFixed(1);

    return (
        <span className={`
            inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold
            ${isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }
        `}>
            {isPositive ? '↑' : '↓'} {formattedValue}%
        </span>
    );
};

const TrafficTrendChart = ({ data, averageDAU, averageDAUDelta, peakDAU, peakDAUDate }) => {
    // Filter out incomplete current day data and calculate min/max
    const { cleanData, minValue, maxValue, hasBetaLaunch, hasSATDate } = useMemo(() => {
        if (!data || data.length === 0) {
            return { cleanData: [], minValue: 0, maxValue: 0, hasBetaLaunch: false, hasSATDate: false };
        }

        // Include all data up to and including today
        // User wants to see today's data even if incomplete
        const todayString = getLocalTodayString();
        const filtered = data.filter(d => d.activity_date <= todayString);

        // Calculate min/max from clean data (excluding zeros)
        const nonZeroValues = filtered.map(d => d.active_users).filter(v => v > 0);
        const min = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
        const max = nonZeroValues.length > 0 ? Math.max(...nonZeroValues) : 0;

        // Check if beta launch date is within the data range
        const hasBeta = filtered.some(d => d.activity_date === BETA_LAUNCH_DATE);

        // Check if SAT date is within the data range
        const hasSAT = filtered.some(d => d.activity_date === SAT_DEC_DATE);

        return {
            cleanData: filtered,
            minValue: min,
            maxValue: max,
            hasBetaLaunch: hasBeta,
            hasSATDate: hasSAT
        };
    }, [data]);

    // Format peak date for display
    const formattedPeakDate = peakDAUDate
        ? format(parseLocalDate(peakDAUDate), 'MMM d')
        : null;

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col">
            {/* Rich Header with Title and Metrics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                {/* Left Side: Title */}
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Daily Active Users</h3>

                {/* Right Side: Metrics */}
                <div className="flex items-center gap-6">
                    {/* Average DAU Metric */}
                    <div className="flex items-center gap-2">
                        <div>
                            <p className="text-xs text-gray-500">Average</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-900">{averageDAU?.toLocaleString() || '0'}</p>
                        </div>
                        <DeltaBadge value={averageDAUDelta} />
                    </div>

                    {/* Divider */}
                    <div className="h-10 w-px bg-gray-200 hidden md:block" />

                    {/* Peak DAU Metric */}
                    <div>
                        <p className="text-xs text-gray-500">Peak</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl md:text-2xl font-bold text-gray-900">{peakDAU?.toLocaleString() || '0'}</p>
                            {formattedPeakDate && (
                                <span className="text-xs text-gray-500">{formattedPeakDate}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-full">
                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={cleanData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                            dataKey="activity_date"
                            tickFormatter={(str) => format(parseLocalDate(str), 'MMM d')}
                            stroke="#6B7280"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            minTickGap={50}
                            tickMargin={10}
                        />
                        <YAxis
                            stroke="#6B7280"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                            domain={['auto', 'auto']}
                            padding={{ top: 30, bottom: 10 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {/* Beta Launch Annotation - only show if date is in range */}
                        {hasBetaLaunch && (
                            <ReferenceLine
                                x={BETA_LAUNCH_DATE}
                                stroke="#10B981"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={<BetaLaunchLabel />}
                            />
                        )}
                        {/* SAT Date Annotation - only show if date is in range */}
                        {hasSATDate && (
                            <ReferenceLine
                                x={SAT_DEC_DATE}
                                stroke="#10B981"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={<SATDateLabel />}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="active_users"
                            stroke="none"
                            fillOpacity={1}
                            fill="url(#trafficGradient)"
                        />
                        <Line
                            type="monotone"
                            dataKey="active_users"
                            stroke={CHART_COLOR}
                            strokeWidth={3}
                            dot={(props) => <MinMaxDot {...props} minValue={minValue} maxValue={maxValue} />}
                            activeDot={{ r: 6, strokeWidth: 0, fill: CHART_COLOR }}
                            label={(props) => <MinMaxLabel {...props} minValue={minValue} maxValue={maxValue} />}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TrafficTrendChart;
