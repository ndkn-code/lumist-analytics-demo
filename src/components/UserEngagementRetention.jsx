import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import RetentionKPICards from './RetentionKPICards';
import RetentionHeatmap from './RetentionHeatmap';
import RetentionCurve from './RetentionCurve';
import SATCycleImpact from './SATCycleImpact';
import InsightsSection from './InsightsSection';

const UserEngagementRetention = () => {
    const [retentionSummary, setRetentionSummary] = useState(null);
    const [cohortData, setCohortData] = useState([]);
    const [satCycleData, setSatCycleData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch all retention data for insights
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch retention summary
                const { data: summary } = await supabase
                    .from('retention_summary')
                    .select('*');

                // Fetch cohort data
                const { data: cohorts } = await supabase
                    .from('monthly_cohort_retention')
                    .select('*')
                    .order('cohort_month', { ascending: true })
                    .order('week_number', { ascending: true });

                // Fetch SAT cycle data
                const { data: satCycle } = await supabase
                    .from('sat_cycle_engagement')
                    .select('*');

                setRetentionSummary(summary?.[0] || null);
                setCohortData(cohorts || []);
                setSatCycleData(satCycle || []);
            } catch (err) {
                console.error('Error fetching retention data for insights:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    // Prepare retention metrics for AI insights
    const retentionMetrics = useMemo(() => {
        if (!retentionSummary) {
            return { hasData: false };
        }

        // Calculate SAT engagement lift
        let satEngagementLift = 0;
        if (satCycleData.length > 0) {
            const weekBefore = satCycleData.find(d => d.days_bucket === '0-7 days');
            const monthOut = satCycleData.find(d => d.days_bucket === '30+ days');
            if (weekBefore?.avg_dau && monthOut?.avg_dau && monthOut.avg_dau > 0) {
                satEngagementLift = ((weekBefore.avg_dau - monthOut.avg_dau) / monthOut.avg_dau * 100);
            }
        }

        // Find best and worst performing cohorts
        const cohortPerformance = {};
        cohortData.forEach(item => {
            if (item.week_number === 4) { // Compare at week 4 for consistency
                cohortPerformance[item.cohort_month] = item.retention_rate;
            }
        });

        const cohortEntries = Object.entries(cohortPerformance);
        let bestCohort = null;
        let worstCohort = null;
        if (cohortEntries.length > 0) {
            cohortEntries.sort((a, b) => b[1] - a[1]);
            bestCohort = { month: cohortEntries[0][0], rate: cohortEntries[0][1] };
            worstCohort = { month: cohortEntries[cohortEntries.length - 1][0], rate: cohortEntries[cohortEntries.length - 1][1] };
        }

        // Generate stable date range for cache key
        // Use today's date as end and 30 days ago as start for consistency
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const formatDate = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        return {
            hasData: true,
            // Date range for cache key and display
            startDate: formatDate(thirtyDaysAgo),
            endDate: formatDate(today),
            // Core retention metrics
            d1_retention: retentionSummary.d1_retention,
            d1_eligible_users: retentionSummary.d1_eligible_users,
            d7_retention: retentionSummary.d7_retention,
            d7_eligible_users: retentionSummary.d7_eligible_users,
            d30_retention: retentionSummary.d30_retention,
            d30_eligible_users: retentionSummary.d30_eligible_users,
            total_users: retentionSummary.total_users,
            sat_engagement_lift: satEngagementLift,
            cohort_count: new Set(cohortData.map(d => d.cohort_month)).size,
            best_cohort: bestCohort,
            worst_cohort: worstCohort
        };
    }, [retentionSummary, cohortData, satCycleData]);

    return (
        <div className="space-y-4 md:space-y-6">
            {/* AI Insights for Retention */}
            {!loading && (
                <InsightsSection
                    mode="retention"
                    retentionMetrics={retentionMetrics}
                    rangeKey="retention"
                />
            )}

            {/* Retention KPI Cards Row */}
            <RetentionKPICards />

            {/* Cohort Retention Heatmap - Full Width Hero Chart */}
            <RetentionHeatmap />

            {/* Two-Column Row: Retention Curve + SAT Cycle Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <RetentionCurve />
                <SATCycleImpact />
            </div>
        </div>
    );
};

export default UserEngagementRetention;
