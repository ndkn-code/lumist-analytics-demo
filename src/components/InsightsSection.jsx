/**
 * Insights Section - Demo Version
 *
 * Displays pre-generated AI insights without calling external APIs.
 * Uses static insights based on mode (engagement, features, retention).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { generateInsights } from '../mockData/generators';

// Minimum days required for meaningful analysis
const MIN_DAYS_FOR_ANALYSIS = 3;

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to format date for display
const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper to prepare metrics from data
const prepareMetricsForDisplay = (dailyData, retentionData) => {
    if (!dailyData || dailyData.length === 0) {
        return null;
    }

    const sortedData = [...dailyData].sort((a, b) =>
        a.activity_date.localeCompare(b.activity_date)
    );

    const startDate = sortedData[0]?.activity_date || '';
    const endDate = sortedData[sortedData.length - 1]?.activity_date || '';

    const last7Days = sortedData.slice(-7);
    const previous7Days = sortedData.slice(-14, -7);

    const last7DaysAvg = last7Days.length > 0
        ? last7Days.reduce((sum, d) => sum + d.active_users, 0) / last7Days.length
        : 0;
    const previous7DaysAvg = previous7Days.length > 0
        ? previous7Days.reduce((sum, d) => sum + d.active_users, 0) / previous7Days.length
        : 0;

    const weeklyTrendPercent = previous7DaysAvg > 0
        ? ((last7DaysAvg - previous7DaysAvg) / previous7DaysAvg * 100).toFixed(1)
        : 0;

    const totalDAUSum = sortedData.reduce((sum, d) => sum + d.active_users, 0);
    const avgDAU = sortedData.length > 0 ? Math.round(totalDAUSum / sortedData.length) : 0;

    let latestRetention = null;
    if (retentionData && retentionData.length > 0) {
        const sortedRetention = [...retentionData].sort((a, b) =>
            a.week_start?.localeCompare(b.week_start)
        );
        latestRetention = sortedRetention[sortedRetention.length - 1]?.retention_rate_pct;
    }

    return {
        startDate,
        endDate,
        avgDAU,
        dataPoints: sortedData.length,
        weeklyTrend: {
            last7DaysAvg: Math.round(last7DaysAvg),
            previous7DaysAvg: Math.round(previous7DaysAvg),
            percentChange: parseFloat(weeklyTrendPercent),
        },
        retention: {
            latest: latestRetention
        }
    };
};

// Shimmer loading effect component
const ShimmerLine = ({ width = 'w-full' }) => (
    <div className={`h-4 ${width} bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded animate-pulse`} />
);

// Color palette for insight cards
const INSIGHT_COLORS = [
    { border: 'border-l-blue-500', bg: 'bg-blue-50/30' },
    { border: 'border-l-violet-500', bg: 'bg-violet-50/30' },
    { border: 'border-l-amber-500', bg: 'bg-amber-50/30' }
];

// Insight Row Component with typewriter animation
const InsightRow = ({ insight, index, shouldAnimate, delay = 0 }) => {
    const colorScheme = INSIGHT_COLORS[index % 3];

    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // Extract emoji and content from insight object
    const emoji = insight?.emoji || '💡';
    const title = insight?.title || '';
    const content = insight?.content || '';
    const fullText = title ? `${title}: ${content}` : content;

    useEffect(() => {
        if (!shouldAnimate) {
            setDisplayedText(fullText);
            setIsComplete(true);
            setHasStarted(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);
        setHasStarted(false);

        const delayTimer = setTimeout(() => {
            setHasStarted(true);
        }, delay);

        return () => clearTimeout(delayTimer);
    }, [fullText, shouldAnimate, delay]);

    useEffect(() => {
        if (!hasStarted || !shouldAnimate || !fullText) return;

        let charIndex = 0;
        const intervalId = setInterval(() => {
            if (charIndex < fullText.length) {
                setDisplayedText(fullText.slice(0, charIndex + 1));
                charIndex++;
            } else {
                setIsComplete(true);
                clearInterval(intervalId);
            }
        }, 10);

        return () => clearInterval(intervalId);
    }, [hasStarted, shouldAnimate, fullText]);

    // Render content with bold title
    const renderContent = (text) => {
        const colonIndex = text.indexOf(':');
        if (colonIndex !== -1 && colonIndex < 50) {
            return (
                <>
                    <strong className="font-semibold text-slate-800">{text.slice(0, colonIndex + 1)}</strong>{' '}
                    {text.slice(colonIndex + 1).trim()}
                </>
            );
        }
        return text;
    };

    return (
        <div className={`
            flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3
            border-l-4 ${colorScheme.border}
            shadow-[0px_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0px_6px_28px_rgba(0,0,0,0.09)]
            transition-all duration-200
        `}>
            <div className={`${colorScheme.bg} bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0`}>
                <span className="text-lg">{emoji}</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed flex-1 min-w-0">
                {shouldAnimate ? (
                    <>
                        {renderContent(displayedText)}
                        {hasStarted && !isComplete && <span className="animate-pulse text-violet-500">|</span>}
                    </>
                ) : (
                    renderContent(fullText)
                )}
            </p>
        </div>
    );
};

const InsightsSection = ({ dailyData, retentionData, rangeKey, mode = 'engagement', retentionMetrics = null }) => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(true);

    // Prepare metrics from data
    const metrics = useMemo(() => {
        if (mode === 'retention' && retentionMetrics) {
            return retentionMetrics;
        }
        return prepareMetricsForDisplay(dailyData, retentionData);
    }, [dailyData, retentionData, mode, retentionMetrics]);

    // Check if we have sufficient data
    const hasInsufficientData = useMemo(() => {
        if (mode === 'retention') {
            return !retentionMetrics || !retentionMetrics.hasData;
        }
        return !metrics || metrics.dataPoints < MIN_DAYS_FOR_ANALYSIS;
    }, [metrics, mode, retentionMetrics]);

    // Load static insights on mount
    useEffect(() => {
        if (hasInsufficientData) return;

        setLoading(true);
        setShowAnimation(true);

        // Simulate brief loading delay for realism
        const timer = setTimeout(() => {
            const staticInsights = generateInsights(mode);
            setInsights(staticInsights);
            setLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [mode, rangeKey, hasInsufficientData]);

    // Handle refresh
    const handleRefresh = () => {
        if (hasInsufficientData) return;

        setLoading(true);
        setInsights(null);
        setShowAnimation(true);

        setTimeout(() => {
            const staticInsights = generateInsights(mode);
            setInsights(staticInsights);
            setLoading(false);
        }, 1200);
    };

    // Don't render if no data
    if (mode === 'retention') {
        if (!retentionMetrics || !retentionMetrics.hasData) {
            return null;
        }
    } else {
        if (!dailyData || dailyData.length === 0) {
            return null;
        }
    }

    return (
        <div className="bg-slate-50/50 rounded-xl p-4 mb-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-100 rounded-lg">
                        <Sparkles className="w-4 h-4 text-violet-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                        AI Analysis
                    </h3>
                    <span className="text-slate-300">•</span>
                    <p className="text-xs text-slate-500">
                        {metrics ? `${formatDisplayDate(metrics.startDate)} - ${formatDisplayDate(metrics.endDate)}` : '—'}
                    </p>
                    {insights && !loading && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">
                            Demo
                        </span>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || hasInsufficientData}
                    className={`
                        p-1.5 rounded-lg transition-all duration-200
                        ${loading || hasInsufficientData
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-white text-slate-500 hover:bg-violet-50 hover:text-violet-600 shadow-sm'
                        }
                    `}
                    title="Regenerate insights"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Content */}
            <div>
                {/* Insufficient data warning */}
                {hasInsufficientData && !loading && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-700">
                            Select at least {MIN_DAYS_FOR_ANALYSIS} days for AI analysis.
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
                                <div className="bg-slate-200 w-8 h-8 rounded-full flex-shrink-0 animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <ShimmerLine width="w-full" />
                                    <ShimmerLine width="w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Insights */}
                {insights && !loading && !hasInsufficientData && Array.isArray(insights) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {insights.slice(0, 3).map((insight, index) => (
                            <InsightRow
                                key={index}
                                insight={insight}
                                index={index}
                                shouldAnimate={showAnimation}
                                delay={index * 400}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer with metrics summary */}
            {mode === 'engagement' && metrics && !loading && !hasInsufficientData && insights && (
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span>
                            Avg DAU: <span className="font-semibold text-slate-700">{metrics.avgDAU}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                            Trend:
                            <span className={`font-semibold ${metrics.weeklyTrend.percentChange >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                                {' '}{metrics.weeklyTrend.percentChange >= 0 ? '+' : ''}{metrics.weeklyTrend.percentChange}%
                            </span>
                        </span>
                        {metrics.retention?.latest && (
                            <>
                                <span className="text-slate-300">•</span>
                                <span>
                                    Retention: <span className="font-semibold text-slate-700">{metrics.retention.latest.toFixed(0)}%</span>
                                </span>
                            </>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400">
                            {metrics.dataPoints} days
                        </span>
                    </div>
                </div>
            )}

            {/* Retention mode footer */}
            {mode === 'retention' && retentionMetrics && !loading && !hasInsufficientData && insights && (
                <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span>
                            D1: <span className="font-semibold text-slate-700">{retentionMetrics.d1_retention?.toFixed(1) || 0}%</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                            D7: <span className="font-semibold text-slate-700">{retentionMetrics.d7_retention?.toFixed(1) || 0}%</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                            D30: <span className="font-semibold text-slate-700">{retentionMetrics.d30_retention?.toFixed(1) || 0}%</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                            Total: <span className="font-semibold text-slate-700">{retentionMetrics.total_users?.toLocaleString() || 0} users</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InsightsSection;
