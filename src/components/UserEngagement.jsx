import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import UserEngagementActivity from './UserEngagementActivity';
import UserEngagementRetention from './UserEngagementRetention';

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const UserEngagement = () => {
    const [activeTab, setActiveTab] = useState('activity');
    const { dateRange, DateRangeFilterComponent } = useOutletContext();
    const [startDate, endDate] = dateRange;

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Page Header - Title + Date Filter aligned */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">User Engagement</h1>
                {DateRangeFilterComponent}
            </div>

            {/* Subtab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${activeTab === 'activity'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }
                    `}
                >
                    Activity
                </button>
                <button
                    onClick={() => setActiveTab('retention')}
                    className={`
                        px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${activeTab === 'retention'
                            ? 'bg-white text-violet-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }
                    `}
                >
                    Retention
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'activity' ? (
                <UserEngagementActivity
                    dateRange={dateRange}
                    rangeKey={`${toDateString(startDate)}_${toDateString(endDate)}`}
                />
            ) : (
                <UserEngagementRetention />
            )}
        </div>
    );
};

export default UserEngagement;
