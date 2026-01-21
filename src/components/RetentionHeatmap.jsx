import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day || 1);
};

// Get color class based on retention rate
const getRetentionColor = (rate, isWeekZero = false) => {
    if (rate === null || rate === undefined) return 'bg-slate-50 text-slate-400';
    if (isWeekZero) return 'bg-violet-800 text-white';

    if (rate >= 75) return 'bg-violet-700 text-white';
    if (rate >= 50) return 'bg-violet-500 text-white';
    if (rate >= 35) return 'bg-violet-400 text-white';
    if (rate >= 20) return 'bg-violet-300 text-violet-900';
    if (rate >= 10) return 'bg-violet-200 text-violet-800';
    if (rate > 0) return 'bg-violet-100 text-violet-700';
    return 'bg-slate-100 text-slate-500';
};

const RetentionHeatmap = () => {
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
                    .order('cohort_month', { ascending: true })
                    .order('week_number', { ascending: true });

                if (err) throw err;
                setData(result || []);
            } catch (err) {
                console.error('Error fetching cohort retention:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process data into a matrix structure
    const { cohorts, weekNumbers, matrix } = useMemo(() => {
        if (!data || data.length === 0) {
            return { cohorts: [], weekNumbers: [], matrix: {} };
        }

        // Get unique cohort months and week numbers
        const cohortSet = new Set();
        const weekSet = new Set();

        data.forEach(item => {
            cohortSet.add(item.cohort_month);
            weekSet.add(item.week_number);
        });

        const sortedCohorts = Array.from(cohortSet).sort();
        const sortedWeeks = Array.from(weekSet).sort((a, b) => a - b);

        // Build matrix: { cohort_month: { week_number: retention_rate } }
        const matrixData = {};
        data.forEach(item => {
            if (!matrixData[item.cohort_month]) {
                matrixData[item.cohort_month] = {};
            }
            matrixData[item.cohort_month][item.week_number] = {
                rate: item.retention_rate,
                retained: item.retained_users,
                cohortSize: item.cohort_size
            };
        });

        return {
            cohorts: sortedCohorts,
            weekNumbers: sortedWeeks,
            matrix: matrixData
        };
    }, [data]);

    if (loading) {
        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-center py-16 text-violet-600">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm">
                Failed to load cohort retention data
            </div>
        );
    }

    if (cohorts.length === 0) {
        return (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="text-center py-12 text-slate-500">
                    No cohort retention data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Cohort Retention Heatmap</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Weekly retention by signup month</p>
            </div>

            {/* Scrollable container for mobile */}
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                <div className="min-w-[600px]">
                    {/* Header row with week numbers */}
                    <div className="flex gap-1 mb-1">
                        <div className="w-20 md:w-24 flex-shrink-0 text-xs font-medium text-slate-500 py-2">
                            Cohort
                        </div>
                        {weekNumbers.map(week => (
                            <div
                                key={week}
                                className={`flex-1 min-w-[48px] text-center text-xs font-medium py-2 ${
                                    week === 0 ? 'text-violet-700' : 'text-slate-500'
                                }`}
                            >
                                W{week}
                            </div>
                        ))}
                    </div>

                    {/* Data rows */}
                    {cohorts.map(cohort => (
                        <div key={cohort} className="flex gap-1 mb-1">
                            {/* Cohort label */}
                            <div className="w-20 md:w-24 flex-shrink-0 text-xs font-medium text-slate-700 py-2 truncate">
                                {format(parseLocalDate(cohort), 'MMM yyyy')}
                            </div>

                            {/* Retention cells */}
                            {weekNumbers.map(week => {
                                const cellData = matrix[cohort]?.[week];
                                const rate = cellData?.rate;
                                const isWeekZero = week === 0;
                                const hasData = rate !== null && rate !== undefined;

                                return (
                                    <div
                                        key={`${cohort}-${week}`}
                                        className={`
                                            flex-1 min-w-[48px] py-2 text-center text-xs font-medium rounded
                                            transition-all duration-150 cursor-default
                                            ${getRetentionColor(rate, isWeekZero)}
                                            ${hasData ? 'hover:ring-2 hover:ring-violet-400 hover:ring-offset-1' : ''}
                                        `}
                                        title={hasData
                                            ? `${format(parseLocalDate(cohort), 'MMM yyyy')} - Week ${week}: ${rate?.toFixed(1)}% (${cellData?.retained}/${cellData?.cohortSize})`
                                            : 'No data'
                                        }
                                    >
                                        {hasData ? `${Math.round(rate)}%` : '--'}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-medium">Retention:</span>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-violet-100" />
                        <span>0-10%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-violet-300" />
                        <span>10-35%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-violet-500" />
                        <span>35-50%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-violet-700" />
                        <span>50%+</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RetentionHeatmap;
