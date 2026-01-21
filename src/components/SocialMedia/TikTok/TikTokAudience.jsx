import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { Loader2, Users, MapPin, Calendar, Globe } from 'lucide-react';

import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

// TikTok brand colors
const TT_RED = '#FE2C55';
const TT_CYAN = '#25F4EE';

// Country/region colors
const COUNTRY_COLORS = ['#FE2C55', '#25F4EE', '#000000', '#94A3B8', '#CBD5E1'];

// Age group colors
const AGE_COLORS = {
    '13-17': '#25F4EE',
    '18-24': '#FE2C55',
    '25-34': '#000000',
    '35-44': '#64748B',
    '45+': '#94A3B8'
};

// Country name mapping
const COUNTRY_NAMES = {
    'VN': 'Vietnam',
    'US': 'United States',
    'PH': 'Philippines',
    'IN': 'India',
    'ID': 'Indonesia',
    'TH': 'Thailand',
    'MY': 'Malaysia',
    'SG': 'Singapore'
};

// Custom tooltip for pie chart
const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold">{data.name}</p>
            <p className="text-sm text-slate-600">
                <span className="font-semibold">{data.value?.toLocaleString()}</span> followers
            </p>
            <p className="text-xs text-slate-400">{data.percentage}% of total</p>
        </div>
    );
};

// Custom tooltip for bar chart
const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
            <p className="text-slate-900 font-semibold mb-2">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-slate-600">{entry.name}:</span>
                    <span className="text-sm font-semibold text-slate-800">
                        {entry.value?.toLocaleString() || 0}
                    </span>
                </div>
            ))}
        </div>
    );
};

const TikTokAudience = () => {
    const context = useOutletContext();
    const selectedAccountId = context?.selectedAccountId || 'tt-demo-account';

    const [demographics, setDemographics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error: err } = await supabaseSocialAnalytics
                    .from('demographic_metrics_daily')
                    .select('*')
                    .eq('account_id', selectedAccountId);

                if (err) throw err;
                setDemographics(data || []);
            } catch (err) {
                console.error('Error fetching TikTok demographics:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedAccountId]);

    // Process demographics data
    const { countryData, cityData, ageData, totalFollowers } = useMemo(() => {
        const emptyState = {
            countryData: [],
            cityData: [],
            ageData: [],
            totalFollowers: 0
        };

        if (!demographics || demographics.length === 0) {
            return emptyState;
        }

        // Find country demographics
        const countryDemo = demographics.find(d => d.demographic_type === 'country');
        let countryData = [];
        let totalFollowers = 0;

        if (countryDemo?.breakdown_values) {
            const breakdown = typeof countryDemo.breakdown_values === 'string'
                ? JSON.parse(countryDemo.breakdown_values)
                : countryDemo.breakdown_values;

            totalFollowers = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

            countryData = Object.entries(breakdown)
                .map(([code, count], index) => ({
                    name: COUNTRY_NAMES[code] || code,
                    code,
                    value: count,
                    color: COUNTRY_COLORS[index] || '#94A3B8',
                    percentage: totalFollowers > 0 ? Math.round((count / totalFollowers) * 100) : 0
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        }

        // Find city demographics
        const cityDemo = demographics.find(d => d.demographic_type === 'city');
        let cityData = [];

        if (cityDemo?.breakdown_values) {
            const breakdown = typeof cityDemo.breakdown_values === 'string'
                ? JSON.parse(cityDemo.breakdown_values)
                : cityDemo.breakdown_values;

            const cityTotal = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

            cityData = Object.entries(breakdown)
                .map(([city, count], index) => ({
                    name: city,
                    value: count,
                    color: COUNTRY_COLORS[index] || '#94A3B8',
                    percentage: cityTotal > 0 ? Math.round((count / cityTotal) * 100) : 0
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        }

        // Find age demographics
        const ageDemo = demographics.find(d => d.demographic_type === 'age');
        let ageData = [];

        if (ageDemo?.breakdown_values) {
            const breakdown = typeof ageDemo.breakdown_values === 'string'
                ? JSON.parse(ageDemo.breakdown_values)
                : ageDemo.breakdown_values;

            // Process age groups with gender split
            const ageGroups = ['13-17', '18-24', '25-34', '35-44', '45+'];
            ageData = ageGroups.map(group => {
                const maleKey = `${group}_M`;
                const femaleKey = `${group}_F`;
                return {
                    age: group,
                    male: breakdown[maleKey] || 0,
                    female: breakdown[femaleKey] || 0
                };
            });
        }

        return { countryData, cityData, ageData, totalFollowers };
    }, [demographics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-black" />
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
            {/* Audience Summary */}
            <div className="bg-black rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/10">
                        <Users size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Audience Demographics</h3>
                        <p className="text-sm text-slate-400">{totalFollowers.toLocaleString()} total followers</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-xs text-slate-400">Primary Audience</p>
                        <p className="text-sm font-semibold text-[#25F4EE]">Gen Z (18-24)</p>
                    </div>
                </div>
            </div>

            {/* Country & City Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Country Distribution */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                        <Globe size={18} className="text-slate-600" />
                        <h3 className="text-base md:text-lg font-semibold text-slate-900">Top Countries</h3>
                    </div>

                    {countryData.length > 0 ? (
                        <div className="flex items-center gap-6">
                            <div className="relative" style={{ width: '140px', height: '140px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={countryData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={65}
                                            paddingAngle={2}
                                        >
                                            {countryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<PieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex-1 space-y-2">
                                {countryData.map((country, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: country.color }} />
                                            <span className="text-sm text-slate-600">{country.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">{country.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <Globe size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No country data available</p>
                        </div>
                    )}
                </div>

                {/* City Distribution */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin size={18} className="text-slate-600" />
                        <h3 className="text-base md:text-lg font-semibold text-slate-900">Top Cities</h3>
                    </div>

                    {cityData.length > 0 ? (
                        <div className="space-y-3">
                            {cityData.map((city, index) => (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-slate-700">{city.name}</span>
                                        <span className="text-sm font-semibold text-slate-600">{city.percentage}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${city.percentage}%`,
                                                backgroundColor: index === 0 ? TT_RED : index === 1 ? TT_CYAN : '#64748B'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No city data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Age & Gender Distribution */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-slate-600" />
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Age & Gender Distribution</h3>
                </div>

                {ageData.length > 0 ? (
                    <div className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis
                                    dataKey="age"
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 12, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94A3B8"
                                    tick={{ fontSize: 11, fill: '#64748B' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                />
                                <Tooltip content={<BarTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                />
                                <Bar dataKey="male" name="Male" fill={TT_CYAN} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="female" name="Female" fill={TT_RED} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <Users size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No age/gender data available</p>
                    </div>
                )}

                {/* Key insight */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold text-[#FE2C55]">65%</span> of your TikTok audience is between <span className="font-semibold">18-24 years old</span>, making it your strongest platform for reaching Gen Z students preparing for SAT.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TikTokAudience;
