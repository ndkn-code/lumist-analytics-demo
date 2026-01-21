import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { LayoutGrid, Users, FileText, MessageCircle, TrendingUp } from 'lucide-react';
import { getAccountsForPlatform } from '../../../lib/platformConfig';

// LocalStorage key for persisting selected account
const STORAGE_KEY = 'lumist-social-account-threads';

// Threads sub-tab configuration
const THREADS_TABS = [
    {
        id: 'overview',
        label: 'Overview',
        path: '/social-media/threads/overview',
        icon: LayoutGrid,
        available: true
    },
    {
        id: 'audience',
        label: 'Audience',
        path: '/social-media/threads/audience',
        icon: Users,
        available: true
    },
    {
        id: 'content',
        label: 'Content Performance',
        path: '/social-media/threads/content',
        icon: FileText,
        available: true
    },
    {
        id: 'engagement',
        label: 'Engagement',
        path: '/social-media/threads/engagement',
        icon: MessageCircle,
        available: true
    },
    {
        id: 'trends',
        label: 'Trends & Insights',
        path: '/social-media/threads/trends',
        icon: TrendingUp,
        available: false
    }
];

// Secondary Tab Component - Smaller pill style with Threads branding
const SubTab = ({ tab, isActive }) => {
    const Icon = tab.icon;

    return (
        <NavLink
            to={tab.path}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 ease-in-out border
                ${isActive
                    ? 'bg-black text-white border-black shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }
                ${!tab.available && !isActive ? 'opacity-60' : ''}
            `}
        >
            <Icon size={14} />
            <span>{tab.label}</span>
            {!tab.available && (
                <span className="ml-1.5 px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded-full uppercase tracking-wide">
                    Soon
                </span>
            )}
        </NavLink>
    );
};

const ThreadsLayout = () => {
    const location = useLocation();
    const parentContext = useOutletContext();

    // Account selection state
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const [accountsLoading, setAccountsLoading] = useState(true);

    // Fetch accounts on mount
    useEffect(() => {
        const loadAccounts = async () => {
            setAccountsLoading(true);
            try {
                const platformAccounts = await getAccountsForPlatform('threads');
                setAccounts(platformAccounts);

                // Restore from localStorage or default to first account
                const storedId = localStorage.getItem(STORAGE_KEY);
                const validStoredAccount = platformAccounts.find(a => a.id === storedId);

                if (validStoredAccount) {
                    setSelectedAccountId(storedId);
                } else if (platformAccounts.length > 0) {
                    setSelectedAccountId(platformAccounts[0].id);
                    // Clean up stale localStorage entry
                    if (storedId) {
                        localStorage.removeItem(STORAGE_KEY);
                    }
                }
            } catch (err) {
                console.error('Error loading Threads accounts:', err);
            } finally {
                setAccountsLoading(false);
            }
        };

        loadAccounts();
    }, []);

    // Persist selection to localStorage
    const handleAccountChange = (accountId) => {
        setSelectedAccountId(accountId);
        localStorage.setItem(STORAGE_KEY, accountId);
    };

    // Redirect to overview if at /social-media/threads root
    if (location.pathname === '/social-media/threads' || location.pathname === '/social-media/threads/') {
        return <Navigate to="/social-media/threads/overview" replace />;
    }

    // Determine active tab
    const activeTab = THREADS_TABS.find(t => location.pathname === t.path);

    // Extended context with account selection and change handler
    const extendedContext = {
        ...parentContext,
        selectedAccountId,
        accountsLoading,
        accounts,
        onAccountChange: handleAccountChange
    };

    return (
        <div className="space-y-4">
            {/* Sub-tabs Navigation */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-1">
                    {THREADS_TABS.map((tab) => (
                        <SubTab
                            key={tab.id}
                            tab={tab}
                            isActive={activeTab?.id === tab.id}
                        />
                    ))}
                </div>
            </div>

            {/* Tab Content - Pass extended context */}
            <Outlet context={extendedContext} />
        </div>
    );
};

export default ThreadsLayout;
