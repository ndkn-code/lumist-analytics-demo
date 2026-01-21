import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import {
    Search,
    Filter,
    Download,
    ChevronUp,
    ChevronDown,
    Copy,
    Check,
    CreditCard,
    Wallet,
    Building,
    Loader2,
    Receipt,
    X
} from 'lucide-react';

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Vietnam timezone (GMT+7)
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Helper to format timestamp in Vietnam timezone (GMT+7)
const formatVietnamTime = (utcTimestamp, formatString) => {
    if (!utcTimestamp) return '-';
    const vietnamTime = utcToZonedTime(new Date(utcTimestamp), VIETNAM_TIMEZONE);
    return format(vietnamTime, formatString);
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

// Format processing time
const formatProcessingTime = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

// Truncate string with ellipsis
const truncate = (str, length = 12) => {
    if (!str) return '-';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
};

// Status styles
const STATUS_STYLES = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    failed: 'bg-rose-50 text-rose-700 border border-rose-200',
    refunded: 'bg-slate-50 text-slate-700 border border-slate-200',
};

// Provider config with brand colors
const PROVIDER_CONFIG = {
    stripe: { bg: 'bg-[#635BFF]/10', text: 'text-[#635BFF]', icon: CreditCard, label: 'Stripe' },
    zalopay: { bg: 'bg-[#03CA77]/10', text: 'text-[#03CA77]', icon: Wallet, label: 'ZaloPay' },
    vnpay: { bg: 'bg-[#005BAA]/10', text: 'text-[#005BAA]', icon: Building, label: 'VNPay' },
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

// Filter options
const PROVIDER_OPTIONS = ['All', 'Stripe', 'ZaloPay', 'VNPay'];
const STATUS_OPTIONS = ['All', 'Success', 'Pending', 'Failed', 'Refunded'];
const PLAN_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'monthly', label: 'Monthly' },
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: 'yearly', label: 'Yearly' }
];

const ITEMS_PER_PAGE = 25;

// Copy button component
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
            title="Copy to clipboard"
        >
            {copied ? (
                <Check size={14} className="text-emerald-500" />
            ) : (
                <Copy size={14} className="text-slate-400" />
            )}
        </button>
    );
};

// Provider badge component
const ProviderBadge = ({ provider }) => {
    const key = provider?.toLowerCase();
    const config = PROVIDER_CONFIG[key] || { bg: 'bg-slate-50', text: 'text-slate-700', icon: CreditCard, label: provider || 'Unknown' };
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <Icon size={12} />
            {config.label}
        </span>
    );
};

// Status badge component
const StatusBadge = ({ status }) => {
    const key = status?.toLowerCase() || 'pending';
    const style = STATUS_STYLES[key] || STATUS_STYLES.pending;

    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
        </span>
    );
};

// Sortable header component
const SortableHeader = ({ label, sortKey, currentSort, onSort, className = '', width = '' }) => {
    const isActive = currentSort.key === sortKey;
    const isAsc = currentSort.direction === 'asc';

    return (
        <th
            className={`py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 transition-colors ${width} ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : ''}`}>
                {label}
                <span className="flex flex-col">
                    <ChevronUp
                        size={12}
                        className={`-mb-1 ${isActive && isAsc ? 'text-violet-600' : 'text-slate-300'}`}
                    />
                    <ChevronDown
                        size={12}
                        className={`${isActive && !isAsc ? 'text-violet-600' : 'text-slate-300'}`}
                    />
                </span>
            </div>
        </th>
    );
};

// Filter dropdown component (supports both string arrays and {value, label} objects)
const FilterDropdown = ({ label, value, options, onChange }) => {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
                {options.map(opt => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                        <option key={optValue} value={optValue}>{optLabel}</option>
                    );
                })}
            </select>
        </div>
    );
};

// Summary stat card
const StatCard = ({ label, value, subtext }) => (
    <div className="bg-slate-50 rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
        {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </div>
);

// Skeleton loader for table
const TableSkeleton = () => (
    <div className="animate-pulse">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-4 bg-slate-200 rounded w-28" />
                <div className="h-4 bg-slate-200 rounded w-20" />
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-16" />
            </div>
        ))}
    </div>
);

const RevenueTransactions = () => {
    const {
        dateRange,
        currency,
        convertToUSD,
        convertToCurrency
    } = useOutletContext();

    const [startDate, endDate] = dateRange;
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [providerFilter, setProviderFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('Success');
    const [planFilter, setPlanFilter] = useState('All');

    // Sort state
    const [sort, setSort] = useState({ key: 'created_at', direction: 'desc' });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch transactions
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                const { data, error: fetchError } = await supabase
                    .schema('public_analytics')
                    .from('unified_transactions')
                    .select('*')
                    .gte('transaction_date', startDateString)
                    .lte('transaction_date', endDateString)
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (fetchError) throw fetchError;
                setTransactions(data || []);
            } catch (err) {
                console.error('Error fetching transactions:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [dateRange]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, providerFilter, statusFilter, planFilter, sort]);

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let result = [...transactions];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(txn =>
                (txn.order_info?.toLowerCase().includes(query)) ||
                (txn.transaction_id?.toLowerCase().includes(query)) ||
                (txn.user_id?.toLowerCase().includes(query))
            );
        }

        // Apply provider filter
        if (providerFilter !== 'All') {
            result = result.filter(txn =>
                txn.payment_provider?.toLowerCase() === providerFilter.toLowerCase()
            );
        }

        // Apply status filter
        if (statusFilter !== 'All') {
            result = result.filter(txn =>
                txn.status?.toLowerCase() === statusFilter.toLowerCase()
            );
        }

        // Apply plan filter
        if (planFilter !== 'All') {
            result = result.filter(txn =>
                txn.subscription_plan?.toLowerCase() === planFilter.toLowerCase()
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal = a[sort.key];
            let bVal = b[sort.key];

            // Handle amount sorting (convert to USD for comparison)
            if (sort.key === 'amount') {
                aVal = convertToUSD(a.amount || 0, a.currency || 'USD');
                bVal = convertToUSD(b.amount || 0, b.currency || 'USD');
            }

            // Handle null/undefined
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // String comparison
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [transactions, searchQuery, providerFilter, statusFilter, planFilter, sort, convertToUSD]);

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const total = filteredTransactions.length;
        const successful = filteredTransactions.filter(t => t.status?.toLowerCase() === 'success').length;
        const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : 0;

        const totalRevenue = filteredTransactions.reduce((sum, txn) => {
            const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
            return sum + amountUSD;
        }, 0);

        const processingTimes = filteredTransactions
            .map(t => t.processing_seconds)
            .filter(t => t != null);
        const avgProcessing = processingTimes.length > 0
            ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
            : 0;

        return {
            total,
            successRate,
            totalRevenue: convertToCurrency(totalRevenue, currency),
            avgProcessing
        };
    }, [filteredTransactions, currency, convertToUSD, convertToCurrency]);

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    // Handle sort
    const handleSort = useCallback((key) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    }, []);

    // Reset filters
    const resetFilters = () => {
        setSearchQuery('');
        setProviderFilter('All');
        setStatusFilter('All');
        setPlanFilter('All');
        setCurrentPage(1);
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = [
            'Date',
            'Transaction ID',
            'Provider',
            'Customer',
            'Plan',
            'Amount',
            'Currency',
            'Status',
            'Processing Time (s)'
        ];

        const rows = filteredTransactions.map(txn => [
            formatVietnamTime(txn.created_at, 'yyyy-MM-dd HH:mm:ss'),
            txn.transaction_id || '',
            txn.payment_provider || '',
            txn.user_id || txn.email || '',
            txn.subscription_plan || '',
            txn.amount || 0,
            txn.currency || 'USD',
            txn.status || '',
            txn.processing_seconds || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell =>
                typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
            ).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transactions_${toDateString(startDate)}_${toDateString(endDate)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Check if any filters are active
    const hasActiveFilters = searchQuery || providerFilter !== 'All' || statusFilter !== 'All' || planFilter !== 'All';

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500 block mb-1">Search</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by transaction ID, order info..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <FilterDropdown
                            label="Provider"
                            value={providerFilter}
                            options={PROVIDER_OPTIONS}
                            onChange={setProviderFilter}
                        />
                        <FilterDropdown
                            label="Status"
                            value={statusFilter}
                            options={STATUS_OPTIONS}
                            onChange={setStatusFilter}
                        />
                        <FilterDropdown
                            label="Plan"
                            value={planFilter}
                            options={PLAN_OPTIONS}
                            onChange={setPlanFilter}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-end gap-2">
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={16} />
                                Clear
                            </button>
                        )}
                        <button
                            onClick={exportToCSV}
                            disabled={filteredTransactions.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Total Transactions"
                    value={summaryStats.total.toLocaleString()}
                    subtext={hasActiveFilters ? 'filtered' : undefined}
                />
                <StatCard
                    label="Success Rate"
                    value={`${summaryStats.successRate}%`}
                />
                <StatCard
                    label="Total Revenue"
                    value={formatCurrency(summaryStats.totalRevenue, currency)}
                />
                <StatCard
                    label="Avg Processing"
                    value={formatProcessingTime(summaryStats.avgProcessing)}
                />
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
                {error ? (
                    <div className="p-8 text-center">
                        <p className="text-rose-600">Error loading transactions: {error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-sm text-violet-600 hover:text-violet-700"
                        >
                            Refresh page
                        </button>
                    </div>
                ) : loading ? (
                    <div className="p-6">
                        <TableSkeleton />
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Transactions Found</h3>
                        <p className="text-slate-500 mb-4">
                            {hasActiveFilters
                                ? 'No transactions match your filters.'
                                : 'No transactions in the selected date range.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <SortableHeader
                                            label="Date/Time"
                                            sortKey="created_at"
                                            currentSort={sort}
                                            onSort={handleSort}
                                            className="text-left"
                                            width="w-[160px]"
                                        />
                                        <th className="py-3 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[150px]">
                                            Transaction ID
                                        </th>
                                        <SortableHeader
                                            label="Provider"
                                            sortKey="payment_provider"
                                            currentSort={sort}
                                            onSort={handleSort}
                                            className="text-left"
                                            width="w-[110px]"
                                        />
                                        <th className="py-3 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[160px]">
                                            Customer
                                        </th>
                                        <th className="py-3 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[100px]">
                                            Plan
                                        </th>
                                        <SortableHeader
                                            label="Amount"
                                            sortKey="amount"
                                            currentSort={sort}
                                            onSort={handleSort}
                                            className="text-right"
                                            width="w-[120px]"
                                        />
                                        <SortableHeader
                                            label="Status"
                                            sortKey="status"
                                            currentSort={sort}
                                            onSort={handleSort}
                                            className="text-center"
                                            width="w-[100px]"
                                        />
                                        <th className="py-3 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[100px]">
                                            Processing
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTransactions.map((txn, index) => {
                                        const amountUSD = convertToUSD(txn.amount || 0, txn.currency || 'USD');
                                        const displayAmount = convertToCurrency(amountUSD, currency);

                                        return (
                                            <tr
                                                key={txn.id || index}
                                                className="hover:bg-slate-50 transition-colors"
                                            >
                                                <td className="py-3 px-3 text-sm text-slate-700 whitespace-nowrap">
                                                    {formatVietnamTime(txn.created_at, 'MMM d, yyyy h:mm a')}
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-slate-600 font-mono">
                                                            {truncate(txn.transaction_id, 14)}
                                                        </span>
                                                        {txn.transaction_id && (
                                                            <CopyButton text={txn.transaction_id} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <ProviderBadge provider={txn.payment_provider} />
                                                </td>
                                                <td className="py-3 px-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-slate-600 truncate max-w-[120px]">
                                                            {txn.user_id || txn.email || '-'}
                                                        </span>
                                                        {(txn.user_id || txn.email) && (
                                                            <CopyButton text={txn.user_id || txn.email} />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-sm text-slate-700 whitespace-nowrap">
                                                    {formatPlanName(txn.subscription_plan)}
                                                </td>
                                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                                    <div>
                                                        <span className="text-sm font-semibold text-slate-800">
                                                            {formatCurrency(displayAmount, currency)}
                                                        </span>
                                                        {txn.currency && txn.currency !== currency && (
                                                            <span className="block text-xs text-slate-400">
                                                                {formatCurrency(txn.amount, txn.currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                                    <StatusBadge status={txn.status} />
                                                </td>
                                                <td className="py-3 px-3 text-right text-sm text-slate-600 whitespace-nowrap">
                                                    {formatProcessingTime(txn.processing_seconds)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50">
                                <p className="text-sm text-slate-600">
                                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} transactions
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-violet-600 text-white'
                                                        : 'text-slate-600 hover:text-slate-800 hover:bg-white'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RevenueTransactions;
