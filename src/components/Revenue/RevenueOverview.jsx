import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { DollarSign, Receipt, Users, TrendingUp, Loader2, ArrowRight, Repeat, UserCheck, UserMinus, AlertTriangle } from 'lucide-react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    LabelList
} from 'recharts';

// Helper to parse YYYY-MM-DD string as local date (avoids timezone shift)
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Currency formatting helpers
const formatCurrency = (amount, currency) => {
    if (currency === 'VND') {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

const formatCompact = (amount, currency) => {
    if (currency === 'VND') {
        if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B ₫`;
        if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₫`;
        if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K ₫`;
        return `${Math.round(amount)} ₫`;
    }
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(2)}`;
};

// Provider brand colors (lowercase keys for case-insensitive matching)
const PROVIDER_COLORS = {
    'stripe': '#635BFF',   // Stripe purple
    'zalopay': '#03CA77',  // ZaloPay green
    'vnpay': '#005BAA',    // VNPAY blue
};

// Helper to get provider color (case-insensitive)
const getProviderColor = (providerName) => {
    const key = (providerName || '').toLowerCase();
    return PROVIDER_COLORS[key] || '#94A3B8';
};

// Provider name formatting helper
const formatProviderName = (provider) => {
    if (!provider) return 'Unknown';

    const providerNames = {
        'vnpay': 'VNPay',
        'zalopay': 'ZaloPay',
        'stripe': 'Stripe',
    };

    return providerNames[provider.toLowerCase()] || provider;
};

// Plan name formatting helper
const formatPlanName = (plan) => {
    if (!plan) return 'One-time';

    const planNames = {
        'monthly': 'Monthly',
        '1month': '1 Month',
        '3months': '3 Months',
        '3month': '3 Months',
        'three_months': '3 Months',
        '6months': '6 Months',
        '6month': '6 Months',
        'six_months': '6 Months',
        'yearly': 'Yearly',
        '1year': '1 Year',
        'annual': 'Annual',
        'lifetime': 'Lifetime',
        'one-time': 'One-time',
    };

    const lowerPlan = plan.toLowerCase();
    if (planNames[lowerPlan]) {
        return planNames[lowerPlan];
    }

    // Try to format automatically: "3months" -> "3 Months"
    const match = plan.match(/^(\d+)\s*(month|months|year|years)$/i);
    if (match) {
        const num = match[1];
        const unit = match[2].toLowerCase();
        const unitFormatted = unit.charAt(0).toUpperCase() + unit.slice(1);
        const finalUnit = num === '1'
            ? unitFormatted.replace(/s$/, '')
            : unitFormatted.endsWith('s') ? unitFormatted : unitFormatted + 's';
        return `${num} ${finalUnit}`;
    }

    // Fallback: capitalize first letter
    return plan.charAt(0).toUpperCase() + plan.slice(1);
};

// Status badge colors
const STATUS_COLORS = {
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    failed: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    refunded: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
};

// KPI Card Component
const KPICard = ({ title, value, subtext, icon: Icon, iconBgColor, iconColor, delta }) => (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start mb-3 md:mb-4">
            <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">{value}</h3>
                    {delta !== null && delta !== undefined && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
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

// Custom Tooltip for Revenue Chart
const RevenueTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-2">
                {format(parseLocalDate(label), 'MMM d, yyyy')}
            </p>
            <div className="space-y-1">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-700 text-sm">
                            {entry.name}: <span className="font-semibold">{formatCurrency(entry.value, currency)}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Custom Tooltip for Provider Pie Chart
const ProviderTooltip = ({ active, payload, currency }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0];
    return (
        <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-lg z-50">
            <p className="text-gray-900 font-semibold text-sm">{formatProviderName(data.name)}</p>
            <p className="text-gray-700 text-sm">
                {formatCurrency(data.value, currency)}
            </p>
            <p className="text-gray-500 text-xs">{data.payload.percentage}% of total</p>
        </div>
    );
};

// Skeleton Loader
const SkeletonCard = () => (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-md animate-pulse">
        <div className="flex justify-between items-start mb-4">
            <div className="space-y-2">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-8 w-32 bg-slate-200 rounded" />
            </div>
            <div className="h-10 w-10 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-3 w-24 bg-slate-200 rounded" />
    </div>
);

const SkeletonChart = ({ height = 300 }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm animate-pulse">
        <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
        <div className={`bg-slate-100 rounded-lg`} style={{ height }} />
    </div>
);

const RevenueOverview = () => {
    const {
        dateRange,
        currency,
        convertToUSD,
        convertToCurrency,
        isLoadingRates
    } = useOutletContext();

    const [startDate, endDate] = dateRange;
    const [transactions, setTransactions] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    const [churnSummary, setChurnSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Calculate previous period for delta comparison
                const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const prevStartDate = new Date(startDate);
                prevStartDate.setDate(prevStartDate.getDate() - duration);
                const prevStartDateString = toDateString(prevStartDate);

                // Fetch all transactions (current + previous period) for accurate KPIs
                const transactionsPromise = supabase
                    .schema('public_analytics')
                    .from('unified_transactions')
                    .select('*')
                    .gte('transaction_date', prevStartDateString)
                    .lte('transaction_date', endDateString)
                    .order('transaction_date', { ascending: true });

                // Fetch recent transactions for table
                const recentPromise = supabase
                    .schema('public_analytics')
                    .from('unified_transactions')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                // Fetch monthly revenue summary for MRR (aggregated view with one row per month)
                const monthlyRevenuePromise = supabase
                    .schema('public_analytics')
                    .from('monthly_revenue_summary')
                    .select('*')
                    .order('month', { ascending: false })
                    .limit(2); // Only need current and previous month for delta

                // Fetch churn summary for subscriber KPIs
                const churnSummaryPromise = supabase
                    .schema('public_analytics')
                    .from('churn_summary')
                    .select('*')
                    .single();

                const [transactionsRes, recentRes, monthlyRes, churnRes] = await Promise.all([
                    transactionsPromise,
                    recentPromise,
                    monthlyRevenuePromise,
                    churnSummaryPromise
                ]);

                if (transactionsRes.error) throw transactionsRes.error;
                if (recentRes.error) throw recentRes.error;
                // MRR is optional - don't throw on error, just log it
                if (monthlyRes.error) {
                    console.warn('Could not fetch monthly revenue for MRR:', monthlyRes.error);
                }
                // Churn is optional - don't throw on error, just log it
                if (churnRes.error) {
                    console.warn('Could not fetch churn summary:', churnRes.error);
                }

                setTransactions(transactionsRes.data || []);
                setRecentTransactions(recentRes.data || []);
                setMonthlyRevenue(monthlyRes.data || []);
                setChurnSummary(churnRes.data || null);

            } catch (err) {
                console.error('Error fetching revenue data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Calculate MRR data from monthly_revenue_summary
    const mrrData = useMemo(() => {
        // Graceful fallback if no data
        if (!monthlyRevenue || !monthlyRevenue.length) {
            console.log('MRR: No monthly revenue data');
            return { currentMRR: 0, delta: null, monthLabel: null };
        }

        try {
            // Monthly revenue is sorted descending, so [0] is most recent
            const current = monthlyRevenue[0];
            const previous = monthlyRevenue[1];

            console.log('MRR Debug - current row:', current);
            console.log('MRR Debug - previous row:', previous);

            if (!current) {
                return { currentMRR: 0, delta: null, monthLabel: null };
            }

            // monthly_revenue_summary already returns USD, so we just need to convert to display currency
            // net_revenue is already in USD (converted in the view)
            const currentMRRUSD = Number(current.net_revenue) || 0;
            const currentMRR = convertToCurrency(currentMRRUSD, currency);

            console.log('MRR Debug - currentMRRUSD:', currentMRRUSD, 'currentMRR:', currentMRR);

            let delta = null;
            if (previous) {
                const prevMRRUSD = Number(previous.net_revenue) || 0;
                const prevMRR = convertToCurrency(prevMRRUSD, currency);
                if (prevMRR > 0) {
                    delta = ((currentMRR - prevMRR) / prevMRR) * 100;
                } else if (currentMRR > 0) {
                    delta = 100;
                }
            }

            // Format month label (e.g., "Dec 2024") - with safe date parsing
            let monthLabel = null;
            if (current.month && typeof current.month === 'string') {
                try {
                    // Parse YYYY-MM format safely
                    const [year, month] = current.month.split('-').map(Number);
                    if (year && month) {
                        monthLabel = format(new Date(year, month - 1, 1), 'MMM yyyy');
                    }
                } catch (dateError) {
                    console.warn('Error parsing month:', dateError);
                }
            }

            return { currentMRR, delta, monthLabel };
        } catch (error) {
            console.error('Error calculating MRR:', error);
            return { currentMRR: 0, delta: null, monthLabel: null };
        }
    }, [monthlyRevenue, currency, convertToCurrency]);

    // Process data for display
    const {
        kpiData,
        chartData,
        providerData,
        planData
    } = useMemo(() => {
        if (!transactions.length) {
            return {
                kpiData: { totalRevenue: 0, transactions: 0, customers: 0, avgTransaction: 0, deltas: {} },
                chartData: [],
                providerData: [],
                planData: []
            };
        }

        const startDateString = toDateString(startDate);
        const endDateString = toDateString(endDate);

        // Split current and previous period data
        const currentData = transactions.filter(t =>
            t.transaction_date >= startDateString && t.transaction_date <= endDateString
        );
        const prevData = transactions.filter(t =>
            t.transaction_date < startDateString
        );

        // Filter successful transactions for revenue calculation
        // Only count successful transactions - refunded transactions are excluded (not subtracted)
        const successfulCurrent = currentData.filter(t => t.status?.toLowerCase() === 'success');
        const successfulPrev = prevData.filter(t => t.status?.toLowerCase() === 'success');

        // Calculate current period metrics
        let totalRevenueUSD = 0;
        const customerSet = new Set();
        const providerTotals = {};
        const planTotals = {};

        successfulCurrent.forEach(txn => {
            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            totalRevenueUSD += amountUSD;
            if (txn.user_id) customerSet.add(txn.user_id);

            // Aggregate by provider
            const provider = txn.payment_provider || 'Other';
            providerTotals[provider] = (providerTotals[provider] || 0) + amountUSD;

            // Aggregate by plan
            const plan = txn.subscription_plan || 'One-time';
            planTotals[plan] = (planTotals[plan] || 0) + amountUSD;
        });

        const txnCount = successfulCurrent.length;

        // Calculate previous period metrics
        let prevTotalRevenueUSD = 0;
        const prevCustomerSet = new Set();

        successfulPrev.forEach(txn => {
            prevTotalRevenueUSD += convertToUSD(txn.amount || 0, txn.currency || 'USD');
            if (txn.user_id) prevCustomerSet.add(txn.user_id);
        });

        const prevTxnCount = successfulPrev.length;

        // Calculate deltas
        const calculateDelta = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const deltas = {
            revenue: calculateDelta(totalRevenueUSD, prevTotalRevenueUSD),
            transactions: calculateDelta(txnCount, prevTxnCount),
            customers: calculateDelta(customerSet.size, prevCustomerSet.size),
            avgTransaction: calculateDelta(
                txnCount > 0 ? totalRevenueUSD / txnCount : 0,
                prevTxnCount > 0 ? prevTotalRevenueUSD / prevTxnCount : 0
            )
        };

        // Convert totals to display currency
        const displayTotalRevenue = convertToCurrency(totalRevenueUSD, currency);
        const displayAvgTransaction = txnCount > 0
            ? convertToCurrency(totalRevenueUSD / txnCount, currency)
            : 0;

        // Prepare chart data with 7-day moving average
        const chartDataMap = {};
        successfulCurrent.forEach(txn => {
            const date = txn.transaction_date;
            if (!chartDataMap[date]) {
                chartDataMap[date] = { transaction_date: date, revenue: 0 };
            }
            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            chartDataMap[date].revenue += convertToCurrency(amountUSD, currency);
        });

        const sortedChartData = Object.values(chartDataMap)
            .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

        // Calculate 7-day moving average
        const chartDataWithMA = sortedChartData.map((item, index, arr) => {
            const start = Math.max(0, index - 6);
            const window = arr.slice(start, index + 1);
            const ma7 = window.reduce((sum, d) => sum + d.revenue, 0) / window.length;
            return { ...item, ma7 };
        });

        // Prepare provider data for pie chart
        const totalProviderRevenue = Object.values(providerTotals).reduce((a, b) => a + b, 0);
        const providerDataArr = Object.entries(providerTotals)
            .map(([name, value]) => ({
                name,
                value: convertToCurrency(value, currency),
                percentage: totalProviderRevenue > 0 ? ((value / totalProviderRevenue) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.value - a.value);

        // Prepare plan data for bar chart (with formatted names)
        const planDataArr = Object.entries(planTotals)
            .map(([name, value]) => ({
                name: formatPlanName(name),
                value: convertToCurrency(value, currency)
            }))
            .sort((a, b) => b.value - a.value);

        return {
            kpiData: {
                totalRevenue: displayTotalRevenue,
                transactions: txnCount,
                customers: customerSet.size,
                avgTransaction: displayAvgTransaction,
                deltas
            },
            chartData: chartDataWithMA,
            providerData: providerDataArr,
            planData: planDataArr
        };
    }, [transactions, startDate, endDate, currency, convertToUSD, convertToCurrency]);

    // Loading state
    if (loading && transactions.length === 0) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
                <SkeletonChart height={300} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SkeletonChart height={250} />
                    <SkeletonChart height={250} />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading revenue data: {error}
            </div>
        );
    }

    // Empty state
    if (!loading && transactions.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <DollarSign className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Revenue Data</h3>
                <p className="text-slate-500">No transactions found for the selected date range.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    title="MRR"
                    value={formatCompact(mrrData.currentMRR, currency)}
                    subtext={mrrData.monthLabel ? `As of ${mrrData.monthLabel}` : 'Monthly Recurring Revenue'}
                    icon={Repeat}
                    iconBgColor="bg-indigo-100"
                    iconColor="text-indigo-600"
                    delta={mrrData.delta}
                />
                <KPICard
                    title="Total Revenue"
                    value={formatCompact(kpiData.totalRevenue, currency)}
                    subtext={`Net revenue in selected period`}
                    icon={DollarSign}
                    iconBgColor="bg-violet-100"
                    iconColor="text-violet-600"
                    delta={kpiData.deltas.revenue}
                />
                <KPICard
                    title="Transactions"
                    value={kpiData.transactions.toLocaleString()}
                    subtext="Successful transactions"
                    icon={Receipt}
                    iconBgColor="bg-sky-100"
                    iconColor="text-sky-600"
                    delta={kpiData.deltas.transactions}
                />
                <KPICard
                    title="Paying Customers"
                    value={kpiData.customers.toLocaleString()}
                    subtext="Unique customers"
                    icon={Users}
                    iconBgColor="bg-emerald-100"
                    iconColor="text-emerald-600"
                    delta={kpiData.deltas.customers}
                />
                <KPICard
                    title="Avg Transaction"
                    value={formatCompact(kpiData.avgTransaction, currency)}
                    subtext="Average transaction value"
                    icon={TrendingUp}
                    iconBgColor="bg-amber-100"
                    iconColor="text-amber-600"
                    delta={kpiData.deltas.avgTransaction}
                />
            </div>

            {/* Subscriber KPI Cards */}
            {churnSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <KPICard
                        title="Active Subscribers"
                        value={churnSummary.active_subscribers?.toLocaleString() || '0'}
                        subtext={`${churnSummary.total_subscribers || 0} total subscribers`}
                        icon={UserCheck}
                        iconBgColor="bg-emerald-100"
                        iconColor="text-emerald-600"
                    />
                    <KPICard
                        title="Churn Rate"
                        value={`${churnSummary.churn_rate_percent || 0}%`}
                        subtext={`${churnSummary.churned_subscribers || 0} churned subscribers`}
                        icon={UserMinus}
                        iconBgColor="bg-rose-100"
                        iconColor="text-rose-600"
                    />
                    <KPICard
                        title="At Risk"
                        value={churnSummary.expiring_30_days?.toLocaleString() || '0'}
                        subtext={`${churnSummary.expiring_7_days || 0} expiring in 7 days`}
                        icon={AlertTriangle}
                        iconBgColor="bg-amber-100"
                        iconColor="text-amber-600"
                    />
                </div>
            )}

            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">Revenue Trend</h3>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-violet-500" />
                            <span className="text-slate-600">Daily Revenue</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-400" />
                            <span className="text-slate-600">7-Day MA</span>
                        </div>
                    </div>
                </div>
                <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="transaction_date"
                                tickFormatter={(str) => format(parseLocalDate(str), 'MMM d')}
                                stroke="#6B7280"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                                minTickGap={50}
                            />
                            <YAxis
                                stroke="#6B7280"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => formatCompact(val, currency)}
                            />
                            <Tooltip content={<RevenueTooltip currency={currency} />} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="none"
                                fillOpacity={1}
                                fill="url(#revenueGradient)"
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="Daily Revenue"
                                stroke="#8B5CF6"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#8B5CF6' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="ma7"
                                name="7-Day MA"
                                stroke="#94A3B8"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue by Provider (Donut) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">Revenue by Provider</h3>
                    <div className="h-[200px] md:h-[250px] flex items-center">
                        <div className="relative flex-shrink-0" style={{ width: '180px', height: '180px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={providerData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        stroke="white"
                                        strokeWidth={2}
                                    >
                                        {providerData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={getProviderColor(entry.name)}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={<ProviderTooltip currency={currency} />}
                                        wrapperStyle={{ zIndex: 100 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center text - positioned absolutely, pointer-events-none prevents blocking tooltip */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-lg font-bold text-slate-800">
                                    {formatCompact(providerData.reduce((sum, p) => sum + p.value, 0), currency)}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">Total</span>
                            </div>
                        </div>
                        {/* Legend */}
                        <div className="flex-1 pl-4 space-y-3">
                            {providerData.map((entry, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: getProviderColor(entry.name) }}
                                        />
                                        <span className="text-sm text-slate-600">{formatProviderName(entry.name)}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800">{entry.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Revenue by Plan (Horizontal Bar) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base font-semibold text-slate-800 mb-4">Revenue by Plan</h3>
                    <div className="h-[200px] md:h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={planData}
                                layout="vertical"
                                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                                <XAxis
                                    type="number"
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => formatCompact(val, currency)}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#6B7280"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                />
                                <Tooltip
                                    formatter={(value) => formatCurrency(value, currency)}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        formatter={(val) => formatCompact(val, currency)}
                                        style={{ fontSize: 12, fill: '#64748B' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">Recent Transactions</h3>
                    <Link
                        to="/revenue/transactions"
                        className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                        View All
                        <ArrowRight size={16} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                                <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                                <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                recentTransactions.map((txn, index) => {
                                    const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
                                    const displayAmount = convertToCurrency(amountUSD, currency);
                                    const status = txn.status || 'pending';

                                    return (
                                        <tr key={txn.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-2 text-sm text-slate-700">
                                                {txn.created_at
                                                    ? format(new Date(txn.created_at), 'MMM d, yyyy h:mm a')
                                                    : '-'}
                                            </td>
                                            <td className="py-3 px-2 text-sm text-slate-700">
                                                {formatProviderName(txn.payment_provider)}
                                            </td>
                                            <td className="py-3 px-2 text-sm text-slate-700">
                                                {formatPlanName(txn.subscription_plan)}
                                            </td>
                                            <td className="py-3 px-2 text-sm text-slate-800 font-medium text-right">
                                                {formatCurrency(displayAmount, currency)}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RevenueOverview;
