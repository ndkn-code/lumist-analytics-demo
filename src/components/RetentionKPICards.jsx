import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Calendar, CalendarDays, UserCheck, Loader2 } from 'lucide-react';

// Benchmarks for retention rates
const BENCHMARKS = {
    d1: 25,  // D1 > 25% is good
    d7: 15,  // D7 > 15% is good
    d30: 10  // D30 > 10% is good
};

const RetentionKPICard = ({ title, value, subtext, icon: Icon, iconBgColor, iconColor, benchmark }) => {
    // Determine if value meets benchmark
    const numericValue = parseFloat(value);
    const meetsTarget = !isNaN(numericValue) && benchmark && numericValue >= benchmark;
    const belowTarget = !isNaN(numericValue) && benchmark && numericValue < benchmark;

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0px_6px_28px_rgba(0,0,0,0.09)] transition-shadow duration-300">
            <div className="flex justify-between items-start mb-3 md:mb-4">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900">{value}</h3>
                        {benchmark && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                meetsTarget
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : belowTarget
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-slate-50 text-slate-500'
                            }`}>
                                {meetsTarget ? 'Above target' : belowTarget ? 'Below target' : ''}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`p-2 rounded-xl ${iconBgColor}`}>
                    <Icon size={18} className={`${iconColor} md:w-5 md:h-5`} />
                </div>
            </div>
            {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
    );
};

const RetentionKPICards = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Don't use .single() as the view might return 0 or multiple rows
                const { data: result, error: err } = await supabase
                    .from('retention_summary')
                    .select('*');

                if (err) throw err;

                // Get the first row if available
                const summaryData = result?.[0] || null;
                setData(summaryData);
            } catch (err) {
                console.error('Error fetching retention summary:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-md animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
                        <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-32" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm mb-4">
                Failed to load retention metrics: {error}
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-2xl text-sm mb-4">
                No retention data available yet
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
            <RetentionKPICard
                title="D1 Retention"
                value={`${data.d1_retention?.toFixed(1) || '0'}%`}
                subtext={`${data.d1_eligible_users?.toLocaleString() || 0} eligible users`}
                icon={Calendar}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
                benchmark={BENCHMARKS.d1}
            />
            <RetentionKPICard
                title="D7 Retention"
                value={`${data.d7_retention?.toFixed(1) || '0'}%`}
                subtext={`${data.d7_eligible_users?.toLocaleString() || 0} eligible users`}
                icon={CalendarDays}
                iconBgColor="bg-violet-100"
                iconColor="text-violet-600"
                benchmark={BENCHMARKS.d7}
            />
            <RetentionKPICard
                title="D30 Retention"
                value={`${data.d30_retention?.toFixed(1) || '0'}%`}
                subtext={`${data.d30_eligible_users?.toLocaleString() || 0} eligible users`}
                icon={UserCheck}
                iconBgColor="bg-emerald-100"
                iconColor="text-emerald-600"
                benchmark={BENCHMARKS.d30}
            />
            <RetentionKPICard
                title="Total Users"
                value={data.total_users?.toLocaleString() || '0'}
                subtext="All-time registered users"
                icon={Users}
                iconBgColor="bg-sky-100"
                iconColor="text-sky-600"
            />
        </div>
    );
};

export default RetentionKPICards;
