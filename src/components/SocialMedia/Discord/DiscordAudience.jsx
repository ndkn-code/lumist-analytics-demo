import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { subDays } from 'date-fns';
import {
    Loader2,
    Globe,
    GraduationCap,
    Users,
    Flag
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// Discord brand color
const DISCORD_BLUE = '#5865F2';

// Country flag emoji mapping (common countries)
const COUNTRY_FLAGS = {
    'Vietnam': '🇻🇳',
    'United States': '🇺🇸',
    'USA': '🇺🇸',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'United Kingdom': '🇬🇧',
    'UK': '🇬🇧',
    'Singapore': '🇸🇬',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Korea': '🇰🇷',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Malaysia': '🇲🇾',
    'Thailand': '🇹🇭',
    'Philippines': '🇵🇭',
    'Indonesia': '🇮🇩',
    'Taiwan': '🇹🇼',
    'Hong Kong': '🇭🇰',
    'Other': '🌍',
    'Unknown': '❓'
};

// Colors for pie chart
const NATIONALITY_COLORS = [
    '#5865F2', // Discord Blue
    '#57F287', // Discord Green
    '#FEE75C', // Discord Yellow
    '#EB459E', // Discord Fuchsia
    '#ED4245', // Discord Red
    '#3BA55D', // Emerald
    '#FAA81A', // Orange
    '#9B59B6', // Purple
    '#3498DB', // Blue
    '#94A3B8'  // Slate (Other)
];

// Grade colors
const GRADE_COLORS = {
    '9': '#5865F2',
    '10': '#57F287',
    '11': '#FEE75C',
    '12': '#EB459E',
    'Alumni': '#3BA55D',
    'Other': '#94A3B8'
};

// Custom Tooltip for Pie Chart
const NationalityTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{COUNTRY_FLAGS[data.name] || '🌍'}</span>
                <span className="text-gray-900 font-semibold">{data.name}</span>
            </div>
            <p className="text-sm text-slate-600">
                Members: <span className="font-bold">{data.value?.toLocaleString()}</span>
            </p>
            <p className="text-xs text-slate-400">
                {data.percentage?.toFixed(1)}% of total
            </p>
        </div>
    );
};

// Custom Tooltip for Grade Chart
const GradeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">Grade {label}</p>
            <p style={{ color: DISCORD_BLUE }} className="text-sm">
                Members: <span className="font-bold">{payload[0]?.value?.toLocaleString()}</span>
            </p>
        </div>
    );
};

const DiscordAudience = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];

    const [nationalityData, setNationalityData] = useState([]);
    const [gradeData, setGradeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Fetch nationality distribution
                const nationalityPromise = supabaseSocialAnalytics
                    .from('discord_latest_nationality')
                    .select('*')
                    .order('member_count', { ascending: false });

                // Fetch grade distribution
                const gradePromise = supabaseSocialAnalytics
                    .from('discord_latest_grade')
                    .select('*')
                    .order('grade', { ascending: true });

                const [nationalityRes, gradeRes] = await Promise.all([
                    nationalityPromise,
                    gradePromise
                ]);

                if (nationalityRes.error) throw nationalityRes.error;
                if (gradeRes.error) throw gradeRes.error;

                setNationalityData(nationalityRes.data || []);
                setGradeData(gradeRes.data || []);

            } catch (err) {
                console.error('Error fetching Discord audience data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process data for charts
    const {
        totalMembers,
        topNationality,
        pieChartData,
        gradeChartData,
        topGrade
    } = useMemo(() => {
        const totalMembers = nationalityData.reduce((sum, n) => sum + (n.member_count || 0), 0);
        const topNationality = nationalityData[0] || null;

        // Pie chart data for nationality
        const pieChartData = nationalityData.slice(0, 10).map((n, i) => ({
            name: n.nationality || 'Unknown',
            value: n.member_count || 0,
            color: NATIONALITY_COLORS[i % NATIONALITY_COLORS.length],
            percentage: totalMembers > 0 ? ((n.member_count || 0) / totalMembers) * 100 : 0
        }));

        // Grade chart data
        const gradeChartData = gradeData.map(g => ({
            grade: g.grade || 'Unknown',
            members: g.member_count || 0,
            color: GRADE_COLORS[g.grade] || GRADE_COLORS['Other']
        }));

        // Find top grade
        let topGrade = null;
        let maxGradeMembers = 0;
        gradeData.forEach(g => {
            if ((g.member_count || 0) > maxGradeMembers) {
                maxGradeMembers = g.member_count || 0;
                topGrade = g.grade;
            }
        });

        return {
            totalMembers,
            topNationality,
            pieChartData,
            gradeChartData,
            topGrade
        };
    }, [nationalityData, gradeData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-[#5865F2]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading Discord audience data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-[#5865F2]" />
                        <span className="text-xs font-medium text-slate-500">Total Members</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{totalMembers.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">With nationality data</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe size={16} className="text-emerald-500" />
                        <span className="text-xs font-medium text-slate-500">Countries</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{nationalityData.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Represented</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Flag size={16} className="text-amber-500" />
                        <span className="text-xs font-medium text-slate-500">Top Nationality</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-lg">{COUNTRY_FLAGS[topNationality?.nationality] || '🌍'}</span>
                        <p className="text-lg font-bold text-slate-800 truncate">{topNationality?.nationality || 'N/A'}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{topNationality?.member_count?.toLocaleString() || 0} members</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-2 mb-2">
                        <GraduationCap size={16} className="text-violet-500" />
                        <span className="text-xs font-medium text-slate-500">Most Common Grade</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">Grade {topGrade || 'N/A'}</p>
                    <p className="text-xs text-slate-400 mt-1">Largest group</p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Nationality Pie Chart */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Nationality Distribution</h3>
                        <p className="text-xs text-slate-500 mt-1">Members by country</p>
                    </div>

                    {pieChartData.length > 0 ? (
                        <>
                            <div className="h-[220px] md:h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="45%"
                                            outerRadius="75%"
                                            paddingAngle={2}
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<NationalityTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend with flags */}
                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-4">
                                {pieChartData.slice(0, 6).map((item, index) => (
                                    <div key={index} className="flex items-center gap-1.5">
                                        <span className="text-sm">{COUNTRY_FLAGS[item.name] || '🌍'}</span>
                                        <div
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-xs text-slate-600">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-slate-400">
                            No nationality data available
                        </div>
                    )}
                </div>

                {/* Grade Distribution - Horizontal Bar Chart */}
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Grade Distribution</h3>
                        <p className="text-xs text-slate-500 mt-1">Members by grade level</p>
                    </div>

                    {gradeChartData.length > 0 ? (
                        <div className="h-[280px] md:h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={gradeChartData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                                    <XAxis
                                        type="number"
                                        stroke="#6B7280"
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="grade"
                                        stroke="#6B7280"
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={50}
                                        tickFormatter={(value) => `Grade ${value}`}
                                    />
                                    <Tooltip content={<GradeTooltip />} />
                                    <Bar
                                        dataKey="members"
                                        radius={[0, 4, 4, 0]}
                                    >
                                        {gradeChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-slate-400">
                            No grade data available
                        </div>
                    )}
                </div>
            </div>

            {/* Nationality Table */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="mb-4">
                    <h3 className="text-base md:text-lg font-semibold text-slate-800">All Nationalities</h3>
                    <p className="text-xs text-slate-500 mt-1">Complete breakdown by country</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-3 font-medium text-slate-500">Rank</th>
                                <th className="text-left py-2 px-3 font-medium text-slate-500">Country</th>
                                <th className="text-right py-2 px-3 font-medium text-slate-500">Members</th>
                                <th className="text-right py-2 px-3 font-medium text-slate-500">Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nationalityData.slice(0, 15).map((item, index) => {
                                const percentage = totalMembers > 0 ? ((item.member_count || 0) / totalMembers) * 100 : 0;
                                return (
                                    <tr key={item.nationality || index} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-2 px-3 text-slate-500">{index + 1}</td>
                                        <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{COUNTRY_FLAGS[item.nationality] || '🌍'}</span>
                                                <span className="font-medium text-slate-700">{item.nationality || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-slate-800">
                                            {(item.member_count || 0).toLocaleString()}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500">
                                            {percentage.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {nationalityData.length > 15 && (
                    <p className="text-xs text-slate-400 text-center mt-3">
                        Showing top 15 of {nationalityData.length} countries
                    </p>
                )}
            </div>
        </div>
    );
};

export default DiscordAudience;
