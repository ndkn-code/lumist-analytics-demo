import React from 'react';
import { Outlet, NavLink, Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { LayoutGrid, MessageSquare, Users, Filter } from 'lucide-react';

// Discord brand color
const DISCORD_BLUE = '#5865F2';

// Discord sub-tab configuration
const DISCORD_TABS = [
    {
        id: 'overview',
        label: 'Overview',
        path: '/social-media/discord/overview',
        icon: LayoutGrid,
        available: true
    },
    {
        id: 'engagement',
        label: 'Engagement',
        path: '/social-media/discord/engagement',
        icon: MessageSquare,
        available: true
    },
    {
        id: 'audience',
        label: 'Audience',
        path: '/social-media/discord/audience',
        icon: Users,
        available: true
    },
    {
        id: 'funnel',
        label: 'Funnel',
        path: '/social-media/discord/funnel',
        icon: Filter,
        available: true
    }
];

// Secondary Tab Component - Smaller pill style
const SubTab = ({ tab, isActive }) => {
    const Icon = tab.icon;

    return (
        <NavLink
            to={tab.path}
            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 ease-in-out border
                ${isActive
                    ? 'bg-[#5865F2] text-white border-[#5865F2] shadow-sm'
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

const DiscordLayout = () => {
    const location = useLocation();
    const parentContext = useOutletContext();

    // Redirect to overview if at /social-media/discord root
    if (location.pathname === '/social-media/discord' || location.pathname === '/social-media/discord/') {
        return <Navigate to="/social-media/discord/overview" replace />;
    }

    // Determine active tab
    const activeTab = DISCORD_TABS.find(t => location.pathname === t.path);

    return (
        <div className="space-y-4">
            {/* Sub-tabs Navigation - Horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-1">
                    {DISCORD_TABS.map((tab) => (
                        <SubTab
                            key={tab.id}
                            tab={tab}
                            isActive={activeTab?.id === tab.id}
                        />
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <Outlet context={parentContext} />
        </div>
    );
};

export default DiscordLayout;
