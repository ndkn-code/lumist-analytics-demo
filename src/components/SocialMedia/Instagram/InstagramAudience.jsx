import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { subDays, format } from 'date-fns';
import { Loader2, Users, Globe, MapPin } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const IG_PINK = '#E4405F';
const IG_PURPLE = '#833AB4';

const DONUT_COLORS = ['#E4405F', '#833AB4', '#FCAF45', '#0EA5E9', '#94A3B8'];

const COUNTRY_NAMES = {
    'VN': 'Vietnam', 'US': 'USA', 'SG': 'Singapore', 'AU': 'Australia', 'TH': 'Thailand'
};

const getCountryName = (code) => COUNTRY_NAMES[code] || code;
const getFlagUrl = (code) => code ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : null;

const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// KPI Card
const KPICard = ({ icon: Icon, label, value, subtext, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1">{label}</p>
                <p className="text-lg md:text-2xl font-bold text-slate-800">{value}</p>
                {subtext && <p className="text-[10px] md:text-xs text-slate-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-2 md:p-2.5 rounded-lg md:rounded-xl ${iconBg} flex-shrink-0`}>
                <Icon size={20} className={iconColor} />
            </div>
        </div>
    </div>
);

const InstagramAudience = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId || 'ig-demo-account';

    const [accountMetrics, setAccountMetrics] = useState([]);
    const [demographics, setDemographics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!startDate || !endDate) return;

            setLoading(true);
            setError(null);

            try {
                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                const [metricsRes, demoRes] = await Promise.all([
                    supabaseSocialAnalytics
                        .from('account_metrics_daily')
                        .select('*')
                        .eq('account_id', selectedAccountId)
                        .gte('metric_date', startDateString)
                        .lte('metric_date', endDateString)
                        .order('metric_date', { ascending: true }),
                    supabaseSocialAnalytics
                        .from('demographic_metrics_daily')
                        .select('*')
                        .eq('account_id', selectedAccountId)
                        .order('metric_date', { ascending: false })
                ]);

                if (metricsRes.error) throw metricsRes.error;
                if (demoRes.error) throw demoRes.error;

                setAccountMetrics(metricsRes.data || []);
                setDemographics(demoRes.data || []);
            } catch (err) {
                console.error('Error fetching Instagram audience data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId]);

    // Process demographic data
    const { countryData, cityData, currentFollowers, growthRate } = useMemo(() => {
        const countryDemo = demographics.find(d => d.demographic_type === 'country');
        const cityDemo = demographics.find(d => d.demographic_type === 'city');

        const processBreakdown = (data, type) => {
            if (!data?.breakdown_values) return [];
            const entries = Object.entries(data.breakdown_values);
            const total = entries.reduce((sum, [, count]) => sum + count, 0);
            return entries
                .map(([key, count]) => ({
                    name: type === 'country' ? getCountryName(key) : key.split(',')[0],
                    isoCode: type === 'country' ? key : null,
                    count,
                    percentage: total > 0 ? (count / total) * 100 : 0
                }))
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 5);
        };

        const latest = accountMetrics[accountMetrics.length - 1];
        const first = accountMetrics[0];
        const currentFollowers = latest?.followers_count || 0;
        const growthRate = first?.followers_count > 0
            ? ((currentFollowers - first.followers_count) / first.followers_count) * 100
            : 0;

        return {
            countryData: processBreakdown(countryDemo, 'country'),
            cityData: processBreakdown(cityDemo, 'city'),
            currentFollowers,
            growthRate
        };
    }, [demographics, accountMetrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading audience data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                    icon={Users}
                    label="Total Followers"
                    value={currentFollowers.toLocaleString()}
                    subtext={`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}% growth`}
                    iconBg="bg-pink-50"
                    iconColor="text-pink-500"
                />
                <KPICard
                    icon={Globe}
                    label="Top Country"
                    value={countryData[0]?.name || 'N/A'}
                    subtext={`${countryData[0]?.percentage?.toFixed(0) || 0}% of audience`}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-500"
                />
                <KPICard
                    icon={MapPin}
                    label="Top City"
                    value={cityData[0]?.name || 'N/A'}
                    subtext={`${cityData[0]?.percentage?.toFixed(0) || 0}% of audience`}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-500"
                />
                <KPICard
                    icon={Users}
                    label="Primary Age"
                    value="18-24"
                    subtext="70% of audience"
                    iconBg="bg-sky-50"
                    iconColor="text-sky-500"
                />
            </div>

            {/* Demographics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Country Breakdown */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4">Breakdown by Country</h3>
                    <div className="h-[250px]">
                        {countryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={countryData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
                                    <Bar dataKey="percentage" fill={IG_PINK} radius={[0, 6, 6, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                No country data available
                            </div>
                        )}
                    </div>
                </div>

                {/* City Breakdown */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4">Breakdown by City</h3>
                    <div className="h-[250px]">
                        {cityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={cityData}
                                        cx="40%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="percentage"
                                        nameKey="name"
                                    >
                                        {cityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => `${val.toFixed(1)}%`} />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        wrapperStyle={{ right: 0, width: '45%' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                No city data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Age & Gender */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4">Age & Gender Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">13-17</p>
                        <p className="text-lg font-bold text-slate-800">31%</p>
                        <p className="text-xs text-slate-500">14% M / 17% F</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                        <p className="text-xs text-pink-600 font-medium">18-24</p>
                        <p className="text-lg font-bold text-slate-800">44%</p>
                        <p className="text-xs text-slate-500">20% M / 24% F</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">25-34</p>
                        <p className="text-lg font-bold text-slate-800">15%</p>
                        <p className="text-xs text-slate-500">7% M / 8% F</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">35+</p>
                        <p className="text-lg font-bold text-slate-800">10%</p>
                        <p className="text-xs text-slate-500">4.5% M / 5.5% F</p>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-slate-600">Male: 42%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-500" />
                        <span className="text-slate-600">Female: 58%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstagramAudience;
