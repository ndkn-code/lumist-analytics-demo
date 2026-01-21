/**
 * Layout Component - Demo Version
 *
 * Main app shell with responsive sidebar and demo banner.
 * Simplified without activity tracking.
 */

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PieChart, Menu, X, LogOut, Share2, Wallet, Shield, UserPlus, Info } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import { subDays } from 'date-fns';
import { useAuth } from '../auth';

// Shared padding constants for pixel-perfect alignment
const SIDEBAR_PADDING = {
    collapsed: 'px-3',      // Centered padding when collapsed
    expanded: 'px-4',       // Left-aligned padding when expanded
};

// Navigation items grouped by section - All visible in demo
const NAV_SECTIONS = [
    {
        header: 'ANALYTICS',
        items: [
            { path: '/', label: 'User Engagement', icon: LayoutDashboard },
            { path: '/features', label: 'Feature Adoption', icon: PieChart },
            { path: '/revenue', label: 'Revenue', icon: Wallet },
            { path: '/acquisition', label: 'Acquisition', icon: UserPlus },
            { path: '/social-media', label: 'Social Media', icon: Share2 },
        ]
    },
    {
        header: 'ADMIN',
        items: [
            { path: '/admin', label: 'Admin Panel', icon: Shield },
        ]
    }
];

// User Profile Footer Component (Demo Version)
const UserProfileFooter = ({ isCollapsed, profile, organization }) => {
    return (
        <div className={`
            py-4 border-t border-slate-100
            transition-all duration-300 ease-in-out
            ${isCollapsed ? 'px-3' : 'px-4'}
        `}>
            <div className={`
                flex items-center
                ${isCollapsed ? 'justify-center' : 'gap-3'}
            `}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                    <span className="text-white text-sm font-semibold">
                        D
                    </span>
                </div>

                {/* User Info - Hidden when collapsed */}
                <div className={`
                    flex-1 min-w-0
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden' : 'md:opacity-100 md:w-auto'}
                `}>
                    <p className="text-sm font-medium text-slate-700 truncate">
                        {profile?.display_name || 'Demo User'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                        {organization?.name || 'Lumist Demo'}
                    </p>
                </div>

                {/* Demo Badge - Hidden when collapsed */}
                <div className={`
                    px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full text-xs font-medium
                    transition-all duration-300 ease-in-out
                    ${isCollapsed ? 'md:hidden' : ''}
                `}>
                    Demo
                </div>
            </div>
        </div>
    );
};

// Nav Item Component with Ghost Active Style
const NavItem = ({ item, isActive, isCollapsed, onClick }) => {
    const Icon = item.icon;

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) onClick();
    };

    return (
        <Link
            to={item.path}
            onClick={handleClick}
            title={isCollapsed ? item.label : undefined}
            className={`
                relative flex items-center rounded-xl text-sm
                h-12 md:h-11
                transition-all duration-200 ease-in-out
                touch-manipulation
                ${isCollapsed
                    ? 'md:justify-center md:px-0 px-3 gap-3 md:gap-0'
                    : 'md:justify-start px-3 gap-3'
                }
                ${isActive
                    ? 'bg-violet-50 text-violet-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium active:bg-slate-100'
                }
            `}
        >
            {/* Left Accent Bar for Active State */}
            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-600 rounded-r-full" />
            )}

            <Icon
                size={20}
                className={`flex-shrink-0 ${isActive ? 'text-violet-600' : ''}`}
            />
            <span className={`
                whitespace-nowrap
                transition-all duration-300 ease-in-out
                ${isCollapsed ? 'md:opacity-0 md:w-0 md:overflow-hidden md:ml-0' : 'md:opacity-100 md:w-auto'}
            `}>
                {item.label}
            </span>
        </Link>
    );
};

// Demo mode: Use fixed date range ending June 30, 2025
const DEMO_END_DATE = new Date(2025, 5, 30); // June 30, 2025

const Layout = () => {
    const [dateRange, setDateRange] = useState([subDays(DEMO_END_DATE, 30), DEMO_END_DATE]);
    const [startDate, endDate] = dateRange;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [showDemoBanner, setShowDemoBanner] = useState(true);
    const location = useLocation();

    // Auth hooks (demo version)
    const { profile, organization } = useAuth();

    // All navigation sections visible in demo mode
    const visibleNavSections = NAV_SECTIONS;

    // Close sidebar when route changes on mobile
    const handleNavClick = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
            {/* Demo Banner - Fixed at top */}
            {showDemoBanner && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
                    <Info size={16} />
                    <span>
                        <strong>Demo Mode:</strong> This is a portfolio showcase with simulated data. No real user information is displayed.
                    </span>
                    <button
                        onClick={() => setShowDemoBanner(false)}
                        className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
                        aria-label="Dismiss banner"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Mobile Header - Only visible on small screens */}
            <header className={`
                md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm sticky z-40
                ${showDemoBanner ? 'top-[40px]' : 'top-0'}
            `}>
                <div className="flex items-center gap-2">
                    <img
                        src="/logo-icon.png"
                        alt="Lumist"
                        className="h-8 w-auto"
                    />
                    <span className="text-xl font-bold">
                        <span className="text-slate-700">Lumist</span>
                        <span className="text-blue-600">.ai</span>
                    </span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-[60]"
                    style={{ top: showDemoBanner ? '97px' : '57px' }}
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Desktop Sidebar - Pushes content, not overlapping */}
            <aside
                onMouseEnter={() => setIsCollapsed(false)}
                onMouseLeave={() => setIsCollapsed(true)}
                className={`
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0
                    fixed md:sticky
                    left-0
                    ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'}
                    w-64 bg-white border-r border-gray-100
                    flex flex-col flex-shrink-0
                    shadow-xl md:shadow-sm
                    z-[70]
                    transition-all duration-300 ease-in-out
                `}
                style={{
                    top: showDemoBanner ? (window.innerWidth >= 768 ? '40px' : '97px') : (window.innerWidth >= 768 ? '0' : '57px'),
                    height: showDemoBanner ? (window.innerWidth >= 768 ? 'calc(100vh - 40px)' : 'calc(100vh - 97px)') : (window.innerWidth >= 768 ? '100vh' : 'calc(100vh - 57px)')
                }}
            >
                {/* Mobile Close Button - Only visible when sidebar is open on mobile */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Navigation</span>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Logo Header - Premium styling with more spacing */}
                <div className={`
                    hidden md:flex items-center mb-10
                    h-16
                    transition-all duration-300 ease-in-out
                    ${isCollapsed
                        ? `${SIDEBAR_PADDING.collapsed} justify-center`
                        : `${SIDEBAR_PADDING.expanded} justify-start`
                    }
                `}>
                    <div className={`
                        flex items-center
                        ${isCollapsed ? 'justify-center w-full' : 'justify-start gap-3'}
                    `}>
                        <img
                            src="/logo-icon.png"
                            alt="Lumist"
                            className="h-10 w-10 flex-shrink-0 object-contain"
                        />
                        <span className={`
                            text-xl font-bold whitespace-nowrap
                            transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100 w-auto'}
                        `}>
                            <span className="text-slate-700">Lumist</span>
                            <span className="text-blue-600">.ai</span>
                        </span>
                    </div>
                </div>

                {/* Navigation with Section Headers */}
                <nav className={`
                    flex-1 space-y-1 overflow-y-auto pb-4
                    ${isCollapsed ? SIDEBAR_PADDING.collapsed : SIDEBAR_PADDING.expanded}
                `}>
                    {visibleNavSections.map((section, sectionIndex) => (
                        <div key={section.header}>
                            {/* Section Header - Hidden when collapsed */}
                            {!isCollapsed && (
                                <div className={`
                                    text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3
                                    ${sectionIndex === 0 ? 'mt-0' : 'mt-6'}
                                `}>
                                    {section.header}
                                </div>
                            )}

                            {/* Section Items */}
                            <div className="space-y-2 md:space-y-1">
                                {section.items.map((item) => {
                                    const isActive = item.path === '/'
                                        ? location.pathname === '/'
                                        : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                                    return (
                                        <NavItem
                                            key={item.path}
                                            item={item}
                                            isActive={isActive}
                                            isCollapsed={isCollapsed}
                                            onClick={handleNavClick}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User Profile Footer */}
                <UserProfileFooter
                    isCollapsed={isCollapsed}
                    profile={profile}
                    organization={organization}
                />
            </aside>

            {/* Main Content Area - Shifts with sidebar */}
            <div className={`
                flex-1 flex flex-col min-h-0
                transition-all duration-300 ease-in-out
                overflow-hidden
                ${showDemoBanner ? 'md:pt-[40px]' : ''}
            `}>
                {/* Page Content - Light gray background */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-auto bg-gray-50">
                    <Outlet context={{
                        dateRange,
                        DateRangeFilterComponent: (
                            <DateRangeFilter
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(update) => setDateRange(update)}
                            />
                        )
                    }} />
                </main>
            </div>
        </div>
    );
};

export default Layout;
