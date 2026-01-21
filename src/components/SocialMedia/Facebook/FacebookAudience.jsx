import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabaseSocialAnalytics } from '../../../lib/supabase';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import {
    Loader2,
    X,
    Users,
    Globe,
    MapPin
} from 'lucide-react';
import {
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    PieChart,
    Pie,
    Cell,
    Legend,
    LabelList
} from 'recharts';

// Facebook brand color - Primary for all charts
const FB_BLUE = '#1877F2';

// Professional Cool Spectrum palette for Donut Chart (Top 4 + Others)
const DONUT_COLORS = [
    '#1877F2',  // Facebook Blue - Top City
    '#7C3AED',  // Violet - 2nd
    '#0EA5E9',  // Sky - 3rd
    '#14B8A6',  // Teal - 4th
    '#94A3B8'   // Slate - "Others"
];

// Vietnamese city name localization - proper diacritics
const VIETNAMESE_CITY_NAMES = {
    'Da Nang': 'Đà Nẵng',
    'Hanoi': 'Hà Nội',
    'Ha Noi': 'Hà Nội',
    'Ho Chi Minh City': 'Hồ Chí Minh',
    'Ho Chi Minh': 'Hồ Chí Minh',
    'HCMC': 'Hồ Chí Minh',
    'Saigon': 'Hồ Chí Minh',
    'Hai Phong': 'Hải Phòng',
    'Haiphong': 'Hải Phòng',
    'Can Tho': 'Cần Thơ',
    'Nha Trang': 'Nha Trang',
    'Hue': 'Huế',
    'Vung Tau': 'Vũng Tàu',
    'Bien Hoa': 'Biên Hòa',
    'Da Lat': 'Đà Lạt',
    'Dalat': 'Đà Lạt',
    'Quy Nhon': 'Quy Nhơn',
    'Thai Nguyen': 'Thái Nguyên',
    'Vinh': 'Vinh',
    'Buon Ma Thuot': 'Buôn Ma Thuột',
    'Long Xuyen': 'Long Xuyên',
    'My Tho': 'Mỹ Tho',
    'Rach Gia': 'Rạch Giá',
    'Phan Thiet': 'Phan Thiết',
    'Cam Ranh': 'Cam Ranh',
    'Bac Ninh': 'Bắc Ninh',
    'Thai Binh': 'Thái Bình',
    'Nam Dinh': 'Nam Định',
    'Thanh Hoa': 'Thanh Hóa',
    'Ha Long': 'Hạ Long',
    'Quang Ngai': 'Quảng Ngãi',
    'Quang Nam': 'Quảng Nam',
    'Phu Ly': 'Phủ Lý',
    'Sam Son': 'Sầm Sơn',
    'Ben Tre': 'Bến Tre',
    'Ha Tinh': 'Hà Tĩnh',
    'Nga My': 'Nga Mỹ',
    'Pattaya': 'Pattaya'
};

// City normalization mapping - Map suburbs/districts to main cities
const CITY_NORMALIZATION = {
    // USA - Florida
    'Temple Terrace': 'Tampa',
    'Brandon': 'Tampa',
    'Clearwater': 'Tampa',
    // USA - Georgia
    'Morrow': 'Atlanta',
    'Decatur': 'Atlanta',
    'Marietta': 'Atlanta',
    // USA - Texas
    'Sachse': 'Dallas',
    'Plano': 'Dallas',
    'Irving': 'Dallas',
    'Sugar Land': 'Houston',
    'Katy': 'Houston',
    // USA - California
    'Woodcrest': 'Riverside',
    'Fountain Valley': 'Los Angeles',
    'Anaheim': 'Los Angeles',
    'San Marcos': 'San Diego',
    // USA - Other
    'Bethlehem': 'Philadelphia',
    'Willoughby': 'Cleveland',
    'Clarksville': 'Nashville',
    'Southaven': 'Memphis',
    'Adelphi': 'Washington DC',
    'Fairfax': 'Washington DC',
    // Vietnam - Districts to main cities (normalized to Vietnamese names)
    'Ba Vì': 'Hà Nội',
    'Gia Lâm': 'Hà Nội',
    'Yen Nguu': 'Hà Nội',
    'Di An': 'Hồ Chí Minh',
    'Phu My': 'Hồ Chí Minh',
    // Other normalizations
    'Rouen': 'Paris',
    'Rotterdam': 'Amsterdam'
};

// ISO Country Code to Full Name mapping
const COUNTRY_NAMES = {
    'AF': 'Afghanistan', 'AL': 'Albania', 'DZ': 'Algeria', 'AR': 'Argentina',
    'AU': 'Australia', 'AT': 'Austria', 'BE': 'Belgium', 'BR': 'Brazil',
    'CA': 'Canada', 'CL': 'Chile', 'CN': 'China', 'CO': 'Colombia',
    'CZ': 'Czech Republic', 'DK': 'Denmark', 'EG': 'Egypt', 'FI': 'Finland',
    'FR': 'France', 'DE': 'Germany', 'GR': 'Greece', 'HK': 'Hong Kong',
    'HU': 'Hungary', 'IN': 'India', 'ID': 'Indonesia', 'IE': 'Ireland',
    'IL': 'Israel', 'IT': 'Italy', 'JP': 'Japan', 'KR': 'South Korea',
    'MY': 'Malaysia', 'MX': 'Mexico', 'NL': 'Netherlands', 'NZ': 'New Zealand',
    'NO': 'Norway', 'PK': 'Pakistan', 'PE': 'Peru', 'PH': 'Philippines',
    'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania', 'RU': 'Russia',
    'SA': 'Saudi Arabia', 'SG': 'Singapore', 'ZA': 'South Africa', 'ES': 'Spain',
    'SE': 'Sweden', 'CH': 'Switzerland', 'TW': 'Taiwan', 'TH': 'Thailand',
    'TR': 'Turkey', 'UA': 'Ukraine', 'AE': 'UAE', 'GB': 'UK',
    'US': 'USA', 'VN': 'Vietnam', 'VE': 'Venezuela'
};

// Helper: Get flag image URL from flagcdn
const getFlagUrl = (isoCode) => {
    if (!isoCode) return null;
    const code = isoCode.toLowerCase();
    return `https://flagcdn.com/w40/${code}.png`;
};

// Helper: Get full country name from ISO code
const getCountryName = (isoCode) => {
    if (!isoCode) return 'Unknown';
    const code = isoCode.toUpperCase();
    return COUNTRY_NAMES[code] || isoCode;
};

// Helper: Localize city name to Vietnamese if applicable
const localizeCityName = (cityName) => {
    if (!cityName) return 'Unknown';
    return VIETNAMESE_CITY_NAMES[cityName] || cityName;
};

// Helper: Extract, normalize, and localize city name
// "Hanoi, Vietnam" -> "Hà Nội", "Temple Terrace, FL" -> "Tampa"
const extractAndNormalizeCityName = (fullCityString) => {
    if (!fullCityString) return 'Unknown';

    // Extract just the city part (before first comma)
    const parts = fullCityString.split(',');
    let cityName = parts[0].trim();

    // Check if this city should be normalized to a parent city
    if (CITY_NORMALIZATION[cityName]) {
        cityName = CITY_NORMALIZATION[cityName];
    }

    // Apply Vietnamese localization
    cityName = localizeCityName(cityName);

    return cityName;
};

// Helper: Check if city belongs to a country
const cityBelongsToCountry = (rawCityString, countryCode, countryName) => {
    if (!rawCityString || !countryCode) return false;
    const cityLower = rawCityString.toLowerCase();
    const countryNameLower = countryName?.toLowerCase() || '';
    const codeLower = countryCode.toLowerCase();

    // Check if city string contains country name or common variations
    return cityLower.includes(countryNameLower) ||
           cityLower.includes(codeLower) ||
           // Handle special cases like "Tampa, FL" for US
           (countryCode === 'US' && /,\s*[A-Z]{2}$/.test(rawCityString));
};

// Helper to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper: Generate "pretty" tick values for Y-axis
// Ensures round numbers (multiples of 10, 25, 50, 100, etc.) and always starts at 0
const getSmartTicks = (maxValue, minValue = 0) => {
    if (maxValue <= 0) return [0];

    // Determine the appropriate step size based on the range
    const range = maxValue - Math.min(0, minValue);

    let step;
    if (range <= 10) {
        step = 2;
    } else if (range <= 25) {
        step = 5;
    } else if (range <= 50) {
        step = 10;
    } else if (range <= 100) {
        step = 20;
    } else if (range <= 250) {
        step = 50;
    } else if (range <= 500) {
        step = 100;
    } else if (range <= 1000) {
        step = 200;
    } else if (range <= 2500) {
        step = 500;
    } else {
        // For larger ranges, use powers of 10
        const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
        step = magnitude / 2;
    }

    // Round max up to the nearest step
    const roundedMax = Math.ceil(maxValue / step) * step;

    // Generate ticks from 0 to roundedMax
    const ticks = [];
    for (let i = 0; i <= roundedMax; i += step) {
        ticks.push(i);
    }

    // Ensure we don't have too many ticks (max 7)
    if (ticks.length > 7) {
        const newStep = step * 2;
        const newTicks = [];
        for (let i = 0; i <= roundedMax; i += newStep) {
            newTicks.push(i);
        }
        return newTicks;
    }

    return ticks;
};

// Helper: Generate smart ticks for daily change (can be negative)
const getSmartTicksWithNegative = (minValue, maxValue) => {
    if (minValue >= 0) {
        return getSmartTicks(maxValue, 0);
    }

    // Handle negative values
    const absMax = Math.max(Math.abs(minValue), Math.abs(maxValue));
    const range = absMax * 2;

    let step;
    if (range <= 10) {
        step = 2;
    } else if (range <= 20) {
        step = 5;
    } else if (range <= 50) {
        step = 10;
    } else if (range <= 100) {
        step = 20;
    } else {
        step = Math.ceil(range / 6 / 10) * 10;
    }

    const roundedMax = Math.ceil(absMax / step) * step;
    const ticks = [];

    for (let i = -roundedMax; i <= roundedMax; i += step) {
        ticks.push(i);
    }

    return ticks;
};

// Standard percentage ticks for demographic charts (0-100%)
const PERCENTAGE_TICKS = [0, 25, 50, 75, 100];

// Helper to convert Date to YYYY-MM-DD string
const toDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Custom Tooltip for Daily Change Bar Chart
const DailyChangeTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const dailyChange = payload[0]?.value || 0;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">
                {format(parseLocalDate(label), 'MMM dd, yyyy')}
            </p>
            <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: FB_BLUE }}></div>
                <p className="text-sm" style={{ color: FB_BLUE }}>
                    Daily Change: <span className="font-bold">{dailyChange >= 0 ? '+' : ''}{dailyChange.toLocaleString()}</span>
                </p>
            </div>
        </div>
    );
};

// Custom Tooltip for Demographics Bar Charts
const DemographicsTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0]?.payload || {};
    const percentage = data.percentage || 0;
    const count = data.count || 0;

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <p className="text-gray-900 font-semibold mb-1">{label}</p>
            <p className="text-sm text-slate-600">
                <span className="font-bold">{percentage.toFixed(1)}%</span> ({count.toLocaleString()} followers)
            </p>
        </div>
    );
};

// Custom Y-Axis Tick with Flag Image for Country Chart
const CountryYAxisTick = ({ x, y, payload, data }) => {
    // Find the country data to get the ISO code
    const countryData = data?.find(d => d.displayName === payload.value);
    const isoCode = countryData?.isoCode;
    const flagUrl = isoCode ? getFlagUrl(isoCode) : null;
    const countryName = getCountryName(isoCode);

    return (
        <g transform={`translate(${x},${y})`}>
            {flagUrl && (
                <image
                    href={flagUrl}
                    x={-90}
                    y={-8}
                    width={20}
                    height={15}
                    style={{ borderRadius: '2px' }}
                    preserveAspectRatio="xMidYMid slice"
                />
            )}
            <text
                x={-65}
                y={4}
                textAnchor="start"
                fill="#374151"
                fontSize={12}
            >
                {countryName}
            </text>
        </g>
    );
};

// Interactive Country Bar Chart Component with Flag Images
const CountryBarChart = ({ data, selectedCountry, onCountryClick }) => {
    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Breakdown by Country</h3>
                <p className="text-xs text-gray-500">Click to filter cities</p>
            </div>

            <div className="h-[200px] md:h-[250px]">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 115, bottom: 5 }}
                        >
                            {/* Vertical grid lines only - aligned with percentage ticks */}
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} vertical={true} />
                            <XAxis
                                type="number"
                                domain={[0, 100]}
                                ticks={PERCENTAGE_TICKS}
                                tickFormatter={(val) => `${val}%`}
                                stroke="#6B7280"
                                tick={{ fontSize: 11, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="displayName"
                                stroke="#6B7280"
                                tick={<CountryYAxisTick data={data} />}
                                tickLine={false}
                                axisLine={false}
                                width={110}
                            />
                            <Tooltip content={<DemographicsTooltip />} />
                            <Bar
                                dataKey="percentage"
                                radius={[0, 6, 6, 0]}
                                barSize={32}
                                onClick={(data) => onCountryClick(data.isoCode)}
                                cursor="pointer"
                                fill={FB_BLUE}
                            >
                                {data.map((entry) => (
                                    <Cell
                                        key={`cell-${entry.isoCode}`}
                                        fill={FB_BLUE}
                                        opacity={selectedCountry && selectedCountry !== entry.isoCode ? 0.4 : 1}
                                    />
                                ))}
                                <LabelList
                                    dataKey="percentage"
                                    position="right"
                                    formatter={(val) => `${val.toFixed(0)}%`}
                                    style={{ fontSize: 11, fill: '#374151', fontWeight: 600 }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        No country data available
                    </div>
                )}
            </div>
        </div>
    );
};

// Custom Tooltip for Donut Chart
const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0]?.payload || {};
    const name = data.displayName || data.name || 'Unknown';
    const percentage = data.percentage || 0;
    const count = data.count || 0;
    const color = payload[0]?.payload?.fill || DONUT_COLORS[0];

    return (
        <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                <p className="text-gray-900 font-semibold">{name}</p>
            </div>
            <p className="text-sm text-slate-600">
                <span className="font-bold">{percentage.toFixed(1)}%</span> ({count.toLocaleString()} followers)
            </p>
        </div>
    );
};

// Custom Legend for Donut Chart
const renderDonutLegend = (props) => {
    const { payload } = props;

    return (
        <div className="flex flex-col gap-2 text-sm">
            {payload.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-700 truncate">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// City Donut Chart Component
const CityDonutChart = ({ data, selectedCountry, selectedCountryName, onClearFilter }) => {
    // Process data: Top 4 cities + "Others"
    const donutData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Take top 4 cities
        const top4 = data.slice(0, 4).map((city, index) => ({
            ...city,
            name: city.displayName,
            fill: DONUT_COLORS[index]
        }));

        // Sum remaining cities into "Others"
        if (data.length > 4) {
            const othersCount = data.slice(4).reduce((sum, city) => sum + city.count, 0);
            const totalCount = data.reduce((sum, city) => sum + city.count, 0);
            const othersPercentage = totalCount > 0 ? (othersCount / totalCount) * 100 : 0;

            top4.push({
                displayName: 'Others',
                name: 'Others',
                count: othersCount,
                percentage: othersPercentage,
                fill: DONUT_COLORS[4]
            });
        }

        return top4;
    }, [data]);

    // Calculate total for center label
    const totalFollowers = useMemo(() => {
        return data.reduce((sum, city) => sum + city.count, 0);
    }, [data]);

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Breakdown by City</h3>
                {selectedCountry && (
                    <button
                        onClick={onClearFilter}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                        <span>Filtered: {selectedCountryName}</span>
                        <X size={12} />
                    </button>
                )}
            </div>

            <div className="h-[200px] md:h-[250px] relative">
                {donutData.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="40%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={2}
                                    dataKey="percentage"
                                    nameKey="displayName"
                                    stroke="none"
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip content={<DonutTooltip />} />
                                <Legend
                                    content={(props) => {
                                        const { payload } = props;
                                        return (
                                            <div className="flex flex-col gap-2 text-sm">
                                                {payload.map((entry, index) => {
                                                    const itemData = donutData.find(d => d.displayName === entry.value);
                                                    const percentage = itemData?.percentage || 0;
                                                    return (
                                                        <div key={`legend-${index}`} className="flex items-center gap-2">
                                                            <div
                                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: entry.color }}
                                                            />
                                                            <span className="text-slate-700 truncate">{entry.value}</span>
                                                            <span className="text-slate-500 font-semibold">{percentage.toFixed(0)}%</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }}
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    wrapperStyle={{ right: 0, width: '45%' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ left: '-10%' }}>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-slate-800">{totalFollowers.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">followers</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        {selectedCountry ? `No cities found in ${selectedCountryName}` : 'No city data available'}
                    </div>
                )}
            </div>
        </div>
    );
};

const FacebookAudience = () => {
    const context = useOutletContext();
    const dateRange = context?.dateRange;
    const [startDate, endDate] = dateRange || [subDays(new Date(), 30), new Date()];
    const selectedAccountId = context?.selectedAccountId;
    const accountsLoading = context?.accountsLoading;

    const [accountMetrics, setAccountMetrics] = useState([]);
    const [rawCountryData, setRawCountryData] = useState([]);
    const [rawCityData, setRawCityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Interactive filter state
    const [selectedCountry, setSelectedCountry] = useState(null);

    // Handle country click for drill-down
    const handleCountryClick = (isoCode) => {
        setSelectedCountry(prev => prev === isoCode ? null : isoCode);
    };

    // Clear country filter
    const clearCountryFilter = () => {
        setSelectedCountry(null);
    };

    // Fetch data from social_analytics schema
    useEffect(() => {
        const fetchData = async () => {
            // Skip if accounts still loading or no account selected
            if (accountsLoading || !selectedAccountId) return;
            if (!startDate || !endDate) return;

            // Check if social client is available
            if (!supabaseSocialAnalytics) {
                setError('Social analytics client not configured. Check environment variables.');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Use selected account from context
                const accountId = selectedAccountId;

                const startDateString = toDateString(startDate);
                const endDateString = toDateString(endDate);

                // Fetch account metrics for follower data - filter by account_id
                let accountMetricsQuery = supabaseSocialAnalytics
                    .from('account_metrics_daily')
                    .select('metric_date, followers_count, daily_follows')
                    .gte('metric_date', startDateString)
                    .lte('metric_date', endDateString)
                    .order('metric_date', { ascending: true });
                if (accountId) accountMetricsQuery = accountMetricsQuery.eq('account_id', accountId);

                // Fetch demographics by country (most recent date) - filter by account_id
                let demographicsCountryQuery = supabaseSocialAnalytics
                    .from('demographic_metrics_daily')
                    .select('breakdown_values, metric_date')
                    .eq('demographic_type', 'country')
                    .order('metric_date', { ascending: false })
                    .limit(1);
                if (accountId) demographicsCountryQuery = demographicsCountryQuery.eq('account_id', accountId);

                // Fetch demographics by city (most recent date) - filter by account_id
                let demographicsCityQuery = supabaseSocialAnalytics
                    .from('demographic_metrics_daily')
                    .select('breakdown_values, metric_date')
                    .eq('demographic_type', 'city')
                    .order('metric_date', { ascending: false })
                    .limit(1);
                if (accountId) demographicsCityQuery = demographicsCityQuery.eq('account_id', accountId);

                const [accountRes, countryRes, cityRes] = await Promise.all([
                    accountMetricsQuery,
                    demographicsCountryQuery,
                    demographicsCityQuery
                ]);

                if (accountRes.error) throw accountRes.error;
                if (countryRes.error) throw countryRes.error;
                if (cityRes.error) throw cityRes.error;

                setAccountMetrics(accountRes.data || []);

                // Process country demographics from breakdown_values JSON
                const processCountryData = (data) => {
                    if (!data || data.length === 0 || !data[0].breakdown_values) {
                        return [];
                    }

                    const breakdown = data[0].breakdown_values;
                    const entries = Object.entries(breakdown);
                    const total = entries.reduce((sum, [, count]) => sum + count, 0);

                    return entries
                        .map(([isoCode, count]) => ({
                            isoCode,
                            name: isoCode,
                            displayName: getCountryName(isoCode),
                            percentage: total > 0 ? (count / total) * 100 : 0,
                            count
                        }))
                        .sort((a, b) => b.percentage - a.percentage);
                };

                // Process city demographics with normalization, localization, and aggregation
                const processCityData = (data) => {
                    if (!data || data.length === 0 || !data[0].breakdown_values) {
                        return [];
                    }

                    const breakdown = data[0].breakdown_values;
                    const entries = Object.entries(breakdown);

                    // Step 1: Normalize and localize city names, then aggregate counts
                    const aggregatedCities = {};

                    entries.forEach(([rawName, count]) => {
                        // This function now handles normalization AND Vietnamese localization
                        const normalizedName = extractAndNormalizeCityName(rawName);

                        if (aggregatedCities[normalizedName]) {
                            aggregatedCities[normalizedName].count += count;
                            aggregatedCities[normalizedName].rawNames.push(rawName);
                        } else {
                            aggregatedCities[normalizedName] = {
                                count,
                                rawNames: [rawName]
                            };
                        }
                    });

                    // Step 2: Calculate total and percentages
                    const total = Object.values(aggregatedCities).reduce((sum, city) => sum + city.count, 0);

                    // Step 3: Convert to array format
                    return Object.entries(aggregatedCities)
                        .map(([displayName, { count, rawNames }]) => ({
                            rawNames, // Array of original raw names for country filtering
                            displayName,
                            percentage: total > 0 ? (count / total) * 100 : 0,
                            count
                        }))
                        .sort((a, b) => b.percentage - a.percentage);
                };

                setRawCountryData(processCountryData(countryRes.data));
                setRawCityData(processCityData(cityRes.data));

            } catch (err) {
                console.error('Error fetching Facebook audience data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dateRange, selectedAccountId, accountsLoading]);

    // Processed country data (top 5)
    const countryData = useMemo(() => {
        return rawCountryData.slice(0, 5);
    }, [rawCountryData]);

    // Filtered city data based on selected country (pass all data - donut handles Top 4 + Others)
    const cityData = useMemo(() => {
        if (!selectedCountry) {
            return rawCityData;
        }

        const selectedCountryName = getCountryName(selectedCountry);

        // Filter cities - check if any of the rawNames belong to the selected country
        const filtered = rawCityData.filter(city =>
            city.rawNames.some(rawName =>
                cityBelongsToCountry(rawName, selectedCountry, selectedCountryName)
            )
        );

        // Recalculate percentages for filtered set
        const filteredTotal = filtered.reduce((sum, c) => sum + c.count, 0);
        return filtered.map(city => ({
            ...city,
            percentage: filteredTotal > 0 ? (city.count / filteredTotal) * 100 : 0
        }));
    }, [rawCityData, selectedCountry]);

    // Get selected country name for display
    const selectedCountryName = selectedCountry ? getCountryName(selectedCountry) : null;

    // Process data for chart and header metrics
    const {
        netChange,
        netChangePercent,
        avgDailyNewFollowers,
        totalNewFollowers,
        currentFollowers,
        chartData,
        dailyChangeTicks
    } = useMemo(() => {
        if (!accountMetrics || accountMetrics.length === 0) {
            return {
                netChange: 0,
                netChangePercent: 0,
                avgDailyNewFollowers: 0,
                totalNewFollowers: 0,
                currentFollowers: 0,
                chartData: [],
                dailyChangeTicks: [0]
            };
        }

        // Get current followers from latest metric
        const latestMetric = accountMetrics[accountMetrics.length - 1];
        const currentFollowers = latestMetric?.followers_count || 0;

        // Calculate daily change by comparing to previous day (LAG logic)
        const chartData = accountMetrics.map((m, index) => {
            const prevFollowers = index > 0 ? accountMetrics[index - 1].followers_count : m.followers_count;
            const dailyChange = m.followers_count - prevFollowers;

            return {
                date: m.metric_date,
                daily_change: index === 0 ? 0 : dailyChange
            };
        });

        // Calculate smart ticks for daily change Y-axis - can be negative
        const dailyChanges = chartData.map(d => d.daily_change);
        const minDailyChange = Math.min(...dailyChanges);
        const maxDailyChange = Math.max(...dailyChanges);
        const dailyChangeTicks = getSmartTicksWithNegative(minDailyChange, maxDailyChange);

        // Calculate net change (total growth over period)
        const firstFollowers = accountMetrics[0]?.followers_count || 0;
        const lastFollowers = accountMetrics[accountMetrics.length - 1]?.followers_count || 0;
        const netChange = lastFollowers - firstFollowers;
        const netChangePercent = firstFollowers > 0
            ? ((lastFollowers - firstFollowers) / firstFollowers) * 100
            : 0;

        // Calculate total and average daily new followers
        const totalNewFollowers = accountMetrics.reduce((sum, m) => sum + (m.daily_follows || 0), 0);
        const avgDailyNewFollowers = accountMetrics.length > 0
            ? Math.round(totalNewFollowers / accountMetrics.length)
            : 0;

        return {
            netChange,
            netChangePercent,
            avgDailyNewFollowers,
            totalNewFollowers,
            currentFollowers,
            chartData,
            dailyChangeTicks
        };
    }, [accountMetrics]);

    // Calculate growth rate
    const growthRate = useMemo(() => {
        if (!accountMetrics || accountMetrics.length < 2) return 0;
        const firstFollowers = accountMetrics[0]?.followers_count || 0;
        const lastFollowers = accountMetrics[accountMetrics.length - 1]?.followers_count || 0;
        if (firstFollowers === 0) return 0;
        return ((lastFollowers - firstFollowers) / firstFollowers) * 100;
    }, [accountMetrics]);

    if (accountsLoading || loading) {
        return (
            <div className="flex items-center justify-center py-20 text-blue-600">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!selectedAccountId) {
        return (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl">
                No Facebook account configured. Please contact your administrator.
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl">
                Error loading Facebook audience data: {error}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Followers */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1">Total Followers</p>
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{currentFollowers.toLocaleString()}</p>
                        </div>
                        <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-blue-50 flex-shrink-0">
                            <Users size={16} className="text-blue-600 md:hidden" />
                            <Users size={20} className="text-blue-600 hidden md:block" />
                        </div>
                    </div>
                </div>

                {/* New Followers */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1">New Followers</p>
                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                <p className="text-lg md:text-2xl font-bold text-slate-800">
                                    {totalNewFollowers >= 0 ? '+' : ''}{totalNewFollowers.toLocaleString()}
                                </p>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">In date range</p>
                        </div>
                        <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-emerald-50 flex-shrink-0">
                            <Users size={16} className="text-emerald-600 md:hidden" />
                            <Users size={20} className="text-emerald-600 hidden md:block" />
                        </div>
                    </div>
                </div>

                {/* Follower Growth Rate */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1">Growth Rate</p>
                            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                <p className="text-lg md:text-2xl font-bold text-slate-800">
                                    {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                                </p>
                            </div>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">Period change</p>
                        </div>
                        <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-violet-50 flex-shrink-0">
                            <Globe size={16} className="text-violet-600 md:hidden" />
                            <Globe size={20} className="text-violet-600 hidden md:block" />
                        </div>
                    </div>
                </div>

                {/* Avg New Followers/Day */}
                <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3 md:p-4 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 mb-1">Avg. Daily</p>
                            <p className="text-lg md:text-2xl font-bold text-slate-800">{avgDailyNewFollowers.toLocaleString()}</p>
                            <p className="text-[10px] md:text-xs text-slate-400 mt-1">New followers/day</p>
                        </div>
                        <div className="p-2 md:p-2.5 rounded-lg md:rounded-xl bg-sky-50 flex-shrink-0">
                            <MapPin size={16} className="text-sky-600 md:hidden" />
                            <MapPin size={20} className="text-sky-600 hidden md:block" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Follower Growth Chart with Integrated Header */}
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                {/* Integrated Header: Title + Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 md:mb-6">
                    {/* Left: Title */}
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">Follower Growth</h3>

                    {/* Right: Stat Blocks - Matching Performance Overview */}
                    <div className="flex items-center gap-6">
                        {/* Net Change Stat Block */}
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="text-xs text-gray-500">Net Change</p>
                                <p className="text-xl md:text-2xl font-bold text-gray-900">
                                    {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
                                </p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${netChangePercent >= 0 ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                                {netChangePercent >= 0 ? '+' : ''}{netChangePercent.toFixed(1)}%
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="h-10 w-px bg-gray-200 hidden md:block"></div>

                        {/* Avg Daily Stat Block */}
                        <div>
                            <p className="text-xs text-gray-500">Avg. Daily</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-900">
                                {avgDailyNewFollowers.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Single-Axis Bar Chart: Daily Change Only */}
                <div className="h-[250px] md:h-[300px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(parseLocalDate(str), 'MMM d')}
                                    stroke="#6B7280"
                                    tick={{ fontSize: 11, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval="preserveStartEnd"
                                    minTickGap={40}
                                    tickMargin={10}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    tick={{ fontSize: 11, fill: '#6B7280' }}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-5}
                                    domain={[dailyChangeTicks[0], dailyChangeTicks[dailyChangeTicks.length - 1]]}
                                    ticks={dailyChangeTicks}
                                />
                                <Tooltip content={<DailyChangeTooltip />} />
                                <Bar
                                    dataKey="daily_change"
                                    fill={FB_BLUE}
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={50}
                                >
                                    <LabelList
                                        dataKey="daily_change"
                                        position="top"
                                        formatter={(val) => val >= 0 ? `+${val}` : val}
                                        fontSize={11}
                                        fill="#374151"
                                        fontWeight={600}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            No follower data available for this period
                        </div>
                    )}
                </div>
            </div>

            {/* Demographics Analysis - Two Side-by-Side Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CountryBarChart
                    data={countryData}
                    selectedCountry={selectedCountry}
                    onCountryClick={handleCountryClick}
                />
                <CityDonutChart
                    data={cityData}
                    selectedCountry={selectedCountry}
                    selectedCountryName={selectedCountryName}
                    onClearFilter={clearCountryFilter}
                />
            </div>
        </div>
    );
};

export default FacebookAudience;
