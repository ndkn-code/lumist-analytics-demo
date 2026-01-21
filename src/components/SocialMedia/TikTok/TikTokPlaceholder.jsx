import React from 'react';
import { Video, Play, Users, TrendingUp } from 'lucide-react';

const TikTokPlaceholder = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black mb-6 relative overflow-hidden">
                    <Video size={40} className="text-white" />
                    <div className="absolute -left-1 -top-1 w-4 h-4 rounded-full bg-[#25F4EE] opacity-70" />
                    <div className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-[#FE2C55] opacity-70" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">TikTok Analytics</h2>
                <p className="text-slate-500 max-w-lg mx-auto mb-8">
                    Connect your TikTok account to track video performance, trending sounds, audience demographics, and growth metrics.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-8">
                    <div className="p-4 rounded-xl bg-slate-50">
                        <Play size={24} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Video Analytics</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50">
                        <TrendingUp size={24} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Trending Content</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50">
                        <Users size={24} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Audience Insights</p>
                    </div>
                </div>
                <span className="inline-flex items-center px-6 py-3 rounded-full bg-black text-white text-sm font-medium">
                    Coming Soon
                </span>
            </div>
        </div>
    );
};

export default TikTokPlaceholder;
