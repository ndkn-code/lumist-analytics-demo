import React from 'react';
import { Instagram, Image, Heart, Users } from 'lucide-react';

const InstagramPlaceholder = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45] mb-6">
                    <Instagram size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Instagram Analytics</h2>
                <p className="text-slate-500 max-w-lg mx-auto mb-8">
                    Connect your Instagram account to track post performance, story analytics, reel metrics, and audience insights.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-8">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50">
                        <Image size={24} className="text-pink-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Post Analytics</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50">
                        <Heart size={24} className="text-pink-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Story Insights</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50">
                        <Users size={24} className="text-pink-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Reel Performance</p>
                    </div>
                </div>
                <span className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white text-sm font-medium">
                    Coming Soon
                </span>
            </div>
        </div>
    );
};

export default InstagramPlaceholder;
