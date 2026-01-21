import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import InsightsSection from './InsightsSection';
import AssessmentDeepDive from './AssessmentDeepDive';

// Helper to parse YYYY-MM-DD string as local date (avoids timezone shift)
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to get today's date as YYYY-MM-DD string in local time
const getLocalTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper to convert Date to YYYY-MM-DD string (avoids timezone issues)
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

import { Loader2, BookOpen, Database, Eye, EyeOff, LayoutGrid, ClipboardCheck } from 'lucide-react';

// Tab configuration for deep dive navigation
// Only showing completed features - Brain Teaser and Ask AI hidden until ready
const FEATURE_TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'assessment', label: 'Assessment', icon: ClipboardCheck },
];

// Tab Button Component - Premium pill style
const TabButton = ({ tab, isActive, onClick }) => {
    const Icon = tab.icon;

    return (
        <button
            onClick={() => onClick(tab.id)}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 ease-in-out
                ${isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
                }
            `}
        >
            <Icon size={16} />
            <span>{tab.label}</span>
        </button>
    );
};
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';

// Modern color palette that blends with Purple/Light UI
// Enhanced with Tailwind color classes for tinted chip backgrounds
const FEATURE_CONFIG = {
    'Assessment': {
        color: '#0EA5E9',
        label: 'Assessment',
        bgActive: 'bg-sky-50',
        textActive: 'text-sky-700',
        borderActive: 'border-sky-200'
    },
    'Brain Teaser': {
        color: '#8B5CF6',
        label: 'Brain Teaser',
        bgActive: 'bg-violet-50',
        textActive: 'text-violet-700',
        borderActive: 'border-violet-200'
    },
    'Ask AI': {
        color: '#F59E0B',
        label: 'Ask AI',
        bgActive: 'bg-amber-50',
        textActive: 'text-amber-700',
        borderActive: 'border-amber-200'
    },
    'Session Review': {
        color: '#EC4899',
        label: 'Session Review',
        bgActive: 'bg-pink-50',
        textActive: 'text-pink-700',
        borderActive: 'border-pink-200'
    },
    'Collection Import': {
        color: '#10B981',
        label: 'Collection Import',
        bgActive: 'bg-emerald-50',
        textActive: 'text-emerald-700',
        borderActive: 'border-emerald-200'
    },
    'Words Added to Collection': {
        color: '#F43F5E',
        label: 'Words Added to Collection',
        bgActive: 'bg-rose-50',
        textActive: 'text-rose-700',
        borderActive: 'border-rose-200'
    },
    'AI Planner': {
        color: '#6366F1',
        label: 'AI Planner',
        bgActive: 'bg-indigo-50',
        textActive: 'text-indigo-700',
        borderActive: 'border-indigo-200'
    }
};

// Features from SQL that should be merged into 'AI Planner'
const AI_PLANNER_SOURCE_FEATURES = ['Study Plan (Gen)', 'Study Plan (Comp)'];

// Mapping from SQL feature names to display names (for features that need renaming)
const FEATURE_NAME_MAPPING = {
    'Word Added': 'Words Added to Collection'
};

const LIFETIME_FEATURE_MAPPING = {
    'vocabularyWordsLimit': 'Words Added to Collection',
    'errorBankCapacity': 'Error Logged'
};

const LIFETIME_FEATURES_KEYS = ['vocabularyWordsLimit', 'errorBankCapacity'];

// Custom Tooltip for Line Chart - Shows AI Planner breakdown
const CustomLineTooltip = ({ active, payload, label, aiPlannerBreakdown }) => {
    if (!active || !payload || payload.length === 0) return null;

    // Get the breakdown data for the current date
    const dateKey = label;
    const breakdown = aiPlannerBreakdown?.[dateKey] || { gen: 0, comp: 0 };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
            <p className="text-gray-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            <div className="space-y-1">
                {payload.map((entry, index) => {
                    const isAIPlanner = entry.dataKey === 'AI Planner';
                    return (
                        <div key={index}>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-gray-700 text-sm">
                                    {entry.name}: <span className="font-semibold">{entry.value} Users</span>
                                </span>
                            </div>
                            {/* Show breakdown for AI Planner */}
                            {isAIPlanner && (breakdown.gen > 0 || breakdown.comp > 0) && (
                                <div className="ml-5 mt-1 space-y-0.5 text-xs text-gray-500">
                                    <div>↳ Generated: {breakdown.gen}</div>
                                    <div>↳ Completed: {breakdown.comp}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Custom Tooltip for Area Chart - Light theme
const CustomAreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const totalUsageForDay = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
            <p className="text-gray-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            <div className="space-y-1">
                {payload.map((entry, index) => {
                    const percentage = ((entry.value / totalUsageForDay) * 100).toFixed(1);
                    return (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-700 text-sm">
                                {entry.name}: {percentage}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Helper function to calculate min/max for all features dynamically
const calculateFeatureExtremes = (chartData, featureKeys) => {
    const extremes = {};

    featureKeys.forEach(feature => {
        const values = chartData
            .map(day => day[feature])
            .filter(val => val !== undefined && val !== null);

        if (values.length > 0) {
            extremes[feature] = {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        }
    });

    return extremes;
};

// Custom Dot component for min/max highlighting
const MinMaxDot = ({ cx, cy, payload, dataKey, extremes }) => {
    const value = payload[dataKey];
    if (!extremes || value === undefined) return null;

    // Hide dot for zero values to keep bottom axis clean
    if (value === 0) return null;

    const isExtreme = value === extremes.max || value === extremes.min;
    if (!isExtreme) return null;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={6}
            fill={FEATURE_CONFIG[dataKey]?.color || '#8884d8'}
            stroke="white"
            strokeWidth={2}
        />
    );
};

// Custom Label component for min/max values
const MinMaxLabel = ({ x, y, value, dataKey, extremes }) => {
    if (!extremes || value === undefined) return null;

    // Hide label for zero values to prevent clutter at bottom axis
    if (value === 0) return null;

    const isMax = value === extremes.max;
    const isMin = value === extremes.min;

    if (!isMax && !isMin) return null;

    // Vertical offset: -15 for max (above), +20 for min (below, avoiding X-axis overlap)
    const yOffset = isMax ? -15 : 20;

    return (
        <text
            x={x}
            y={y + yOffset}
            fill={FEATURE_CONFIG[dataKey]?.color || '#8884d8'}
            fontSize={11}
            fontWeight="bold"
            textAnchor="middle"
        >
            {isMax ? '↑' : '↓'} {value}
        </text>
    );
};

// Feature Toggle Button Component - Tinted Chips Style (Linear/Stripe aesthetic)
const FeatureToggle = ({ feature, config, isVisible, onToggle }) => {
    return (
        <button
            onClick={() => onToggle(feature)}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 ease-in-out border
                ${isVisible
                    ? `${config.bgActive} ${config.textActive} ${config.borderActive}`
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }
            `}
        >
            {isVisible ? (
                <Eye size={14} />
            ) : (
                <EyeOff size={14} />
            )}
            <span>{config.label}</span>
        </button>
    );
};

// Custom label for pie chart slices
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for very small slices

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight="bold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const FeatureAdoption = () => {
    const { dateRange, DateRangeFilterComponent } = useOutletContext();
    const [startDate, endDate] = dateRange;
    const [timeSeriesData, setTimeSeriesData] = useState([]);
    const [lifetimeData, setLifetimeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Deep dive tab state - controls which view is shown
    const [activeFeatureTab, setActiveFeatureTab] = useState('overview');

    // Feature visibility state - initialize with all features EXCEPT Assessment
    // Assessment is hidden by default as it's less relevant for daily analysis
    const [visibleFeatures, setVisibleFeatures] = useState(() =>
        Object.keys(FEATURE_CONFIG).filter(key => key !== 'Assessment')
    );

    // Toggle feature visibility
    const toggleFeature = (feature) => {
        setVisibleFeatures(prev => {
            if (prev.includes(feature)) {
                // Don't allow hiding all features
                if (prev.length === 1) return prev;
                return prev.filter(f => f !== feature);
            } else {
                return [...prev, feature];
            }
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);
            try {
                // Use string-based date comparison to avoid timezone bleed
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Request A: Fetch from daily_feature_adoption (New View) for Main Charts
                const timeSeriesPromise = supabase
                    .from('daily_feature_adoption')
                    .select('*')
                    .gte('usage_date', startDateString)
                    .lte('usage_date', endDateString)
                    .order('usage_date', { ascending: true });

                // Request B: Fetch from daily_feature_usage (Old View) for Lifetime Cards
                const lifetimePromise = supabase
                    .from('daily_feature_usage')
                    .select('*')
                    .in('feature_type', LIFETIME_FEATURES_KEYS);

                const [timeSeriesResponse, lifetimeResponse] = await Promise.all([
                    timeSeriesPromise,
                    lifetimePromise
                ]);

                if (timeSeriesResponse.error) throw timeSeriesResponse.error;
                if (lifetimeResponse.error) throw lifetimeResponse.error;

                const timeSeriesResult = timeSeriesResponse.data || [];
                setTimeSeriesData(timeSeriesResult);
                setLifetimeData(lifetimeResponse.data || []);
                // Note: visibleFeatures is now initialized with defaults in useState
                // No need to override based on data - user controls visibility via toggles

            } catch (err) {
                console.error('Error fetching feature data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Process data for charts and KPIs
    const {
        chartData,
        timeSeriesFeatures,
        lifetimeStats,
        summaryData,
        filteredSummaryData,
        featureExtremes,
        totalUsage,
        filteredTotalUsage,
        aiPlannerBreakdown,
        featureInsightsData
    } = useMemo(() => {
        // Step 1: Group by date and apply feature name transformations
        const groupedByDate = {};
        const aiPlannerBreakdownMap = {}; // Stores { date: { gen: X, comp: Y } }

        timeSeriesData.forEach(curr => {
            const date = curr.usage_date;
            if (!groupedByDate[date]) {
                groupedByDate[date] = { usage_date: date };
            }

            let featureName = curr.feature_type;
            const usage = curr.total_usage || 0;

            // Check if this is an AI Planner source feature
            if (AI_PLANNER_SOURCE_FEATURES.includes(featureName)) {
                // Initialize breakdown for this date
                if (!aiPlannerBreakdownMap[date]) {
                    aiPlannerBreakdownMap[date] = { gen: 0, comp: 0 };
                }
                // Store breakdown
                if (featureName === 'Study Plan (Gen)') {
                    aiPlannerBreakdownMap[date].gen += usage;
                } else if (featureName === 'Study Plan (Comp)') {
                    aiPlannerBreakdownMap[date].comp += usage;
                }
                // Merge into AI Planner
                featureName = 'AI Planner';
            } else if (FEATURE_NAME_MAPPING[featureName]) {
                // Apply renaming (e.g., 'Word Added' -> 'Words Added to Collection')
                featureName = FEATURE_NAME_MAPPING[featureName];
            }

            groupedByDate[date][featureName] = (groupedByDate[date][featureName] || 0) + usage;
        });

        // Sort by date string (YYYY-MM-DD format sorts correctly as strings)
        const rawChartData = Object.values(groupedByDate).sort((a, b) => a.usage_date.localeCompare(b.usage_date));

        // Step 1.5: Include all data up to and including today (exclude future dates only)
        // User wants to see today's data even if incomplete
        const todayString = getLocalTodayString();
        const chartData = rawChartData.filter(item => {
            // String comparison: include today, exclude future dates
            return item.usage_date <= todayString;
        });

        // Step 2: Extract unique feature names (after transformation)
        const allFeatureNames = new Set();
        chartData.forEach(day => {
            Object.keys(day).forEach(key => {
                if (key !== 'usage_date') allFeatureNames.add(key);
            });
        });
        const timeSeriesFeatures = [...allFeatureNames].filter(f => FEATURE_CONFIG[f]);

        // Step 3: Process Summary Data for Pie Chart (using transformed names)
        const summaryMap = {};
        chartData.forEach(day => {
            Object.entries(day).forEach(([key, value]) => {
                if (key !== 'usage_date' && FEATURE_CONFIG[key]) {
                    summaryMap[key] = (summaryMap[key] || 0) + value;
                }
            });
        });

        const summaryData = Object.entries(summaryMap).map(([name, value]) => ({ name, value }));
        const totalUsage = summaryData.reduce((sum, item) => sum + item.value, 0);

        // Filtered summary data based on visible features
        const filteredSummaryData = summaryData.filter(item => visibleFeatures.includes(item.name));
        const filteredTotalUsage = filteredSummaryData.reduce((sum, item) => sum + item.value, 0);

        // Step 4: Process Lifetime Data (Request B)
        const lifetimeStatsAggregated = lifetimeData.reduce((acc, curr) => {
            const featureName = LIFETIME_FEATURE_MAPPING[curr.feature_type] || curr.feature_type;
            acc[featureName] = (acc[featureName] || 0) + curr.total_usage;
            return acc;
        }, {});

        // Step 5: Calculate feature extremes dynamically (only for visible features)
        const visibleTimeSeriesFeatures = timeSeriesFeatures.filter(f => visibleFeatures.includes(f));
        const featureExtremes = calculateFeatureExtremes(chartData, visibleTimeSeriesFeatures);

        // Step 6: Prepare data for AI Insights (feature adoption mode)
        // Transform chart data to a format InsightsSection can work with
        const featureInsightsData = chartData.map(day => {
            // Calculate total feature usage for the day
            const totalDayUsage = Object.entries(day)
                .filter(([key]) => key !== 'usage_date' && FEATURE_CONFIG[key])
                .reduce((sum, [, value]) => sum + value, 0);

            // Find top feature for this day
            let topFeature = null;
            let topValue = 0;
            Object.entries(day).forEach(([key, value]) => {
                if (key !== 'usage_date' && FEATURE_CONFIG[key] && value > topValue) {
                    topFeature = key;
                    topValue = value;
                }
            });

            return {
                activity_date: day.usage_date,
                active_users: totalDayUsage, // Total feature interactions for AI context
                day_of_week: format(parseLocalDate(day.usage_date), 'EEEE'),
                // Feature-specific data for AI
                feature_breakdown: Object.entries(day)
                    .filter(([key]) => key !== 'usage_date' && FEATURE_CONFIG[key])
                    .map(([name, value]) => ({ name, value })),
                top_feature: topFeature,
                top_feature_value: topValue
            };
        });

        return {
            chartData,
            timeSeriesFeatures,
            lifetimeStats: lifetimeStatsAggregated,
            summaryData,
            filteredSummaryData,
            totalUsage,
            filteredTotalUsage,
            featureExtremes,
            aiPlannerBreakdown: aiPlannerBreakdownMap,
            featureInsightsData
        };
    }, [timeSeriesData, lifetimeData, visibleFeatures]);

    if (loading && timeSeriesData.length === 0 && lifetimeData.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-violet-600">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Page Header - Title + Date Filter aligned */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Feature Adoption</h1>
                {DateRangeFilterComponent}
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                    Error: {error}
                </div>
            )}

            {/* Deep Dive Tab Navigation */}
            <div className="flex flex-wrap gap-2">
                {FEATURE_TABS.map((tab) => (
                    <TabButton
                        key={tab.id}
                        tab={tab}
                        isActive={activeFeatureTab === tab.id}
                        onClick={setActiveFeatureTab}
                    />
                ))}
            </div>

            {/* Conditional Content Based on Active Tab */}
            {activeFeatureTab === 'overview' && (
                <>
                    {/* AI Insights Section - Feature Adoption Mode */}
                    <InsightsSection
                        dailyData={featureInsightsData}
                        retentionData={null}
                        rangeKey={`${toDateString(startDate)}_${toDateString(endDate)}`}
                        mode="features"
                    />

                    {/* Feature Visibility Toggle Bar - Premium tinted chips */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                            <span className="text-sm font-medium text-slate-500">Filter:</span>
                            <div className="flex flex-wrap gap-2">
                                {timeSeriesFeatures
                                    .filter(feature => FEATURE_CONFIG[feature])
                                    .map((feature) => (
                                        <FeatureToggle
                                            key={feature}
                                            feature={feature}
                                            config={FEATURE_CONFIG[feature]}
                                            isVisible={visibleFeatures.includes(feature)}
                                            onToggle={toggleFeature}
                                        />
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Daily Feature Usage (Hero Line Chart) with Rich Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                {/* Rich Header: Title + Mini Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-slate-800 tracking-tight">Daily Feature Usage</h3>
                    {/* Mini Stats Row */}
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-violet-500" />
                            <span className="text-sm text-slate-500">Vocabulary:</span>
                            <span className="text-lg font-bold text-slate-800">{(lifetimeStats['Words Added to Collection'] || 0).toLocaleString()}</span>
                        </div>
                        <div className="hidden md:block h-5 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-violet-500" />
                            <span className="text-sm text-slate-500">Errors:</span>
                            <span className="text-lg font-bold text-slate-800">{(lifetimeStats['Error Logged'] || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className="h-[250px] md:h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 15, right: 20, left: 15, bottom: 5 }}>
                            <defs>
                                {timeSeriesFeatures.map(feature => (
                                    <linearGradient key={`gradient-${feature}`} id={`color${feature.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={FEATURE_CONFIG[feature]?.color || '#8884d8'} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={FEATURE_CONFIG[feature]?.color || '#8884d8'} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis
                                dataKey="usage_date"
                                stroke="#94A3B8"
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => format(parseLocalDate(value), 'MMM d')}
                                interval="preserveStartEnd"
                                minTickGap={50}
                                tickMargin={10}
                            />
                            <YAxis
                                stroke="#94A3B8"
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                                padding={{ top: 30, bottom: 10 }}
                            />
                            <Tooltip
                                content={<CustomLineTooltip aiPlannerBreakdown={aiPlannerBreakdown} />}
                            />
                            {timeSeriesFeatures
                                .filter(feature => visibleFeatures.includes(feature))
                                .map((feature) => (
                                    <Line
                                        key={feature}
                                        type="monotone"
                                        dataKey={feature}
                                        stroke={FEATURE_CONFIG[feature]?.color || '#8884d8'}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0, fill: FEATURE_CONFIG[feature]?.color || '#8884d8' }}
                                    />
                                ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Section 3: Bottom Row (50/50 Split) - Premium styling */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Feature Usage Distribution (Area Chart) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-3">Feature Usage Distribution</h3>
                    <div className="h-[200px] md:h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} stackOffset="expand">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis
                                    dataKey="usage_date"
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 12, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => format(parseLocalDate(value), 'MMM d')}
                                    interval="preserveStartEnd"
                                    minTickGap={50}
                                    tickMargin={10}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 12, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                />
                                <Tooltip content={<CustomAreaTooltip />} />
                                {timeSeriesFeatures
                                    .filter(feature => visibleFeatures.includes(feature))
                                    .map((feature) => (
                                        <Area
                                            key={feature}
                                            type="monotone"
                                            dataKey={feature}
                                            stackId="1"
                                            stroke={FEATURE_CONFIG[feature]?.color || '#8884d8'}
                                            fill={FEATURE_CONFIG[feature]?.color || '#8884d8'}
                                            fillOpacity={0.8}
                                        />
                                    ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Total Feature Share (Donut Chart) - Thinner ring, right legend */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-3">Total Feature Share</h3>
                    <div className="h-[200px] md:h-[250px] w-full flex items-center">
                        {/* Donut Chart with Center Text */}
                        <div className="relative flex-shrink-0" style={{ width: '180px', height: '180px' }}>
                            {/* Center text overlay */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                <span className="text-3xl font-bold text-slate-800">{filteredTotalUsage.toLocaleString()}</span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Total</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={filteredSummaryData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={2}
                                        labelLine={false}
                                    >
                                        {filteredSummaryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={FEATURE_CONFIG[entry.name]?.color || '#8884d8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value, name) => [`${((value / filteredTotalUsage) * 100).toFixed(1)}%`, name]}
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            borderColor: '#E2E8F0',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            color: '#1E293B'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Right-side Legend */}
                        <div className="flex-1 pl-4 space-y-1.5">
                            {filteredSummaryData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: FEATURE_CONFIG[entry.name]?.color || '#8884d8' }}
                                    />
                                    <span className="text-xs text-slate-600 truncate flex-1">{entry.name}</span>
                                    <span className="text-xs font-semibold text-slate-800">
                                        {((entry.value / filteredTotalUsage) * 100).toFixed(0)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
                </>
            )}

            {/* Assessment Deep Dive Tab */}
            {activeFeatureTab === 'assessment' && (
                <AssessmentDeepDive dateRange={dateRange} />
            )}
        </div>
    );
};

export default FeatureAdoption;
