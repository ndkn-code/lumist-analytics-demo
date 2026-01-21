import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { LayoutGrid, Users, FileText, MessageCircle } from 'lucide-react';
import { getAccountsForPlatform } from '../../../lib/platformConfig';

// LocalStorage key for persisting selected account
const STORAGE_KEY = 'lumist-social-account-instagram';

// Instagram gradient colors
const IG_GRADIENT = 'bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45]';

// Instagram sub-tab configuration
const INSTAGRAM_TABS = [
    {
        id: 'overview',
        label: 'Overview',
        path: '/social-media/instagram/overview',
        icon: LayoutGrid,
        available: true
    },
    {
        id: 'audience',
        label: 'Audience',
        path: '/social-media/instagram/audience',
        icon: Users,
        available: true
    },
    {
        id: 'content',
        label: 'Content',
        path: '/social-media/instagram/content',
        icon: FileText,
        available: true
    },
    {
        id: 'engagement',
        label: 'Engagement',
        path: '/social-media/instagram/engagement',
        icon: MessageCircle,
        available: true
    }
];

// Secondary Tab Component
const SubTab = ({ tab, isActive }) => {
    const Icon = tab.icon;

    return (
        <NavLink
            to={tab.path}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 ease-in-out border
                ${isActive
                    ? 'bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white border-transparent shadow-sm'
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

const InstagramLayout = () => {
    const location = useLocation();
    const parentContext = useOutletContext();

    // Account selection state
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('ig-demo-account');
    const [accountsLoading, setAccountsLoading] = useState(false);

    // For demo, just use the demo account
    useEffect(() => {
        setAccounts([{ id: 'ig-demo-account', account_name: 'Lumist Instagram' }]);
        setSelectedAccountId('ig-demo-account');
    }, []);

    // Redirect to overview if at /social-media/instagram root
    if (location.pathname === '/social-media/instagram' || location.pathname === '/social-media/instagram/') {
        return <Navigate to="/social-media/instagram/overview" replace />;
    }

    // Determine active tab
    const activeTab = INSTAGRAM_TABS.find(t => location.pathname === t.path);

    // Extended context
    const extendedContext = {
        ...parentContext,
        selectedAccountId,
        accountsLoading,
        accounts,
        onAccountChange: setSelectedAccountId
    };

    return (
        <div className="space-y-4">
            {/* Sub-tabs Navigation */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-1">
                    {INSTAGRAM_TABS.map((tab) => (
                        <SubTab
                            key={tab.id}
                            tab={tab}
                            isActive={activeTab?.id === tab.id}
                        />
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <Outlet context={extendedContext} />
        </div>
    );
};

export default InstagramLayout;
