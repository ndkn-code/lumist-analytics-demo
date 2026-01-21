import React, { useState, useEffect, useMemo } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker
} from 'react-simple-maps';
import {
    MapPin,
    Calendar,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ChevronDown,
    Building2,
    Plus,
    Minus,
    Maximize2
} from 'lucide-react';
import { supabaseSocial as proxyClient } from '../lib/supabase';

// Vietnam TopoJSON source (local file to avoid CORS issues)
const VIETNAM_TOPO_JSON = "/vietnam.json";

// Official SAT test dates for 2025/2026
const ALL_SAT_DATES = [
    { value: '2025-03-08', label: 'March 8, 2025' },
    { value: '2025-05-03', label: 'May 3, 2025' },
    { value: '2025-06-07', label: 'June 7, 2025' },
    { value: '2025-08-23', label: 'August 23, 2025' },
    { value: '2025-10-04', label: 'October 4, 2025' },
    { value: '2025-11-01', label: 'November 1, 2025' },
    { value: '2025-12-06', label: 'December 6, 2025' },
    // 2026 dates (tentative)
    { value: '2026-03-14', label: 'March 14, 2026' },
    { value: '2026-05-02', label: 'May 2, 2026' },
    { value: '2026-06-06', label: 'June 6, 2026' },
];

// Filter to only show future dates
const getFutureSatDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ALL_SAT_DATES.filter(d => new Date(d.value) > today);
};

// City name aliases - Map UPPERCASE raw input -> Vietnamese accented output
const CITY_ALIASES = {
    // Hải Phòng
    'HAIPHONG': 'Hải Phòng',
    'HAI PHONG': 'Hải Phòng',
    'HAI PHONG CITY': 'Hải Phòng',
    'TP HAI PHONG': 'Hải Phòng',
    // Đà Nẵng
    'DANANG': 'Đà Nẵng',
    'DA NANG': 'Đà Nẵng',
    'DA NANG CITY': 'Đà Nẵng',
    'TP DA NANG': 'Đà Nẵng',
    // Hà Nội
    'HANOI': 'Hà Nội',
    'HA NOI': 'Hà Nội',
    'HA NOI CITY': 'Hà Nội',
    'TP HA NOI': 'Hà Nội',
    // Hồ Chí Minh
    'HCM': 'Hồ Chí Minh',
    'HCMC': 'Hồ Chí Minh',
    'HO CHI MINH': 'Hồ Chí Minh',
    'HO CHI MINH CITY': 'Hồ Chí Minh',
    'TP HO CHI MINH': 'Hồ Chí Minh',
    'TP HCM': 'Hồ Chí Minh',
    // Cần Thơ
    'CAN THO': 'Cần Thơ',
    'CAN THO CITY': 'Cần Thơ',
    'TP CAN THO': 'Cần Thơ',
    // Huế
    'HUE': 'Thừa Thiên Huế',
    'HUE CITY': 'Thừa Thiên Huế',
    'TP HUE': 'Thừa Thiên Huế',
    'THUA THIEN HUE': 'Thừa Thiên Huế',
    // Khánh Hòa / Nha Trang
    'KHANH HOA': 'Khánh Hòa',
    'NHA TRANG': 'Nha Trang',
    'NHA TRANG CITY': 'Nha Trang',
    'TP NHA TRANG': 'Nha Trang',
    // Vũng Tàu
    'VUNG TAU': 'Vũng Tàu',
    'VUNG TAU CITY': 'Vũng Tàu',
    'TP VUNG TAU': 'Vũng Tàu',
    'BA RIA VUNG TAU': 'Bà Rịa - Vũng Tàu',
    'BA RIA': 'Bà Rịa - Vũng Tàu',
    // Biên Hòa / Đồng Nai
    'BIEN HOA': 'Biên Hòa',
    'BIEN HOA CITY': 'Biên Hòa',
    'TP BIEN HOA': 'Biên Hòa',
    'DONG NAI': 'Đồng Nai',
    'DONG NAI PROVINCE': 'Đồng Nai',
    // Bình Dương
    'BINH DUONG': 'Bình Dương',
    'BINH DUONG PROVINCE': 'Bình Dương',
    'BINH DUONG CITY': 'Bình Dương',
    // Thủ Đức
    'THU DUC': 'Thủ Đức',
    'THU DUC CITY': 'Thủ Đức',
    'TP THU DUC': 'Thủ Đức',
    // Hưng Yên
    'HUNG YEN': 'Hưng Yên',
    'HUNG YEN PROVINCE': 'Hưng Yên',
    'HUNG YEN CITY': 'Hưng Yên',
    'TP HUNG YEN': 'Hưng Yên',
    // Quảng Ninh
    'QUANG NINH': 'Quảng Ninh',
    'QUANG NINH PROVINCE': 'Quảng Ninh',
    // Bắc Ninh
    'BAC NINH': 'Bắc Ninh',
    'BAC NINH CITY': 'Bắc Ninh',
    'BAC NINH PROVINCE': 'Bắc Ninh',
    'TP BAC NINH': 'Bắc Ninh',
    // Hải Dương
    'HAI DUONG': 'Hải Dương',
    'HAI DUONG CITY': 'Hải Dương',
    'HAI DUONG PROVINCE': 'Hải Dương',
    'TP HAI DUONG': 'Hải Dương',
    // Thái Nguyên
    'THAI NGUYEN': 'Thái Nguyên',
    'THAI NGUYEN CITY': 'Thái Nguyên',
    'TP THAI NGUYEN': 'Thái Nguyên',
    // Nghệ An
    'NGHE AN': 'Nghệ An',
    'NGHE AN PROVINCE': 'Nghệ An',
    // Thanh Hóa
    'THANH HOA': 'Thanh Hóa',
    'THANH HOA CITY': 'Thanh Hóa',
    'THANH HOA PROVINCE': 'Thanh Hóa',
    'TP THANH HOA': 'Thanh Hóa',
    // Bình Thuận
    'BINH THUAN': 'Bình Thuận',
    'BINH THUAN PROVINCE': 'Bình Thuận',
    // Lâm Đồng / Đà Lạt
    'LAM DONG': 'Lâm Đồng',
    'LAM DONG PROVINCE': 'Lâm Đồng',
    'DA LAT': 'Đà Lạt',
    'DA LAT CITY': 'Đà Lạt',
    'TP DA LAT': 'Đà Lạt',
    'DALAT': 'Đà Lạt',
};

// Normalize city name to Vietnamese with accents
const getCleanLocationName = (rawCity) => {
    if (!rawCity) return '';

    // Step 1: First check raw input directly (catches "BIEN HOA CITY" etc.)
    const rawUpperKey = rawCity.toUpperCase().trim();
    if (CITY_ALIASES[rawUpperKey]) {
        return CITY_ALIASES[rawUpperKey];
    }

    // Step 2: Aggressive cleaning - remove suffixes and prefixes
    let cleaned = rawCity
        .toUpperCase()
        .replace(/\s+CITY$/i, '')           // Remove " CITY" at end
        .replace(/\s+PROVINCE$/i, '')       // Remove " PROVINCE" at end
        .replace(/\bTHANH PHO\b/gi, '')     // Remove "THANH PHO" (Vietnamese for city)
        .replace(/\bTINH\b/gi, '')          // Remove "TINH" (Vietnamese for province)
        .replace(/\bVIETNAM\b/gi, '')       // Remove "VIETNAM"
        .replace(/\bVN\b/gi, '')            // Remove "VN"
        .replace(/^TP\.?\s*/i, '')          // Remove "TP" or "TP." prefix
        .replace(/[,\.]/g, '')              // Remove commas and periods
        .replace(/\s+/g, ' ')               // Normalize whitespace
        .trim();

    // Step 3: Check cleaned version
    if (CITY_ALIASES[cleaned]) {
        return CITY_ALIASES[cleaned];
    }

    // Step 4: Try with "TP " prefix (for cases like "TP BIEN HOA")
    const withTpPrefix = 'TP ' + cleaned;
    if (CITY_ALIASES[withTpPrefix]) {
        return CITY_ALIASES[withTpPrefix];
    }

    // Step 5: If no match, log warning and return cleaned version with title case
    console.warn('[SatTracker] Unmapped city found:', cleaned, '| Raw input:', rawCity);

    return cleaned
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Major Vietnam cities coordinates (fallback for API data without coords)
const CITY_COORDS = {
    'hanoi': { lat: 21.0285, lng: 105.8542 },
    'ha noi': { lat: 21.0285, lng: 105.8542 },
    'ho chi minh': { lat: 10.8231, lng: 106.6297 },
    'hcmc': { lat: 10.8231, lng: 106.6297 },
    'saigon': { lat: 10.8231, lng: 106.6297 },
    'sai gon': { lat: 10.8231, lng: 106.6297 },
    'thu duc': { lat: 10.8514, lng: 106.7536 },
    'da nang': { lat: 16.0544, lng: 108.2022 },
    'danang': { lat: 16.0544, lng: 108.2022 },
    'hai phong': { lat: 20.8449, lng: 106.6881 },
    'can tho': { lat: 10.0452, lng: 105.7469 },
    'nha trang': { lat: 12.2388, lng: 109.1967 },
    'hue': { lat: 16.4637, lng: 107.5909 },
    'vung tau': { lat: 10.3460, lng: 107.0843 },
    'bien hoa': { lat: 10.9574, lng: 106.8426 },
    'binh duong': { lat: 10.9804, lng: 106.6519 },
    'dong nai': { lat: 10.9574, lng: 106.8426 },
    'binh thanh': { lat: 10.8105, lng: 106.7091 },
    'district 1': { lat: 10.7756, lng: 106.7019 },
    'district 2': { lat: 10.7868, lng: 106.7505 },
    'district 7': { lat: 10.7340, lng: 106.7218 },
    'tan binh': { lat: 10.8014, lng: 106.6528 },
    'phu nhuan': { lat: 10.7997, lng: 106.6802 },
};

// Default map configuration
const DEFAULT_MAP_CONFIG = {
    center: [106, 16],  // Vietnam center [lng, lat]
    scale: 2000,        // Full country view
};

// Zoom levels
const ZOOM_LEVELS = {
    COUNTRY: 2000,      // Full Vietnam view
    CITY: 4500,         // City-level zoom (relaxed from 8000)
    MIN: 1500,          // Minimum zoom (most zoomed out)
    MAX: 15000,         // Maximum zoom (most zoomed in)
};

// Calculate center of gravity from markers
const getCenterOfMarkers = (markers) => {
    if (!markers || markers.length === 0) {
        return DEFAULT_MAP_CONFIG.center;
    }

    const validMarkers = markers.filter(m =>
        m.coordinates &&
        !isNaN(Number(m.coordinates[0])) &&
        !isNaN(Number(m.coordinates[1]))
    );

    if (validMarkers.length === 0) {
        return DEFAULT_MAP_CONFIG.center;
    }

    const totalLng = validMarkers.reduce((sum, m) => sum + Number(m.coordinates[0]), 0);
    const totalLat = validMarkers.reduce((sum, m) => sum + Number(m.coordinates[1]), 0);

    return [
        totalLng / validMarkers.length,
        totalLat / validMarkers.length
    ];
};

// Estimate coordinates from center name or city
const estimateCoordsFromCity = (centerName, city) => {
    const searchText = (centerName + ' ' + city).toLowerCase();

    for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
        if (searchText.includes(cityKey)) {
            // Add small random offset to prevent marker overlap
            return {
                lat: coords.lat + (Math.random() - 0.5) * 0.05,
                lng: coords.lng + (Math.random() - 0.5) * 0.05,
            };
        }
    }

    // Default to Ho Chi Minh City if no match (most test centers are there)
    return { lat: 10.8231 + (Math.random() - 0.5) * 0.1, lng: 106.6297 + (Math.random() - 0.5) * 0.1 };
};

// Test Center List Item Component - Premium SaaS styling
const CenterListItem = ({ center, isSelected, onClick }) => {
    const isOpen = center.status === 'available';

    return (
        <div
            onClick={() => onClick(center)}
            className={`
                p-4 rounded-xl cursor-pointer transition-all duration-200
                ${isSelected
                    ? 'border-l-4 border-l-violet-500 bg-violet-50/50 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
                    : 'border-l-4 border-l-transparent bg-white hover:bg-gray-50/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                }
            `}
        >
            <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={`
                    flex-shrink-0 p-2 rounded-lg
                    ${isOpen ? 'bg-teal-50' : 'bg-rose-50'}
                `}>
                    {isOpen ? (
                        <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    ) : (
                        <XCircle className="w-5 h-5 text-rose-600" />
                    )}
                </div>

                {/* Center Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm tracking-tight truncate">
                        {center.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                        {center.address || center.city}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`
                            inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full
                            ${isOpen
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-rose-50 text-rose-700'
                            }
                        `}>
                            {isOpen ? 'Open' : 'Full'}
                        </span>
                        {center.distance && (
                            <span className="text-xs text-gray-400">
                                {center.distance} km
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Loading Skeleton Component
const LoadingSkeleton = () => (
    <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-xl border border-gray-100 animate-pulse">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-5 bg-gray-200 rounded w-24" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// Stats Summary Component - Clean text row format
const StatsSummary = ({ centers }) => {
    const openCount = centers.filter(c => c.status === 'available').length;
    const fullCount = centers.length - openCount;

    return (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 pb-4 border-b border-gray-100">
            <span className="font-semibold text-gray-900">{centers.length}</span>
            <span>Total</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-teal-600">{openCount}</span>
            <span className="text-teal-600">Open</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold text-rose-600">{fullCount}</span>
            <span className="text-rose-600">Full</span>
        </div>
    );
};

const SatTracker = () => {
    // Filter to future dates only
    const futureDates = useMemo(() => getFutureSatDates(), []);
    const [selectedDate, setSelectedDate] = useState(futureDates[0]?.value || '');
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCenter, setSelectedCenter] = useState(null);
    const [isCached, setIsCached] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('All');
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CONFIG.center);
    const [mapScale, setMapScale] = useState(DEFAULT_MAP_CONFIG.scale);

    // Zoom control handlers
    const handleZoomIn = () => {
        setMapScale(prev => Math.min(prev * 1.3, ZOOM_LEVELS.MAX));
    };

    const handleZoomOut = () => {
        setMapScale(prev => Math.max(prev / 1.3, ZOOM_LEVELS.MIN));
    };

    const handleResetZoom = () => {
        setMapCenter(DEFAULT_MAP_CONFIG.center);
        setMapScale(DEFAULT_MAP_CONFIG.scale);
        setSelectedLocation('All');
    };

    // Extract unique locations from centers data
    const uniqueLocations = useMemo(() => {
        const cities = centers
            .map(c => c.city)
            .filter(city => city && city.trim() !== '')
            .map(city => city.trim());
        const unique = [...new Set(cities)].sort();
        return ['All', ...unique];
    }, [centers]);

    // Filter centers by selected location
    const filteredCenters = useMemo(() => {
        if (selectedLocation === 'All') return centers;
        return centers.filter(center =>
            center.city?.toLowerCase().includes(selectedLocation.toLowerCase())
        );
    }, [centers, selectedLocation]);

    // Auto-zoom and center map when location filter changes
    useEffect(() => {
        if (selectedLocation === 'All') {
            // Reset to full Vietnam view
            setMapCenter(DEFAULT_MAP_CONFIG.center);
            setMapScale(ZOOM_LEVELS.COUNTRY);
        } else {
            // Calculate center of gravity from filtered markers
            const newCenter = getCenterOfMarkers(filteredCenters);
            setMapCenter(newCenter);
            setMapScale(ZOOM_LEVELS.CITY);
        }
    }, [selectedLocation, filteredCenters]);

    // Transform API response to our format with binary status
    const transformCenters = (apiData) => {
        if (!apiData) return [];

        // Handle different API response structures
        const centersList = Array.isArray(apiData)
            ? apiData
            : apiData.testCenters || apiData.centers || [];

        return centersList.map((center, index) => {
            // Get coordinates from API or estimate from city name
            const lat = center.latitude || center.lat;
            const lng = center.longitude || center.lng || center.lon;

            const coords = (lat && lng)
                ? { lat: parseFloat(lat), lng: parseFloat(lng) }
                : estimateCoordsFromCity(center.name || '', center.city || '');

            // Determine status: binary (available or full)
            let status = 'available';
            if (center.status === 'full' || center.status === 'Full' ||
                center.seatsAvailable === false || center.availableSeats === 0 ||
                center.isFull === true) {
                status = 'full';
            }

            // Normalize city name to Vietnamese with accents
            const normalizedCity = getCleanLocationName(center.city);

            return {
                id: center.testCenterId || center.id || `center-${index}`,
                name: center.name || center.centerName || 'Unknown Center',
                address: center.address || center.streetAddress || '',
                city: normalizedCity,
                state: center.state || center.province || '',
                country: center.country || 'VN',
                status: status, // Binary: 'available' or 'full'
                distance: center.distance ? parseFloat(center.distance).toFixed(1) : null,
                coordinates: [coords.lng, coords.lat], // [longitude, latitude] for react-simple-maps
            };
        });
    };

    // Fetch SAT seats data
    const fetchSeats = async (forceRefresh = false) => {
        if (!selectedDate) {
            setError('No upcoming SAT dates available');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setSelectedCenter(null);

        try {
            console.log(`[SatTracker] Fetching seats for date: ${selectedDate}`);

            const { data, error: fnError } = await proxyClient.functions.invoke('get-sat-seats', {
                body: { date: selectedDate }
            });

            if (fnError) {
                throw new Error(fnError.message || 'Failed to fetch SAT seats');
            }

            if (!data?.success) {
                throw new Error(data?.error || 'API returned unsuccessful response');
            }

            const transformedCenters = transformCenters(data.data);
            setCenters(transformedCenters);
            setIsCached(data.cached || false);

            console.log(`[SatTracker] Loaded ${transformedCenters.length} centers (cached: ${data.cached})`);

        } catch (err) {
            console.error('[SatTracker] Error:', err);
            setError(err.message || 'Failed to fetch test centers');
            setCenters([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data when date changes
    useEffect(() => {
        if (selectedDate) {
            fetchSeats();
        }
    }, [selectedDate]);

    // Get selected date label
    const selectedDateLabel = futureDates.find(d => d.value === selectedDate)?.label || selectedDate;

    // Handle marker click
    const handleMarkerClick = (center) => {
        setSelectedCenter(center);
        // Scroll the list item into view on mobile
        const element = document.getElementById(`center-${center.id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Page Header - Premium SaaS integrated layout */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                            SAT Seat Finder
                        </h1>
                        <p className="text-gray-500 mt-0.5 text-sm">
                            Find available test centers in Vietnam
                        </p>
                    </div>

                    {/* Filters Row - Gray surface inputs */}
                    <div className="flex flex-wrap gap-2">
                        {/* Date Selector */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setIsDropdownOpen(!isDropdownOpen);
                                    setIsLocationDropdownOpen(false);
                                }}
                                disabled={futureDates.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200/80 transition-colors min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                    {futureDates.length > 0 ? selectedDateLabel : 'No dates'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && futureDates.length > 0 && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsDropdownOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] z-20 py-1 max-h-64 overflow-auto">
                                        {futureDates.map(date => (
                                            <button
                                                key={date.value}
                                                onClick={() => {
                                                    setSelectedDate(date.value);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`
                                                    w-full px-4 py-2.5 text-left text-sm transition-colors
                                                    ${selectedDate === date.value
                                                        ? 'bg-violet-50 text-violet-700 font-medium'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                {date.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Location Filter */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setIsLocationDropdownOpen(!isLocationDropdownOpen);
                                    setIsDropdownOpen(false);
                                }}
                                disabled={centers.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200/80 transition-colors min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                    {selectedLocation === 'All' ? 'All Cities' : selectedLocation}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isLocationDropdownOpen && uniqueLocations.length > 1 && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsLocationDropdownOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] z-20 py-1 max-h-64 overflow-auto">
                                        {uniqueLocations.map(location => (
                                            <button
                                                key={location}
                                                onClick={() => {
                                                    setSelectedLocation(location);
                                                    setIsLocationDropdownOpen(false);
                                                    setSelectedCenter(null);
                                                }}
                                                className={`
                                                    w-full px-4 py-2.5 text-left text-sm transition-colors
                                                    ${selectedLocation === location
                                                        ? 'bg-violet-50 text-violet-700 font-medium'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                {location === 'All' ? 'All Cities' : location}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Cached indicator */}
                        {isCached && !loading && (
                            <div className="flex items-center px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">
                                Cached
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error State - Premium styling */}
            {error && (
                <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                    <div>
                        <p className="font-medium text-rose-800">Unable to load test centers</p>
                        <p className="text-sm mt-1 text-rose-600">{error}</p>
                        <button
                            onClick={() => fetchSeats(true)}
                            className="mt-2 text-sm font-medium text-rose-700 hover:text-rose-800 flex items-center gap-1"
                        >
                            <RefreshCw className="w-4 h-4" /> Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content: Map + List */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
                {/* Map Section (3/5 width on desktop) - Full bleed premium style */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden">
                    {/* Map Container - Full bleed (no padding) */}
                    <div className="w-full h-[520px] bg-gray-50 relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <div className="text-center">
                                    <Loader2 className="w-10 h-10 text-violet-500 animate-spin mx-auto" />
                                    <p className="text-sm text-gray-500 mt-2">Loading test centers...</p>
                                </div>
                            </div>
                        ) : null}

                        {/* React Simple Maps - Vietnam with dynamic zoom based on markers */}
                        <ComposableMap
                            projection="geoMercator"
                            projectionConfig={{
                                scale: mapScale,
                                center: mapCenter
                            }}
                            width={800}
                            height={500}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <Geographies geography={VIETNAM_TOPO_JSON}>
                                {({ geographies }) => geographies.map((geo) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#F3F4F6"
                                        stroke="#E5E7EB"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: 'none' },
                                            hover: { fill: '#E5E7EB', outline: 'none' },
                                            pressed: { outline: 'none' },
                                        }}
                                    />
                                ))}
                            </Geographies>

                            {/* Map Markers - filtered by location with pulse animation */}
                            {filteredCenters.map((center) => {
                                const isOpen = center.status === 'available';
                                const isSelected = selectedCenter?.id === center.id;
                                // Ensure coordinates are numbers [lng, lat]
                                const safeCoords = [
                                    Number(center.coordinates[0]),
                                    Number(center.coordinates[1])
                                ];
                                // Teal for open, rose for full
                                const markerColor = isOpen ? '#14B8A6' : '#F43F5E';
                                const pulseColor = isOpen ? '#14B8A6' : '#F43F5E';

                                return (
                                    <Marker
                                        key={center.id}
                                        coordinates={safeCoords}
                                        onClick={() => handleMarkerClick(center)}
                                    >
                                        <g style={{ cursor: 'pointer' }}>
                                            {/* Pulse ring animation for open centers */}
                                            {isOpen && (
                                                <circle
                                                    r="8"
                                                    fill={pulseColor}
                                                    opacity="0.3"
                                                    className="marker-pulse"
                                                />
                                            )}
                                            {/* Main marker dot */}
                                            <circle
                                                r={isSelected ? 8 : 6}
                                                fill={markerColor}
                                                stroke="#fff"
                                                strokeWidth={2}
                                                style={{
                                                    transition: 'all 0.2s ease-out',
                                                    filter: isSelected ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                                                }}
                                            />
                                            {/* Inner highlight */}
                                            <circle
                                                r={isSelected ? 3 : 2}
                                                fill="#fff"
                                                opacity={0.8}
                                            />
                                        </g>
                                        {/* Tooltip on selection */}
                                        {isSelected && (
                                            <g>
                                                <rect
                                                    x={-(Math.min(center.name.length, 25) * 3.5 + 12)}
                                                    y={-32}
                                                    width={Math.min(center.name.length, 25) * 7 + 24}
                                                    height={20}
                                                    rx={4}
                                                    fill="#1F2937"
                                                    opacity={0.9}
                                                />
                                                <text
                                                    textAnchor="middle"
                                                    y={-18}
                                                    style={{
                                                        fontFamily: 'Inter, system-ui, sans-serif',
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        fill: '#fff',
                                                        pointerEvents: 'none',
                                                    }}
                                                >
                                                    {center.name.length > 25
                                                        ? center.name.substring(0, 25) + '...'
                                                        : center.name}
                                                </text>
                                            </g>
                                        )}
                                    </Marker>
                                );
                            })}
                        </ComposableMap>

                        {/* Legend - Premium styling */}
                        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] z-10">
                            <div className="flex items-center gap-4 text-xs font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                                    <span className="text-gray-600">Open</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                    <span className="text-gray-600">Full</span>
                                </div>
                            </div>
                        </div>

                        {/* Zoom Controls - Premium styling */}
                        <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
                            <button
                                onClick={handleZoomIn}
                                className="p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-gray-50 transition-colors"
                                title="Zoom in"
                            >
                                <Plus className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-gray-50 transition-colors"
                                title="Zoom out"
                            >
                                <Minus className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                                onClick={handleResetZoom}
                                className="p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:bg-gray-50 transition-colors"
                                title="Reset view"
                            >
                                <Maximize2 className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Empty State Overlay */}
                        {!loading && filteredCenters.length === 0 && !error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <div className="text-center p-6">
                                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">
                                        {centers.length === 0
                                            ? 'No test centers found for this date'
                                            : `No test centers in ${selectedLocation}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* List Section (2/5 width on desktop) - Premium styling */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            Test Centers
                        </h3>
                        <button
                            onClick={() => fetchSeats(true)}
                            disabled={loading}
                            className={`
                                p-2 rounded-lg transition-all duration-200
                                ${loading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200/80'
                                }
                            `}
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Stats Summary - shows filtered stats */}
                    {!loading && filteredCenters.length > 0 && (
                        <StatsSummary centers={filteredCenters} />
                    )}

                    {/* Centers List - filtered by location */}
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {loading ? (
                            <LoadingSkeleton />
                        ) : filteredCenters.length > 0 ? (
                            filteredCenters.map(center => (
                                <div key={center.id} id={`center-${center.id}`}>
                                    <CenterListItem
                                        center={center}
                                        isSelected={selectedCenter?.id === center.id}
                                        onClick={setSelectedCenter}
                                    />
                                </div>
                            ))
                        ) : !error ? (
                            <div className="text-center py-8">
                                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">
                                    {centers.length === 0
                                        ? 'No test centers available'
                                        : `No centers in ${selectedLocation}`}
                                </p>
                                <p className="text-gray-400 text-xs mt-1">
                                    {centers.length === 0
                                        ? 'Try selecting a different date'
                                        : 'Try selecting a different location'}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {/* Cache Info Footer */}
                    {!loading && filteredCenters.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-400 text-center">
                                Data for {selectedDateLabel}
                                {isCached && ' (cached - updates hourly)'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SatTracker;
