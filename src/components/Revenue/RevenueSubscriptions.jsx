import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Users,
    TrendingUp,
    Calendar,
    CreditCard,
    Clock,
    RefreshCw,
    UserCheck,
    UserMinus,
    AlertTriangle,
    Search,
    Columns,
    Check
} from 'lucide-react';
import { format } from 'date-fns';

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

// Plan display info
const PLAN_INFO = {
    monthly: {
        name: 'Monthly',
        description: '1 month access',
        icon: Calendar,
        color: 'violet'
    },
    '3months': {
        name: '3 Months',
        description: 'Quarterly plan',
        icon: Clock,
        color: 'sky'
    },
    '6months': {
        name: '6 Months',
        description: 'Semi-annual plan',
        icon: TrendingUp,
        color: 'amber'
    },
    '12months': {
        name: '12 Months',
        description: 'Annual subscription',
        icon: CreditCard,
        color: 'emerald'
    },
    yearly: {
        name: 'Yearly',
        description: 'Annual subscription',
        icon: CreditCard,
        color: 'emerald'
    },
};

// Column configuration for subscriber table
const SUBSCRIBER_COLUMNS = [
    { key: 'subscriber', label: 'Subscriber', defaultVisible: true, align: 'left' },
    { key: 'accountCreated', label: 'Account Created', defaultVisible: true, align: 'left' },
    { key: 'daysToSubscribe', label: 'Days to Subscribe', defaultVisible: true, align: 'center' },
    { key: 'plan', label: 'Plan', defaultVisible: true, align: 'left' },
    { key: 'provider', label: 'Provider', defaultVisible: true, align: 'left' },
    { key: 'startDate', label: 'Start Date', defaultVisible: true, align: 'left' },
    { key: 'endDate', label: 'End Date', defaultVisible: true, align: 'left' },
    { key: 'daysLeft', label: 'Days Left', defaultVisible: true, align: 'center' },
    { key: 'status', label: 'Status', defaultVisible: true, align: 'center' },
];

// Calculate days between two dates
const calcDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

// Color classes for plans
const COLOR_CLASSES = {
    violet: {
        bg: 'bg-violet-50',
        text: 'text-violet-600',
        bar: 'bg-violet-500',
        badge: 'bg-violet-50 text-violet-700'
    },
    sky: {
        bg: 'bg-sky-50',
        text: 'text-sky-600',
        bar: 'bg-sky-500',
        badge: 'bg-sky-50 text-sky-700'
    },
    amber: {
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        bar: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-700'
    },
    emerald: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-50 text-emerald-700'
    },
    slate: {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        bar: 'bg-slate-500',
        badge: 'bg-slate-50 text-slate-700'
    }
};

// Summary card component
const SummaryCard = ({ label, value, subtext }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
        <p className="text-sm text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
);

// Plan card component
const PlanCard = ({ plan, info, colors, metrics, sharePercent, currency }) => {
    const Icon = info.icon;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6 hover:shadow-[0px_6px_28px_rgba(0,0,0,0.09)] transition-shadow duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${colors.bg}`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">{info.name}</h3>
                        <p className="text-sm text-slate-500">{info.description}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                    {sharePercent}% of revenue
                </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <p className="text-sm text-slate-500">Revenue</p>
                    <p className="text-lg font-semibold text-slate-900">
                        {formatCompact(metrics.revenue, currency)}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-slate-500">Transactions</p>
                    <p className="text-lg font-semibold text-slate-900">{metrics.transactions}</p>
                </div>
                <div>
                    <p className="text-sm text-slate-500">Customers</p>
                    <p className="text-lg font-semibold text-slate-900">{metrics.customers}</p>
                </div>
            </div>

            {/* Revenue share bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${sharePercent}%` }}
                />
            </div>

            {/* Providers */}
            {metrics.providers.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Available via:</span>
                    {metrics.providers.map(provider => (
                        <span
                            key={provider}
                            className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                        >
                            {provider}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

const RevenueSubscriptions = () => {
    const {
        dateRange,
        currency,
        convertToUSD,
        convertToCurrency
    } = useOutletContext();

    const [startDate, endDate] = dateRange;
    const [transactions, setTransactions] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [churnSummary, setChurnSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [columnVisibility, setColumnVisibility] = useState(() => {
        // Initialize from column defaults
        const initial = {};
        SUBSCRIBER_COLUMNS.forEach(col => {
            initial[col.key] = col.defaultVisible;
        });
        return initial;
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // Toggle column visibility
    const toggleColumn = (columnKey) => {
        setColumnVisibility(prev => ({
            ...prev,
            [columnKey]: !prev[columnKey]
        }));
    };

    // Count visible columns for colSpan
    const visibleColumnCount = useMemo(() => {
        return Object.values(columnVisibility).filter(Boolean).length;
    }, [columnVisibility]);

    // Fetch transactions, subscribers, and churn data
    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Fetch transactions for plan breakdown
                const transactionsPromise = supabase
                    .schema('public_analytics')
                    .from('unified_transactions')
                    .select('*')
                    .gte('transaction_date', startDateString)
                    .lte('transaction_date', endDateString)
                    .eq('status', 'success')
                    .order('transaction_date', { ascending: false });

                // Fetch all subscribers with their status
                const subscribersPromise = supabase
                    .schema('public_analytics')
                    .from('user_subscriptions')
                    .select('*')
                    .order('subscription_end', { ascending: true });

                // Fetch churn summary
                const churnPromise = supabase
                    .schema('public_analytics')
                    .from('churn_summary')
                    .select('*')
                    .single();

                const [transactionsRes, subscribersRes, churnRes] = await Promise.all([
                    transactionsPromise,
                    subscribersPromise,
                    churnPromise
                ]);

                if (transactionsRes.error) throw transactionsRes.error;

                // Subscribers and churn are optional - log but don't throw
                if (subscribersRes.error) {
                    console.warn('Could not fetch subscribers:', subscribersRes.error);
                }
                if (churnRes.error) {
                    console.warn('Could not fetch churn summary:', churnRes.error);
                }

                setTransactions(transactionsRes.data || []);
                setSubscribers(subscribersRes.data || []);
                setChurnSummary(churnRes.data || null);
            } catch (err) {
                console.error('Error fetching subscription data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Process subscription data
    const { planList, totalRevenue, totalSubscribers, mostPopular } = useMemo(() => {
        if (!transactions.length) {
            return { planList: [], totalRevenue: 0, totalSubscribers: 0, mostPopular: null };
        }

        const planStats = {};

        transactions.forEach(txn => {
            const plan = txn.subscription_plan || 'one-time';
            if (!planStats[plan]) {
                planStats[plan] = {
                    revenue: 0,
                    transactions: 0,
                    customers: new Set(),
                    providers: new Set()
                };
            }

            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            planStats[plan].revenue += convertToCurrency(amountUSD, currency);
            planStats[plan].transactions += 1;
            if (txn.user_id) planStats[plan].customers.add(txn.user_id);
            if (txn.payment_provider) planStats[plan].providers.add(txn.payment_provider);
        });

        const total = Object.values(planStats).reduce((sum, p) => sum + p.revenue, 0);
        const totalSubs = new Set(transactions.map(t => t.user_id)).size;

        const list = Object.entries(planStats)
            .map(([plan, stats]) => ({
                plan,
                revenue: stats.revenue,
                transactions: stats.transactions,
                customers: stats.customers.size,
                providers: Array.from(stats.providers),
                percentage: total > 0 ? (stats.revenue / total) * 100 : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);

        const popular = list.length > 0 ? list[0].plan : null;

        return {
            planList: list,
            totalRevenue: total,
            totalSubscribers: totalSubs,
            mostPopular: popular
        };
    }, [transactions, currency, convertToUSD, convertToCurrency]);

    // Filter subscribers based on search and status
    const filteredSubscribers = useMemo(() => {
        return subscribers.filter(sub => {
            // Status filter
            if (statusFilter !== 'all' && sub.status !== statusFilter) {
                return false;
            }

            // Search filter - search in name, email
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const fullName = `${sub.first_name || ''} ${sub.last_name || ''}`.toLowerCase();
                const email = (sub.email || '').toLowerCase();
                if (!fullName.includes(search) && !email.includes(search)) {
                    return false;
                }
            }

            return true;
        });
    }, [subscribers, searchTerm, statusFilter]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-rose-700">Error loading subscriptions: {error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 text-rose-600 hover:text-rose-800 font-medium"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Churn KPI Cards */}
            {churnSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-slate-500">Active Subscribers</p>
                            <div className="p-2 rounded-xl bg-emerald-100">
                                <UserCheck size={18} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{churnSummary.active_subscribers || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">{churnSummary.total_subscribers || 0} total subscribers</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-slate-500">Churn Rate</p>
                            <div className="p-2 rounded-xl bg-rose-100">
                                <UserMinus size={18} className="text-rose-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{churnSummary.churn_rate_percent || 0}%</p>
                        <p className="text-xs text-slate-400 mt-1">{churnSummary.churned_subscribers || 0} churned subscribers</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-slate-500">At Risk (30 days)</p>
                            <div className="p-2 rounded-xl bg-amber-100">
                                <AlertTriangle size={18} className="text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{churnSummary.expiring_30_days || 0}</p>
                        <p className="text-xs text-slate-400 mt-1">{churnSummary.expiring_7_days || 0} expiring in 7 days</p>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    label="Total Plans"
                    value={planList.length}
                />
                <SummaryCard
                    label="Total Revenue"
                    value={formatCompact(totalRevenue, currency)}
                />
                <SummaryCard
                    label="Total Subscribers"
                    value={totalSubscribers}
                />
                <SummaryCard
                    label="Most Popular"
                    value={mostPopular ? (PLAN_INFO[mostPopular]?.name || formatPlanName(mostPopular)) : '-'}
                />
            </div>

            {/* Plan Cards */}
            {planList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {planList.map((item) => {
                        const info = PLAN_INFO[item.plan] || {
                            name: formatPlanName(item.plan),
                            description: 'Subscription plan',
                            icon: CreditCard,
                            color: 'slate'
                        };
                        const colors = COLOR_CLASSES[info.color] || COLOR_CLASSES.slate;

                        return (
                            <PlanCard
                                key={item.plan}
                                plan={item.plan}
                                info={info}
                                colors={colors}
                                metrics={{
                                    revenue: item.revenue,
                                    transactions: item.transactions,
                                    customers: item.customers,
                                    providers: item.providers
                                }}
                                sharePercent={Math.round(item.percentage)}
                                currency={currency}
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center">
                    <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No subscription data yet</h3>
                    <p className="text-slate-500">Subscription data will appear here once you have transactions.</p>
                </div>
            )}

            {/* Subscriber Table */}
            {subscribers.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">All Subscribers</h3>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-full sm:w-64"
                                />
                            </div>
                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                            </select>
                            {/* Column Toggle */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                                >
                                    <Columns size={16} className="text-slate-500" />
                                    <span className="text-slate-700">Columns</span>
                                </button>
                                {showColumnMenu && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowColumnMenu(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-2 min-w-[180px]">
                                            {SUBSCRIBER_COLUMNS.map(col => (
                                                <button
                                                    key={col.key}
                                                    onClick={() => toggleColumn(col.key)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                        columnVisibility[col.key]
                                                            ? 'bg-violet-500 border-violet-500'
                                                            : 'border-slate-300'
                                                    }`}>
                                                        {columnVisibility[col.key] && (
                                                            <Check size={12} className="text-white" />
                                                        )}
                                                    </div>
                                                    {col.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    {columnVisibility.subscriber && (
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subscriber</th>
                                    )}
                                    {columnVisibility.accountCreated && (
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Created</th>
                                    )}
                                    {columnVisibility.daysToSubscribe && (
                                        <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days to Subscribe</th>
                                    )}
                                    {columnVisibility.plan && (
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
                                    )}
                                    {columnVisibility.provider && (
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                                    )}
                                    {columnVisibility.startDate && (
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</th>
                                    )}
                                    {columnVisibility.endDate && (
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</th>
                                    )}
                                    {columnVisibility.daysLeft && (
                                        <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days Left</th>
                                    )}
                                    {columnVisibility.status && (
                                        <th className="text-center py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubscribers.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleColumnCount} className="py-8 text-center text-slate-500">
                                            No subscribers match your filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSubscribers.map((sub, index) => {
                                        const isAtRisk = sub.status === 'active' && sub.days_remaining <= 7;
                                        const isExpiringSoon = sub.status === 'active' && sub.days_remaining > 7 && sub.days_remaining <= 30;
                                        const daysToSubscribe = calcDaysBetween(sub.account_created_at, sub.subscription_start);

                                        return (
                                            <tr key={sub.user_id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                                {columnVisibility.subscriber && (
                                                    <td className="py-3 px-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {sub.first_name || sub.last_name
                                                                    ? `${sub.first_name || ''} ${sub.last_name || ''}`.trim()
                                                                    : 'Unknown'}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{sub.email || '-'}</p>
                                                        </div>
                                                    </td>
                                                )}
                                                {columnVisibility.accountCreated && (
                                                    <td className="py-3 px-2 text-sm text-slate-700">
                                                        {sub.account_created_at
                                                            ? format(new Date(sub.account_created_at), 'MMM d, yyyy')
                                                            : '-'}
                                                    </td>
                                                )}
                                                {columnVisibility.daysToSubscribe && (
                                                    <td className="py-3 px-2 text-center">
                                                        {daysToSubscribe !== null ? (
                                                            <span className={`text-sm font-medium ${
                                                                daysToSubscribe === 0 ? 'text-emerald-600' :
                                                                daysToSubscribe <= 7 ? 'text-sky-600' :
                                                                'text-slate-700'
                                                            }`}>
                                                                {daysToSubscribe === 0 ? 'Same day' : `${daysToSubscribe}d`}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                {columnVisibility.plan && (
                                                    <td className="py-3 px-2 text-sm text-slate-700">
                                                        {formatPlanName(sub.subscription_plan)}
                                                    </td>
                                                )}
                                                {columnVisibility.provider && (
                                                    <td className="py-3 px-2 text-sm text-slate-700">
                                                        {sub.payment_provider || '-'}
                                                    </td>
                                                )}
                                                {columnVisibility.startDate && (
                                                    <td className="py-3 px-2 text-sm text-slate-700">
                                                        {sub.subscription_start
                                                            ? format(new Date(sub.subscription_start), 'MMM d, yyyy')
                                                            : '-'}
                                                    </td>
                                                )}
                                                {columnVisibility.endDate && (
                                                    <td className="py-3 px-2 text-sm text-slate-700">
                                                        {sub.subscription_end
                                                            ? format(new Date(sub.subscription_end), 'MMM d, yyyy')
                                                            : '-'}
                                                    </td>
                                                )}
                                                {columnVisibility.daysLeft && (
                                                    <td className="py-3 px-2 text-center">
                                                        {sub.status === 'active' ? (
                                                            <span className={`text-sm font-medium ${
                                                                isAtRisk ? 'text-rose-600' :
                                                                isExpiringSoon ? 'text-amber-600' :
                                                                'text-slate-700'
                                                            }`}>
                                                                {sub.days_remaining}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                )}
                                                {columnVisibility.status && (
                                                    <td className="py-3 px-2 text-center">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                                            sub.status === 'active'
                                                                ? isAtRisk
                                                                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                                                    : isExpiringSoon
                                                                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                                                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                                : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
                                                        }`}>
                                                            {sub.status === 'active'
                                                                ? isAtRisk
                                                                    ? 'At Risk'
                                                                    : isExpiringSoon
                                                                        ? 'Expiring Soon'
                                                                        : 'Active'
                                                                : 'Expired'}
                                                        </span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                        <span>
                            Showing {filteredSubscribers.length} of {subscribers.length} subscribers
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevenueSubscriptions;
