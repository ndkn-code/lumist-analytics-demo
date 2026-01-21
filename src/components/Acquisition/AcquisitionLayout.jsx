import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { BarChart3, Users } from 'lucide-react';

const SUB_TABS = [
    { path: '', label: 'Overview', icon: BarChart3, end: true },
    { path: 'cohorts', label: 'Cohorts', icon: Users, end: false },
];

const AcquisitionLayout = () => {
    const outletContext = useOutletContext();

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {SUB_TABS.map(({ path, label, icon: Icon, end }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={end}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-white text-violet-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`
                        }
                    >
                        <Icon size={16} />
                        {label}
                    </NavLink>
                ))}
            </div>

            {/* Sub-route Content */}
            <Outlet context={outletContext} />
        </div>
    );
};

export default AcquisitionLayout;
