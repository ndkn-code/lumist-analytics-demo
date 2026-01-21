import React from 'react';
import { Outlet, NavLink, Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { Facebook, AtSign, Instagram, Video, MessageCircle } from 'lucide-react';

// Platform configuration with icons and colors
const PLATFORMS = [
    {
        id: 'facebook',
        label: 'Facebook',
        path: '/social-media/facebook',
        icon: Facebook,
        color: '#1877F2',
        bgActive: 'bg-[#1877F2]',
        textActive: 'text-white',
        available: true
    },
    {
        id: 'threads',
        label: 'Threads',
        path: '/social-media/threads',
        icon: AtSign,
        color: '#000000',
        bgActive: 'bg-black',
        textActive: 'text-white',
        available: true
    },
    {
        id: 'discord',
        label: 'Discord',
        path: '/social-media/discord',
        icon: MessageCircle,
        color: '#5865F2',
        bgActive: 'bg-[#5865F2]',
        textActive: 'text-white',
        available: true
    },
    {
        id: 'instagram',
        label: 'Instagram',
        path: '/social-media/instagram',
        icon: Instagram,
        color: '#E4405F',
        bgActive: 'bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45]',
        textActive: 'text-white',
        available: false
    },
    {
        id: 'tiktok',
        label: 'TikTok',
        path: '/social-media/tiktok',
        icon: Video,
        color: '#ff0050',
        bgActive: 'bg-[#ff0050]',
        textActive: 'text-white',
        available: false
    }
];

// Platform Tab Component
const PlatformTab = ({ platform, isActive }) => {
    const Icon = platform.icon;

    return (
        <NavLink
            to={platform.path}
            className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200 ease-in-out
                ${isActive
                    ? `${platform.bgActive} ${platform.textActive} shadow-md`
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200'
                }
                ${!platform.available && !isActive ? 'opacity-60' : ''}
            `}
        >
            <Icon size={18} />
            <span>{platform.label}</span>
            {!platform.available && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 ml-1">
                    Soon
                </span>
            )}
        </NavLink>
    );
};

const SocialMediaLayout = () => {
    const location = useLocation();
    const parentContext = useOutletContext();

    // Redirect to Facebook if at /social-media root
    if (location.pathname === '/social-media' || location.pathname === '/social-media/') {
        return <Navigate to="/social-media/facebook" replace />;
    }

    // Determine active platform from path
    const activePlatform = PLATFORMS.find(p => location.pathname.startsWith(p.path));

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-800">Social Media Analytics</h1>
                </div>
                {parentContext?.DateRangeFilterComponent}
            </div>

            {/* Platform Tabs - Horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="flex gap-2 min-w-max pb-1">
                    {PLATFORMS.map((platform) => (
                        <PlatformTab
                            key={platform.id}
                            platform={platform}
                            isActive={activePlatform?.id === platform.id}
                        />
                    ))}
                </div>
            </div>

            {/* Platform Content */}
            <Outlet context={parentContext} />
        </div>
    );
};

export default SocialMediaLayout;
