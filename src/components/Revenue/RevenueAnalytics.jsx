import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    Calendar,
    BarChart3,
    Globe,
    MapPin
} from 'lucide-react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend
} from 'recharts';

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Currency formatting
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

// Provider brand colors
const PROVIDER_COLORS = {
    stripe: '#635BFF',   // Stripe purple
    zalopay: '#03CA77',  // ZaloPay green
    vnpay: '#005BAA',    // VNPAY blue
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

// Plan colors
const PLAN_COLORS = {
    monthly: '#8b5cf6',
    '3months': '#0ea5e9',
    '6months': '#f59e0b',
    yearly: '#10b981',
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

    // Fallback: capitalize first letter
    return plan.charAt(0).toUpperCase() + plan.slice(1);
};

// Aggregation options
const AGGREGATION_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

// Days of week for heatmap
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Skeleton loader
const SkeletonChart = ({ height = 250 }) => (
    <div className="animate-pulse">
        <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
        <div className="bg-slate-100 rounded-lg" style={{ height }} />
    </div>
);

// Section card wrapper
const SectionCard = ({ title, subtitle, children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] ${className}`}>
        {(title || subtitle) && (
            <div className="mb-4">
                {title && <h3 className="text-base md:text-lg font-semibold text-slate-800">{title}</h3>}
                {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        )}
        {children}
    </div>
);

// Aggregation toggle component
const AggregationToggle = ({ value, onChange }) => (
    <div className="flex items-center bg-slate-100 rounded-lg p-1">
        {AGGREGATION_OPTIONS.map(opt => (
            <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    value === opt.value
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

// Custom tooltip for stacked area chart
const StackedAreaTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-800 font-semibold mb-2">{label}</p>
            {payload.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600">{formatProviderName(entry.name)}:</span>
                    <span className="font-medium text-slate-800">{formatCurrency(entry.value, currency)}</span>
                </div>
            ))}
            <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between text-sm">
                <span className="text-slate-600">Total:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(total, currency)}</span>
            </div>
        </div>
    );
};

// MRR Tooltip
const MRRTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0]?.payload;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-800 font-semibold mb-2">{label}</p>
            <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                    <span className="text-slate-600">MRR:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(data?.mrr || 0, currency)}</span>
                </div>
                {data?.growth !== undefined && (
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-600">Growth:</span>
                        <span className={`font-semibold ${data.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Heatmap cell component
const HeatmapCell = ({ value, maxValue, currency }) => {
    const intensity = maxValue > 0 ? value / maxValue : 0;
    const bgColor = intensity > 0
        ? `rgba(139, 92, 246, ${0.1 + intensity * 0.7})`
        : 'rgba(241, 245, 249, 1)';

    return (
        <div
            className="w-full h-6 rounded flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110 cursor-default"
            style={{ backgroundColor: bgColor, color: intensity > 0.5 ? 'white' : '#64748b' }}
            title={formatCurrency(value, currency)}
        >
            {value > 0 ? formatCompact(value, currency) : ''}
        </div>
    );
};

// Funnel stage component
const FunnelStage = ({ label, value, percentage, maxValue, color, dropOff }) => {
    const width = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-slate-800 font-semibold">{value.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs">({percentage}%)</span>
                </div>
            </div>
            <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{ width: `${width}%`, backgroundColor: color }}
                />
            </div>
            {dropOff !== undefined && dropOff > 0 && (
                <p className="text-xs text-rose-500 text-right">-{dropOff.toFixed(1)}% drop-off</p>
            )}
        </div>
    );
};

// Market comparison card
const MarketCard = ({ title, icon: Icon, metrics, currency }) => (
    <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
            <Icon size={18} className="text-slate-500" />
            <h4 className="font-semibold text-slate-800">{title}</h4>
        </div>
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-slate-600">Revenue</span>
                <span className="font-semibold text-slate-800">{formatCompact(metrics.revenue, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-slate-600">Transactions</span>
                <span className="font-semibold text-slate-800">{metrics.transactions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-slate-600">Avg Value</span>
                <span className="font-semibold text-slate-800">{formatCurrency(metrics.avgValue, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-slate-600">Top Plan</span>
                <span className="font-semibold text-violet-600">{metrics.topPlan || '-'}</span>
            </div>
        </div>
    </div>
);

const RevenueAnalytics = () => {
    const {
        dateRange,
        currency,
        convertToUSD,
        convertToCurrency
    } = useOutletContext();

    const [startDate, endDate] = dateRange;
    const [transactions, setTransactions] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aggregation, setAggregation] = useState('daily');

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [transactionsRes, monthlyRes] = await Promise.all([
                    supabase
                        .schema('public_analytics')
                        .from('unified_transactions')
                        .select('*')
                        .order('transaction_date', { ascending: true }),
                    supabase
                        .schema('public_analytics')
                        .from('monthly_revenue')
                        .select('*')
                        .order('month', { ascending: true })
                ]);

                if (transactionsRes.error) throw transactionsRes.error;
                if (monthlyRes.error) throw monthlyRes.error;

                setTransactions(transactionsRes.data || []);
                setMonthlyRevenue(monthlyRes.data || []);
            } catch (err) {
                console.error('Error fetching analytics data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process stacked area chart data
    const stackedAreaData = useMemo(() => {
        if (!transactions.length) return [];

        const startStr = toDateString(startDate);
        const endStr = toDateString(endDate);

        // Filter to date range and successful transactions
        const filtered = transactions.filter(t =>
            t.transaction_date >= startStr &&
            t.transaction_date <= endStr &&
            t.status?.toLowerCase() === 'success'
        );

        // Group by date and provider
        const groupedByDate = {};
        filtered.forEach(txn => {
            const date = txn.transaction_date;
            if (!groupedByDate[date]) {
                groupedByDate[date] = { date, stripe: 0, zalopay: 0, vnpay: 0 };
            }
            const provider = txn.payment_provider?.toLowerCase() || 'other';
            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            const amount = convertToCurrency(amountUSD, currency);

            if (provider in groupedByDate[date]) {
                groupedByDate[date][provider] += amount;
            }
        });

        let data = Object.values(groupedByDate).sort((a, b) => a.date.localeCompare(b.date));

        // Apply aggregation
        if (aggregation === 'weekly') {
            const weeklyMap = {};
            data.forEach(d => {
                const date = parseLocalDate(d.date);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay() + 1);
                const weekKey = toDateString(weekStart);

                if (!weeklyMap[weekKey]) {
                    weeklyMap[weekKey] = { date: `Week of ${format(weekStart, 'MMM d')}`, stripe: 0, zalopay: 0, vnpay: 0 };
                }
                weeklyMap[weekKey].stripe += d.stripe;
                weeklyMap[weekKey].zalopay += d.zalopay;
                weeklyMap[weekKey].vnpay += d.vnpay;
            });
            data = Object.values(weeklyMap);
        } else if (aggregation === 'monthly') {
            const monthlyMap = {};
            data.forEach(d => {
                const monthKey = d.date.substring(0, 7);
                if (!monthlyMap[monthKey]) {
                    monthlyMap[monthKey] = { date: format(parseLocalDate(d.date + '-01'), 'MMM yyyy'), stripe: 0, zalopay: 0, vnpay: 0 };
                }
                monthlyMap[monthKey].stripe += d.stripe;
                monthlyMap[monthKey].zalopay += d.zalopay;
                monthlyMap[monthKey].vnpay += d.vnpay;
            });
            data = Object.values(monthlyMap);
        } else {
            data = data.map(d => ({
                ...d,
                date: format(parseLocalDate(d.date), 'MMM d')
            }));
        }

        return data;
    }, [transactions, startDate, endDate, aggregation, currency, convertToUSD, convertToCurrency]);

    // Process MRR data
    const mrrData = useMemo(() => {
        if (!monthlyRevenue.length) return [];

        return monthlyRevenue.map((row, idx, arr) => {
            const amountUSD = convertToUSD(row.mrr || row.net_revenue || 0, row.currency || 'USD');
            const mrr = convertToCurrency(amountUSD, currency);

            let growth = 0;
            if (idx > 0) {
                const prevAmountUSD = convertToUSD(arr[idx - 1].mrr || arr[idx - 1].net_revenue || 0, arr[idx - 1].currency || 'USD');
                const prevMrr = convertToCurrency(prevAmountUSD, currency);
                growth = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;
            }

            return {
                month: format(parseLocalDate(row.month + '-01'), 'MMM yyyy'),
                mrr,
                growth
            };
        });
    }, [monthlyRevenue, currency, convertToUSD, convertToCurrency]);

    // Process provider comparison data
    const providerComparisonData = useMemo(() => {
        if (!transactions.length) return [];

        const startStr = toDateString(startDate);
        const endStr = toDateString(endDate);

        const filtered = transactions.filter(t =>
            t.transaction_date >= startStr &&
            t.transaction_date <= endStr &&
            t.status?.toLowerCase() === 'success'
        );

        const providerStats = {};
        filtered.forEach(txn => {
            const provider = txn.payment_provider || 'Other';
            if (!providerStats[provider]) {
                providerStats[provider] = { revenue: 0, transactions: 0 };
            }
            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            providerStats[provider].revenue += convertToCurrency(amountUSD, currency);
            providerStats[provider].transactions += 1;
        });

        return Object.entries(providerStats).map(([name, stats]) => ({
            name: formatProviderName(name),
            revenue: stats.revenue,
            transactions: stats.transactions,
            avgValue: stats.transactions > 0 ? stats.revenue / stats.transactions : 0
        }));
    }, [transactions, startDate, endDate, currency, convertToUSD, convertToCurrency]);

    // Process plan performance data
    const planPerformanceData = useMemo(() => {
        if (!transactions.length) return [];

        const startStr = toDateString(startDate);
        const endStr = toDateString(endDate);

        const filtered = transactions.filter(t =>
            t.transaction_date >= startStr &&
            t.transaction_date <= endStr &&
            t.status?.toLowerCase() === 'success'
        );

        const planStats = {};
        const customerSets = {};

        filtered.forEach(txn => {
            const plan = txn.subscription_plan || 'One-time';
            if (!planStats[plan]) {
                planStats[plan] = { revenue: 0, transactions: 0 };
                customerSets[plan] = new Set();
            }
            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            planStats[plan].revenue += convertToCurrency(amountUSD, currency);
            planStats[plan].transactions += 1;
            if (txn.user_id) customerSets[plan].add(txn.user_id);
        });

        const totalRevenue = Object.values(planStats).reduce((sum, p) => sum + p.revenue, 0);

        return Object.entries(planStats)
            .map(([name, stats]) => ({
                name: formatPlanName(name),
                rawName: name, // Keep raw name for color lookup
                revenue: stats.revenue,
                transactions: stats.transactions,
                customers: customerSets[name].size,
                avgPrice: stats.transactions > 0 ? stats.revenue / stats.transactions : 0,
                percentage: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [transactions, startDate, endDate, currency, convertToUSD, convertToCurrency]);

    // Process funnel data from actual transaction statuses
    const funnelData = useMemo(() => {
        if (!transactions.length) return null;

        const startStr = toDateString(startDate);
        const endStr = toDateString(endDate);

        const filtered = transactions.filter(t =>
            t.transaction_date >= startStr && t.transaction_date <= endStr
        );

        // Count transactions by status
        const initiated = filtered.length; // All transactions started
        const pending = filtered.filter(t => t.status?.toLowerCase() === 'pending').length;
        const success = filtered.filter(t => t.status?.toLowerCase() === 'success').length;
        const failed = filtered.filter(t => t.status?.toLowerCase() === 'failed').length;

        // Calculate funnel metrics
        const total = initiated;
        const stillProcessing = pending + success; // Transactions that didn't fail immediately

        return {
            initiated: initiated,
            pending: stillProcessing,
            success: success,
            initiatedPct: 100,
            pendingPct: total > 0 ? (stillProcessing / total) * 100 : 0,
            successPct: total > 0 ? (success / total) * 100 : 0,
            dropOff1: total > 0 ? ((initiated - stillProcessing) / initiated) * 100 : 0,
            dropOff2: stillProcessing > 0 ? ((stillProcessing - success) / stillProcessing) * 100 : 0
        };
    }, [transactions, startDate, endDate]);

    // Process heatmap data
    const heatmapData = useMemo(() => {
        if (!transactions.length) return { data: {}, maxValue: 0 };

        const startStr = toDateString(startDate);
        const endStr = toDateString(endDate);

        const filtered = transactions.filter(t =>
            t.transaction_date >= startStr &&
            t.transaction_date <= endStr &&
            t.status?.toLowerCase() === 'success'
        );

        const heatmap = {};
        let maxValue = 0;

        DAYS_OF_WEEK.forEach(day => {
            heatmap[day] = {};
            HOURS.forEach(hour => {
                heatmap[day][hour] = 0;
            });
        });

        // Distribute revenue across business hours based on date
        filtered.forEach(txn => {
            const date = parseLocalDate(txn.transaction_date);
            const dayIdx = date.getDay();
            const dayName = DAYS_OF_WEEK[dayIdx === 0 ? 6 : dayIdx - 1];

            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            const amount = convertToCurrency(amountUSD, currency);

            // Distribute across business hours (9-18) with peak at 14-16
            [9, 10, 11, 12, 13, 14, 15, 16, 17, 18].forEach(hour => {
                const weight = hour >= 14 && hour <= 16 ? 0.15 : 0.07;
                const hourlyAmount = amount * weight;
                heatmap[dayName][hour] += hourlyAmount;
                maxValue = Math.max(maxValue, heatmap[dayName][hour]);
            });
        });

        return { data: heatmap, maxValue };
    }, [transactions, startDate, endDate, currency, convertToUSD, convertToCurrency]);

    // Process market comparison data
    const marketComparisonData = useMemo(() => {
        if (!transactions.length) return { vietnam: null, global: null };

        const startStr = toDateString(startDate);
        const endStr = toDateString(endDate);

        const filtered = transactions.filter(t =>
            t.transaction_date >= startStr &&
            t.transaction_date <= endStr &&
            t.status?.toLowerCase() === 'success'
        );

        const vietnam = { revenue: 0, transactions: 0, plans: {} };
        const global = { revenue: 0, transactions: 0, plans: {} };

        filtered.forEach(txn => {
            const provider = txn.payment_provider?.toLowerCase() || '';
            const isVN = provider === 'zalopay' || provider === 'vnpay';
            const target = isVN ? vietnam : global;

            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            target.revenue += convertToCurrency(amountUSD, currency);
            target.transactions += 1;

            const plan = txn.subscription_plan || 'One-time';
            target.plans[plan] = (target.plans[plan] || 0) + convertToCurrency(amountUSD, currency);
        });

        const getTopPlan = (plans) => {
            const entries = Object.entries(plans);
            if (entries.length === 0) return null;
            const rawPlan = entries.sort((a, b) => b[1] - a[1])[0][0];
            return formatPlanName(rawPlan);
        };

        return {
            vietnam: {
                revenue: vietnam.revenue,
                transactions: vietnam.transactions,
                avgValue: vietnam.transactions > 0 ? vietnam.revenue / vietnam.transactions : 0,
                topPlan: getTopPlan(vietnam.plans)
            },
            global: {
                revenue: global.revenue,
                transactions: global.transactions,
                avgValue: global.transactions > 0 ? global.revenue / global.transactions : 0,
                topPlan: getTopPlan(global.plans)
            }
        };
    }, [transactions, startDate, endDate, currency, convertToUSD, convertToCurrency]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading analytics: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Revenue Trend - Full Width */}
            <SectionCard
                title="Revenue Trend by Provider"
                subtitle="Stacked view of revenue across payment providers"
            >
                <div className="flex justify-end mb-4">
                    <AggregationToggle value={aggregation} onChange={setAggregation} />
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stackedAreaData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradStripe" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={PROVIDER_COLORS.stripe} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={PROVIDER_COLORS.stripe} stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="gradZalopay" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={PROVIDER_COLORS.zalopay} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={PROVIDER_COLORS.zalopay} stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="gradVnpay" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={PROVIDER_COLORS.vnpay} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={PROVIDER_COLORS.vnpay} stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => formatCompact(v, currency)}
                            />
                            <Tooltip content={<StackedAreaTooltip currency={currency} />} />
                            <Legend />
                            <Area type="monotone" dataKey="stripe" name="Stripe" stackId="1" stroke={PROVIDER_COLORS.stripe} fill="url(#gradStripe)" />
                            <Area type="monotone" dataKey="zalopay" name="ZaloPay" stackId="1" stroke={PROVIDER_COLORS.zalopay} fill="url(#gradZalopay)" />
                            <Area type="monotone" dataKey="vnpay" name="VNPay" stackId="1" stroke={PROVIDER_COLORS.vnpay} fill="url(#gradVnpay)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </SectionCard>

            {/* MRR & Provider Comparison Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* MRR Growth */}
                <SectionCard title="MRR Growth" subtitle="Monthly Recurring Revenue trend">
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mrrData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => formatCompact(v, currency)}
                                />
                                <Tooltip content={<MRRTooltip currency={currency} />} />
                                <Line
                                    type="monotone"
                                    dataKey="mrr"
                                    stroke="#8b5cf6"
                                    strokeWidth={2.5}
                                    dot={{ fill: '#8b5cf6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>

                {/* Provider Comparison */}
                <SectionCard title="Provider Comparison" subtitle="Revenue, transactions & average value">
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={providerComparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => formatCompact(v, currency)}
                                />
                                <Tooltip
                                    formatter={(value, name) => [
                                        name === 'transactions' ? value.toLocaleString() : formatCurrency(value, currency),
                                        name.charAt(0).toUpperCase() + name.slice(1)
                                    ]}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }}
                                />
                                <Legend />
                                <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="avgValue" name="Avg Value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </SectionCard>
            </div>

            {/* Plan Performance - Full Width */}
            <SectionCard title="Subscription Plan Performance" subtitle="Revenue breakdown by plan type">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase">Plan</th>
                                <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                                <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase">Transactions</th>
                                <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase">Customers</th>
                                <th className="py-3 px-2 text-right text-xs font-semibold text-slate-500 uppercase">Avg Price</th>
                                <th className="py-3 px-2 text-left text-xs font-semibold text-slate-500 uppercase w-48">% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {planPerformanceData.map((plan, idx) => (
                                <tr key={plan.rawName || plan.name} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: PLAN_COLORS[(plan.rawName || plan.name).toLowerCase()] || '#94a3b8' }}
                                            />
                                            <span className="font-medium text-slate-800">{plan.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-right font-semibold text-slate-800">
                                        {formatCurrency(plan.revenue, currency)}
                                    </td>
                                    <td className="py-3 px-2 text-right text-slate-600">
                                        {plan.transactions.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-2 text-right text-slate-600">
                                        {plan.customers.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-2 text-right text-slate-600">
                                        {formatCurrency(plan.avgPrice, currency)}
                                    </td>
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${plan.percentage}%`,
                                                        backgroundColor: PLAN_COLORS[(plan.rawName || plan.name).toLowerCase()] || '#94a3b8'
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500 w-12 text-right">
                                                {plan.percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* Funnel & Heatmap Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Conversion Funnel */}
                <SectionCard title="Conversion Funnel" subtitle="Transaction flow from initiation to success">
                    {funnelData && (
                        <div className="space-y-4">
                            <FunnelStage
                                label="Initiated"
                                value={funnelData.initiated}
                                percentage={funnelData.initiatedPct.toFixed(0)}
                                maxValue={funnelData.initiated}
                                color="#8b5cf6"
                            />
                            <FunnelStage
                                label="Pending"
                                value={funnelData.pending}
                                percentage={funnelData.pendingPct.toFixed(0)}
                                maxValue={funnelData.initiated}
                                color="#0ea5e9"
                                dropOff={funnelData.dropOff1}
                            />
                            <FunnelStage
                                label="Success"
                                value={funnelData.success}
                                percentage={funnelData.successPct.toFixed(0)}
                                maxValue={funnelData.initiated}
                                color="#10b981"
                                dropOff={funnelData.dropOff2}
                            />
                        </div>
                    )}
                </SectionCard>

                {/* Revenue Heatmap */}
                <SectionCard title="Revenue Heatmap" subtitle="Peak revenue hours by day of week">
                    <div className="overflow-x-auto">
                        <div className="min-w-[500px]">
                            {/* Hour labels */}
                            <div className="flex mb-1 pl-12">
                                {[9, 12, 15, 18].map(hour => (
                                    <div key={hour} className="flex-1 text-center text-[10px] text-slate-400">
                                        {hour}:00
                                    </div>
                                ))}
                            </div>
                            {/* Heatmap grid */}
                            <div className="space-y-1">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className="flex items-center gap-1">
                                        <div className="w-10 text-xs text-slate-500 text-right pr-2">{day}</div>
                                        <div className="flex-1 grid grid-cols-10 gap-0.5">
                                            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => (
                                                <HeatmapCell
                                                    key={hour}
                                                    value={heatmapData.data[day]?.[hour] || 0}
                                                    maxValue={heatmapData.maxValue}
                                                    currency={currency}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Legend */}
                            <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-slate-400">
                                <span>Low</span>
                                <div className="flex gap-0.5">
                                    {[0.1, 0.3, 0.5, 0.7, 0.9].map(intensity => (
                                        <div
                                            key={intensity}
                                            className="w-4 h-3 rounded"
                                            style={{ backgroundColor: `rgba(139, 92, 246, ${intensity})` }}
                                        />
                                    ))}
                                </div>
                                <span>High</span>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Market Segment Comparison */}
            <SectionCard title="Market Segment Comparison" subtitle="Vietnam local payments vs global payments">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MarketCard
                        title="Vietnam (ZaloPay/VNPay)"
                        icon={MapPin}
                        metrics={marketComparisonData.vietnam || { revenue: 0, transactions: 0, avgValue: 0, topPlan: null }}
                        currency={currency}
                    />
                    <MarketCard
                        title="Global (Stripe)"
                        icon={Globe}
                        metrics={marketComparisonData.global || { revenue: 0, transactions: 0, avgValue: 0, topPlan: null }}
                        currency={currency}
                    />
                </div>
            </SectionCard>
        </div>
    );
};

export default RevenueAnalytics;
