import React from 'react';
import { TrendingUp, Sparkles, LineChart } from 'lucide-react';

const FacebookTrends = () => {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                    <TrendingUp size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Trends & AI Insights</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                    AI-powered insights, trend analysis, and predictive recommendations will be available here.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} />
                        <span>AI recommendations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <LineChart size={16} />
                        <span>Growth predictions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} />
                        <span>Trending topics</span>
                    </div>
                </div>
                <div className="mt-8">
                    <span className="inline-flex items-center px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                        Coming Soon
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FacebookTrends;
