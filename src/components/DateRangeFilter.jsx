import React, { useMemo } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from 'lucide-react';
import { subDays, startOfDay, isSameDay } from 'date-fns';

// Quick filter presets
// Note: 'days' represents the offset from the reference date (subDays value)
// For "Last 7 Days": Reference date + 6 days back = 7 total days (not 8!)
// For "Last 30 Days": Reference date + 29 days back = 30 total days (not 31!)
const QUICK_FILTERS = [
    { label: '7D', days: 6 },   // 7 days total: reference + 6 days back
    { label: '30D', days: 29 }, // 30 days total: reference + 29 days back
    { label: 'All', days: 'all' },
];

// Demo mode: Use fixed date range (Jan 1 - Jun 30, 2025)
// This ensures filters work with mock data
const DEMO_END_DATE = new Date(2025, 5, 30);   // June 30, 2025
const PROJECT_START_DATE = new Date(2025, 0, 1); // Jan 1, 2025

// Helper to get reference date (demo uses fixed end date)
const getReferenceDate = () => DEMO_END_DATE;

const DateRangeFilter = ({ startDate, endDate, onChange }) => {
    // Check if current range matches a quick filter preset
    const activePreset = useMemo(() => {
        if (!startDate || !endDate) return null;

        const referenceDate = startOfDay(getReferenceDate());
        const endIsReference = isSameDay(startOfDay(endDate), referenceDate);

        if (!endIsReference) return null;

        // Check "All Time" first
        if (isSameDay(startOfDay(startDate), startOfDay(PROJECT_START_DATE))) {
            return 'all';
        }

        for (const filter of QUICK_FILTERS) {
            if (filter.days === 'all') continue;
            const presetStart = startOfDay(subDays(getReferenceDate(), filter.days));
            if (isSameDay(startOfDay(startDate), presetStart)) {
                return filter.days;
            }
        }
        return null;
    }, [startDate, endDate]);

    // Handle quick filter button clicks
    const handleQuickFilter = (days) => {
        if (days === 'all') {
            onChange([PROJECT_START_DATE, getReferenceDate()]);
        } else {
            const newStart = subDays(getReferenceDate(), days);
            const newEnd = getReferenceDate();
            onChange([newStart, newEnd]);
        }
    };

    // Handle individual date changes
    const handleStartChange = (date) => {
        onChange([date, endDate]);
    };

    const handleEndChange = (date) => {
        onChange([startDate, date]);
    };

    // Prevent keyboard input - force calendar usage
    const preventKeyboardInput = (e) => {
        e.preventDefault();
    };

    return (
        <div className="flex flex-col items-stretch gap-2 w-full md:w-auto md:flex-row md:items-center md:gap-3">
            {/* Quick Filter Presets */}
            <div className="flex items-center justify-center gap-1 md:gap-2">
                {QUICK_FILTERS.map((filter) => (
                    <button
                        key={filter.days}
                        onClick={() => handleQuickFilter(filter.days)}
                        className={`
                            px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-medium rounded-full
                            transition-all duration-200 ease-in-out
                            border min-h-0 min-w-0
                            ${activePreset === filter.days
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Date Range Inputs */}
            <div className="flex flex-row items-center gap-1.5 md:gap-2 bg-white p-1.5 md:p-2 rounded-lg md:rounded-xl border border-gray-200 shadow-sm">
                {/* Start Date Picker */}
                <div className="relative flex items-center flex-1">
                    <Calendar
                        size={14}
                        className="absolute left-2 text-gray-400 pointer-events-none z-10 md:hidden"
                    />
                    <Calendar
                        size={16}
                        className="absolute left-2.5 text-gray-400 pointer-events-none z-10 hidden md:block"
                    />
                    <DatePicker
                        selected={startDate}
                        onChange={handleStartChange}
                        onKeyDown={preventKeyboardInput}
                        selectsStart
                        startDate={startDate}
                        endDate={endDate}
                        maxDate={endDate || getReferenceDate()}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md md:rounded-lg pl-7 md:pl-8 pr-2 md:pr-3 py-1 md:py-1.5
                                   text-gray-700 text-xs md:text-sm font-medium
                                   cursor-pointer outline-none min-w-[100px] md:min-w-[130px]
                                   focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                   hover:border-gray-300
                                   transition-all duration-200"
                        dateFormat="M/d/yy"
                        placeholderText="Start"
                        popperPlacement="bottom-start"
                        popperModifiers={[
                            {
                                name: 'preventOverflow',
                                options: {
                                    boundary: 'viewport',
                                    padding: 8
                                }
                            }
                        ]}
                    />
                </div>

                {/* Separator */}
                <span className="text-gray-300 font-medium text-xs md:text-base">–</span>

                {/* End Date Picker */}
                <div className="relative flex items-center flex-1">
                    <Calendar
                        size={14}
                        className="absolute left-2 text-gray-400 pointer-events-none z-10 md:hidden"
                    />
                    <Calendar
                        size={16}
                        className="absolute left-2.5 text-gray-400 pointer-events-none z-10 hidden md:block"
                    />
                    <DatePicker
                        selected={endDate}
                        onChange={handleEndChange}
                        onKeyDown={preventKeyboardInput}
                        selectsEnd
                        startDate={startDate}
                        endDate={endDate}
                        minDate={startDate}
                        maxDate={getReferenceDate()}
                        className="w-full bg-gray-50 border border-gray-200 rounded-md md:rounded-lg pl-7 md:pl-8 pr-2 md:pr-3 py-1 md:py-1.5
                                   text-gray-700 text-xs md:text-sm font-medium
                                   cursor-pointer outline-none min-w-[100px] md:min-w-[130px]
                                   focus:ring-2 focus:ring-violet-500 focus:border-violet-500
                                   hover:border-gray-300
                                   transition-all duration-200"
                        dateFormat="M/d/yy"
                        placeholderText="End"
                        popperPlacement="bottom-end"
                        popperModifiers={[
                            {
                                name: 'preventOverflow',
                                options: {
                                    boundary: 'viewport',
                                    padding: 8
                                }
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default DateRangeFilter;
