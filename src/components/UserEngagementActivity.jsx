import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import TrafficTrendChart from './TrafficTrendChart';
import WeeklyPatternChart from './WeeklyPatternChart';
import MAUTrendChart from './MAUTrendChart';
import InsightsSection from './InsightsSection';
import KPICards from './KPICards';
import { subDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

// Helper to get today's date as YYYY-MM-DD string in local time
const getLocalTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const UserEngagementActivity = ({ dateRange, rangeKey }) => {
    const [data, setData] = useState([]);
    const [deltas, setDeltas] = useState({ sessions: null, dau: null });
    const [loading, setLoading] = useState(true);
    const [retentionData, setRetentionData] = useState([]);
    const [mauData, setMauData] = useState([]);
    const [totalUsers, setTotalUsers] = useState(null);
    const [startDate, endDate] = dateRange;
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);
            try {
                const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                const previousStartDate = subDays(startDate, duration);

                // Use string-based date comparison to avoid timezone bleed
                const startDateString = toDateString(previousStartDate);
                const endDateString = toDateString(endDate);

                // Fetch data for both current and previous periods
                const { data: result, error: err } = await supabase
                    .from('dau')
                    .select('*')
                    .gte('activity_date', startDateString)
                    .lte('activity_date', endDateString)
                    .order('activity_date', { ascending: true });

                if (err) throw err;

                const allData = result || [];

                // Split data using string comparison to avoid timezone issues
                const currentStartString = toDateString(startDate);
                const currentEndString = toDateString(endDate);
                const previousStartString = toDateString(previousStartDate);

                // Filter current period: startDate <= date <= endDate
                const currentPeriodData = allData.filter(item =>
                    item.activity_date >= currentStartString &&
                    item.activity_date <= currentEndString
                );

                // Filter previous period: previousStartDate <= date < startDate
                const previousPeriodData = allData.filter(item =>
                    item.activity_date >= previousStartString &&
                    item.activity_date < currentStartString
                );

                setData(currentPeriodData);

                // Calculate Deltas
                if (previousPeriodData.length > 0) {
                    const currentSessions = currentPeriodData.reduce((acc, curr) => acc + curr.active_users, 0);
                    const previousSessions = previousPeriodData.reduce((acc, curr) => acc + curr.active_users, 0);

                    const currentAvgDAU = currentPeriodData.length ? currentSessions / currentPeriodData.length : 0;
                    const previousAvgDAU = previousPeriodData.length ? previousSessions / previousPeriodData.length : 0;

                    const sessionsDelta = previousSessions ? ((currentSessions - previousSessions) / previousSessions) * 100 : null;
                    const dauDelta = previousAvgDAU ? ((currentAvgDAU - previousAvgDAU) / previousAvgDAU) * 100 : null;

                    setDeltas({
                        sessions: sessionsDelta,
                        dau: dauDelta
                    });
                } else {
                    setDeltas({ sessions: null, dau: null });
                }

            } catch (err) {
                console.error('Error fetching data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange]);

    // Fetch retention data from weekly_calendar_retention view (independent of date range)
    useEffect(() => {
        const fetchRetentionData = async () => {
            try {
                const { data: result, error: err } = await supabase
                    .from('weekly_calendar_retention')
                    .select('*')
                    .order('week_start', { ascending: true });

                if (err) throw err;

                setRetentionData(result || []);
            } catch (err) {
                console.error('Error fetching retention data:', err);
            }
        };

        fetchRetentionData();
    }, []);

    // Fetch MAU data from monthly_active_users view (show all months)
    useEffect(() => {
        const fetchMAUData = async () => {
            try {
                const { data: result, error: err } = await supabase
                    .from('monthly_active_users')
                    .select('*')
                    .order('month_start', { ascending: true });

                if (err) throw err;

                setMauData(result || []);
            } catch (err) {
                console.error('Error fetching MAU data:', err);
            }
        };

        fetchMAUData();
    }, []);

    // Fetch total users from retention_summary
    useEffect(() => {
        const fetchTotalUsers = async () => {
            try {
                const { data: result, error: err } = await supabase
                    .from('retention_summary')
                    .select('total_users');

                if (err) throw err;

                setTotalUsers(result?.[0]?.total_users || null);
            } catch (err) {
                console.error('Error fetching total users:', err);
            }
        };

        fetchTotalUsers();
    }, []);

    // Single source of truth: Clean data and calculate KPIs
    const { cleanData, kpiStats } = useMemo(() => {
        if (!data || data.length === 0) {
            return {
                cleanData: [],
                kpiStats: { totalSessions: 0, averageDAU: 0, peakDay: null }
            };
        }

        // Include all data up to and including today
        const todayString = getLocalTodayString();
        const filtered = data.filter(d => d.activity_date <= todayString);

        // Calculate KPIs from clean data
        const totalSessions = filtered.reduce((acc, curr) => acc + curr.active_users, 0);
        const averageDAU = filtered.length > 0 ? Math.round(totalSessions / filtered.length) : 0;
        const peakDay = filtered.length > 0
            ? filtered.reduce((max, curr) => (curr.active_users > max.active_users ? curr : max), filtered[0])
            : null;

        return {
            cleanData: filtered,
            kpiStats: { totalSessions, averageDAU, peakDay }
        };
    }, [data]);

    // Get current month's MAU value
    const currentMAU = useMemo(() => {
        if (!mauData || mauData.length === 0) return null;
        // Latest month in the data
        return mauData[mauData.length - 1]?.mau || null;
    }, [mauData]);

    if (loading && data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-violet-600 py-24">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Error State */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-sm">
                    Error: {error}
                </div>
            )}

            {/* AI Strategic Analysis */}
            <InsightsSection
                dailyData={cleanData}
                retentionData={retentionData}
                rangeKey={rangeKey}
            />

            {/* KPI Cards Row */}
            <KPICards
                data={data}
                deltas={deltas}
                kpiStats={kpiStats}
                mau={currentMAU}
                totalUsers={totalUsers}
            />

            {/* DAU Trend Chart - Full Width */}
            <TrafficTrendChart
                data={data}
                averageDAU={kpiStats.averageDAU}
                averageDAUDelta={deltas.dau}
                peakDAU={kpiStats.peakDay?.active_users}
                peakDAUDate={kpiStats.peakDay?.activity_date}
            />

            {/* Two-Column Row: MAU Trend + Weekly Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <div className="h-full">
                    <MAUTrendChart data={mauData} />
                </div>
                <div className="h-full">
                    <WeeklyPatternChart data={data} globalAverage={kpiStats.averageDAU} />
                </div>
            </div>
        </div>
    );
};

export default UserEngagementActivity;
