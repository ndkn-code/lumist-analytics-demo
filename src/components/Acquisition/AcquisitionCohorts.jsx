import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, TrendingUp, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';

const AcquisitionCohorts = () => {
    const { dateRange } = useOutletContext();
    const [cohortData, setCohortData] = useState([]);
    const [topReferrers, setTopReferrers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'cohort', direction: 'desc' });

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch cohort data
            const { data: cohorts, error: cohortError } = await supabase
                .from('signup_cohort_conversion')
                .select('*')
                .order('cohort', { ascending: false });

            if (cohortError) throw cohortError;

            // Fetch top referrers
            const { data: referrers, error: referrerError } = await supabase
                .from('referral_code_performance')
                .select('*')
                .order('converted_referrals', { ascending: false })
                .limit(20);

            if (referrerError) throw referrerError;

            setCohortData(cohorts || []);
            setTopReferrers(referrers || []);
        } catch (err) {
            console.error('Error fetching cohort data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedCohortData = [...cohortData].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (sortConfig.direction === 'asc') {
            return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
    });

    const formatMonth = (monthStr) => {
        if (!monthStr) return '-';
        const [year, month] = monthStr.split('-');
        const date = new Date(year, parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '-';
        return num.toLocaleString();
    };

    const formatPercent = (num) => {
        if (num === null || num === undefined) return '-';
        return `${num}%`;
    };

    const formatDays = (num) => {
        if (num === null || num === undefined) return '-';
        return `${Math.round(num)}d`;
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronDown size={14} className="text-slate-300" />;
        }
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="text-violet-600" />
            : <ChevronDown size={14} className="text-violet-600" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700">
                Error loading cohort data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cohort Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg">
                            <Users size={20} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Monthly Signup Cohorts</h2>
                            <p className="text-sm text-slate-500">Conversion performance by signup month</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th
                                    className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('cohort')}
                                >
                                    <div className="flex items-center gap-1">
                                        Cohort
                                        <SortIcon columnKey="cohort" />
                                    </div>
                                </th>
                                <th
                                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('cohort_size')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Signups
                                        <SortIcon columnKey="cohort_size" />
                                    </div>
                                </th>
                                <th
                                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('total_converted')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Converted
                                        <SortIcon columnKey="total_converted" />
                                    </div>
                                </th>
                                <th
                                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('conversion_rate')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Rate
                                        <SortIcon columnKey="conversion_rate" />
                                    </div>
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Day 0
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    ≤7 Days
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    ≤30 Days
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    &gt;30 Days
                                </th>
                                <th
                                    className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleSort('avg_days_to_convert')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Avg Days
                                        <SortIcon columnKey="avg_days_to_convert" />
                                    </div>
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Vietnam
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Global
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedCohortData.map((cohort, index) => (
                                <tr key={cohort.cohort} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-slate-900">
                                            {formatMonth(cohort.cohort)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-700">
                                        {formatNumber(cohort.cohort_size)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-medium text-emerald-600">
                                            {formatNumber(cohort.total_converted)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-semibold ${
                                            cohort.conversion_rate >= 10 ? 'text-emerald-600' :
                                            cohort.conversion_rate >= 5 ? 'text-amber-600' :
                                            'text-slate-600'
                                        }`}>
                                            {formatPercent(cohort.conversion_rate)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatNumber(cohort.converted_day_0)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatNumber(cohort.converted_within_7d)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatNumber(cohort.converted_within_30d)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatNumber(cohort.converted_after_30d)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`${
                                            cohort.avg_days_to_convert <= 7 ? 'text-emerald-600' :
                                            cohort.avg_days_to_convert <= 14 ? 'text-amber-600' :
                                            'text-slate-600'
                                        }`}>
                                            {formatDays(cohort.avg_days_to_convert)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatNumber(cohort.vietnam_conversions)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                        {formatNumber(cohort.global_conversions)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {cohortData.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No cohort data available
                    </div>
                )}
            </div>

            {/* Top Referrers Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Award size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Top Referrers</h2>
                            <p className="text-sm text-slate-500">Users who referred the most paying customers</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Rank
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Referrer
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Code
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Total Referrals
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Converted
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Rate
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Revenue (USD)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topReferrers.map((referrer, index) => (
                                <tr key={referrer.referrer_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                            index === 0 ? 'bg-amber-100 text-amber-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-900">
                                            {referrer.referrer_name || 'Unknown'}
                                        </div>
                                        {referrer.referrer_email && (
                                            <div className="text-xs text-slate-500">
                                                {referrer.referrer_email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <code className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">
                                            {referrer.referral_code || '-'}
                                        </code>
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-700">
                                        {formatNumber(referrer.total_referrals)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-medium text-emerald-600">
                                            {formatNumber(referrer.converted_referrals)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-medium ${
                                            referrer.conversion_rate >= 50 ? 'text-emerald-600' :
                                            referrer.conversion_rate >= 25 ? 'text-amber-600' :
                                            'text-slate-600'
                                        }`}>
                                            {formatPercent(referrer.conversion_rate)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-medium text-slate-900">
                                            ${formatNumber(Math.round(referrer.total_revenue_usd || 0))}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {topReferrers.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No referral data available
                    </div>
                )}
            </div>
        </div>
    );
};

export default AcquisitionCohorts;
