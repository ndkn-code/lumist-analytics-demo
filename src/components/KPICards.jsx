import React from 'react';
import { Users, TrendingUp, CalendarDays, UserCheck } from 'lucide-react';

// Helper to parse YYYY-MM-DD string as local date (avoids timezone shift)
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const KPICard = ({ title, value, subtext, icon: Icon, iconBgColor, iconColor, delta }) => (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start mb-3 md:mb-4">
            <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">{value}</h3>
                    {delta !== null && delta !== undefined && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${delta >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div className={`p-2 rounded-xl ${iconBgColor}`}>
                <Icon size={18} className={`${iconColor} md:w-5 md:h-5`} />
            </div>
        </div>
        {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
    </div>
);

const KPICards = ({ data, deltas, kpiStats, mau, totalUsers }) => {
    if (!data || data.length === 0 || !kpiStats) return null;

    // Use pre-calculated values from parent (single source of truth - excludes today's incomplete data)
    const { averageDAU, peakDay } = kpiStats;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
            <KPICard
                title="Average DAU"
                value={averageDAU.toLocaleString()}
                subtext="Daily active users on average"
                icon={Users}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
                delta={deltas?.dau}
            />
            <KPICard
                title="Peak DAU"
                value={peakDay?.active_users?.toLocaleString() || '0'}
                subtext={peakDay ? `On ${parseLocalDate(peakDay.activity_date).toLocaleDateString()}` : 'No data'}
                icon={TrendingUp}
                iconBgColor="bg-emerald-100"
                iconColor="text-emerald-600"
            />
            <KPICard
                title="MAU"
                value={mau?.toLocaleString() || '—'}
                subtext="Monthly active users (current)"
                icon={CalendarDays}
                iconBgColor="bg-sky-100"
                iconColor="text-sky-600"
            />
            <KPICard
                title="Total Users"
                value={totalUsers?.toLocaleString() || '—'}
                subtext="All-time registered users"
                icon={UserCheck}
                iconBgColor="bg-violet-100"
                iconColor="text-violet-600"
            />
        </div>
    );
};

export default KPICards;
