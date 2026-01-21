import React from 'react';
import { Lock } from 'lucide-react';

const WebTraffic = () => {
    return (
        <div className="relative h-screen overflow-hidden">
            {/* Blurred Background Content (Placeholder Dashboard) */}
            <div className="filter blur-md opacity-40 grayscale-[50%] pointer-events-none select-none">
                <div className="space-y-4 md:space-y-6">
                    {/* Page Header Placeholder */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Web Traffic</h1>
                            <p className="text-gray-500 mt-1 text-sm md:text-base">Production website analytics from Vercel.</p>
                        </div>
                        <div className="w-64 h-10 bg-gray-200 rounded-xl"></div>
                    </div>

                    {/* KPI Cards Placeholder */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-3 md:mb-4">
                                    <div>
                                        <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                                        <div className="w-16 h-8 bg-gray-300 rounded"></div>
                                    </div>
                                    <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                                </div>
                                <div className="w-32 h-3 bg-gray-100 rounded"></div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Placeholder */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="w-40 h-6 bg-gray-200 rounded mb-6"></div>
                        <div className="h-[250px] md:h-[350px] w-full bg-gradient-to-b from-gray-100 to-gray-50 rounded-xl flex items-center justify-center">
                            <div className="w-full h-32 mx-8 border-b-2 border-l-2 border-gray-200 relative">
                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                    <path
                                        d="M 0 100 Q 50 80, 100 70 T 200 60 T 300 50 T 400 40"
                                        fill="none"
                                        stroke="#E5E7EB"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Grid Placeholder */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-32 h-6 bg-gray-200 rounded mb-4"></div>
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <div className="w-40 h-4 bg-gray-100 rounded"></div>
                                        <div className="w-12 h-4 bg-gray-200 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-32 h-6 bg-gray-200 rounded mb-4"></div>
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between">
                                            <div className="w-32 h-4 bg-gray-100 rounded"></div>
                                            <div className="w-12 h-4 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full">
                                            <div
                                                className="h-full bg-gray-300 rounded-full"
                                                style={{ width: `${100 - i * 20}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-50">
                <div className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl rounded-2xl p-10 text-center max-w-md mx-4">
                    {/* Lock Icon */}
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-6">
                        <Lock className="w-8 h-8 text-violet-600" />
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        Web Traffic Analytics
                    </h2>

                    {/* Coming Soon Badge */}
                    <span className="inline-block px-4 py-1.5 bg-violet-600 text-white text-sm font-semibold rounded-full mb-4">
                        Coming Soon
                    </span>

                    {/* Subtext */}
                    <p className="text-gray-500 text-sm leading-relaxed">
                        We are currently integrating deeper traffic insights from Vercel Analytics.
                        Stay tuned for comprehensive visitor metrics, page performance, and referral tracking.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WebTraffic;
