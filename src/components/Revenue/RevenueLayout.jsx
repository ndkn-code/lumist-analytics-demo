import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useOutletContext } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { supabaseSocial as proxySupabase } from '../../lib/supabase';

// Tab configuration
const TABS = [
    { id: 'overview', label: 'Overview', path: '/revenue', end: true },
    { id: 'transactions', label: 'Transactions', path: '/revenue/transactions' },
    { id: 'analytics', label: 'Analytics', path: '/revenue/analytics' },
    { id: 'subscriptions', label: 'Subscriptions', path: '/revenue/subscriptions' }
];

// Currency toggle component
const CurrencyToggle = ({ currency, setCurrency, isLoading }) => {
    return (
        <div className="flex items-center gap-2">
            {isLoading && (
                <RefreshCw size={14} className="text-slate-400 animate-spin" />
            )}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                    onClick={() => setCurrency('USD')}
                    className={`
                        px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
                        ${currency === 'USD'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }
                    `}
                >
                    USD
                </button>
                <button
                    onClick={() => setCurrency('VND')}
                    className={`
                        px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200
                        ${currency === 'VND'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }
                    `}
                >
                    VND
                </button>
            </div>
        </div>
    );
};

// Tab component
const Tab = ({ tab, isActive }) => (
    <NavLink
        to={tab.path}
        end={tab.end}
        className={`
            px-4 py-2.5 text-sm font-medium
            border-b-2 transition-all duration-200 ease-in-out
            ${isActive
                ? 'text-violet-700 border-violet-600'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }
        `}
    >
        {tab.label}
    </NavLink>
);

// Helper to format date as YYYY-MM-DD
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const RevenueLayout = () => {
    const location = useLocation();
    const parentContext = useOutletContext();

    // Currency state with localStorage persistence
    const [currency, setCurrencyState] = useState(() => {
        const saved = localStorage.getItem('revenue-currency');
        return saved === 'VND' ? 'VND' : 'USD';
    });

    // Exchange rates state
    const [exchangeRates, setExchangeRates] = useState(new Map());
    const [isLoadingRates, setIsLoadingRates] = useState(true);

    // Persist currency preference
    const setCurrency = useCallback((newCurrency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('revenue-currency', newCurrency);
    }, []);

    // Fetch exchange rates on mount
    useEffect(() => {
        const fetchExchangeRates = async () => {
            setIsLoadingRates(true);
            try {
                const today = toDateString(new Date());

                // Try to get today's rates first
                let { data, error } = await proxySupabase
                    .schema('public_analytics')
                    .from('daily_exchange_rates')
                    .select('currency_code, rate_to_usd')
                    .eq('rate_date', today);

                // If no rates for today, get the most recent rates
                if (error || !data || data.length === 0) {
                    const result = await proxySupabase
                        .schema('public_analytics')
                        .from('daily_exchange_rates')
                        .select('currency_code, rate_to_usd')
                        .order('rate_date', { ascending: false })
                        .limit(10);

                    data = result.data;
                    error = result.error;
                }

                if (error) {
                    console.error('Error fetching exchange rates:', error);
                    // Set default rates as fallback (1 USD = 26,100 VND)
                    setExchangeRates(new Map([
                        ['VND', 26100],
                        ['EUR', 0.92],
                        ['GBP', 0.79]
                    ]));
                } else if (data && data.length > 0) {
                    const rates = new Map();
                    data.forEach(row => {
                        rates.set(row.currency_code, row.rate_to_usd);
                    });
                    setExchangeRates(rates);
                }
            } catch (err) {
                console.error('Failed to fetch exchange rates:', err);
                // Set default rates as fallback (1 USD = 26,100 VND)
                setExchangeRates(new Map([
                    ['VND', 26100],
                    ['EUR', 0.92],
                    ['GBP', 0.79]
                ]));
            } finally {
                setIsLoadingRates(false);
            }
        };

        fetchExchangeRates();
    }, []);

    // Convert amount from a currency to USD
    const convertToUSD = useCallback((amount, fromCurrency) => {
        if (fromCurrency === 'USD') return amount;
        const rate = exchangeRates.get(fromCurrency);
        if (!rate) {
            console.warn(`Exchange rate not found for ${fromCurrency}`);
            return amount;
        }
        return amount / rate;
    }, [exchangeRates]);

    // Convert amount from USD to target currency
    const convertToCurrency = useCallback((amountUSD, toCurrency) => {
        if (toCurrency === 'USD') return amountUSD;
        const rate = exchangeRates.get(toCurrency);
        if (!rate) {
            console.warn(`Exchange rate not found for ${toCurrency}`);
            return amountUSD;
        }
        return amountUSD * rate;
    }, [exchangeRates]);

    // Redirect to overview if at /revenue root
    if (location.pathname === '/revenue' || location.pathname === '/revenue/') {
        // Don't redirect - overview is the index route
    }

    // Determine active tab from path
    const activeTab = TABS.find(tab => {
        if (tab.end) {
            return location.pathname === tab.path || location.pathname === tab.path + '/';
        }
        return location.pathname.startsWith(tab.path);
    });

    // Context to pass to child components
    const revenueContext = {
        ...parentContext,
        currency,
        setCurrency,
        exchangeRates,
        convertToUSD,
        convertToCurrency,
        isLoadingRates
    };

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-800">
                        Revenue Analytics
                    </h1>
                    <CurrencyToggle
                        currency={currency}
                        setCurrency={setCurrency}
                        isLoading={isLoadingRates}
                    />
                </div>
                {parentContext?.DateRangeFilterComponent}
            </div>

            {/* Tab Navigation - Horizontal scroll on mobile */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex min-w-max border-b border-slate-200">
                        {TABS.map((tab) => (
                            <Tab
                                key={tab.id}
                                tab={tab}
                                isActive={activeTab?.id === tab.id}
                            />
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    <Outlet context={revenueContext} />
                </div>
            </div>
        </div>
    );
};

export default RevenueLayout;
