/**
 * SAT Tracker Demo Placeholder
 *
 * Displays a placeholder for the SAT Tracker feature which requires
 * external API integration (College Board) not available in demo mode.
 */

import { MapPin, Calendar, AlertCircle, ExternalLink } from 'lucide-react';

const SatTrackerDemo = () => {
  // Upcoming SAT dates for display
  const upcomingSATDates = [
    { date: '2025-08-23', name: 'August 2025' },
    { date: '2025-10-04', name: 'October 2025' },
    { date: '2025-11-01', name: 'November 2025' },
    { date: '2025-12-06', name: 'December 2025' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">SAT Test Center Finder</h1>
        <p className="text-slate-500 mt-1">Find available SAT test centers in Vietnam</p>
      </div>

      {/* Demo Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-xl">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-800">Demo Mode</h3>
            <p className="text-amber-700 mt-1">
              This feature requires real-time integration with the College Board API to show
              live test center availability. In demo mode, this functionality is disabled.
            </p>
            <p className="text-amber-600 mt-3 text-sm">
              In the production version, students can:
            </p>
            <ul className="text-amber-600 mt-2 text-sm list-disc list-inside space-y-1">
              <li>View all test centers in Vietnam on an interactive map</li>
              <li>See real-time seat availability for each center</li>
              <li>Filter by upcoming SAT test dates</li>
              <li>Get directions to test centers</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map Preview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <MapPin className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Interactive Map</h2>
          </div>

          {/* Mock Map */}
          <div className="relative bg-slate-100 rounded-xl h-64 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-blue-50 opacity-50"></div>
            <div className="relative text-center px-4">
              <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Vietnam Map</p>
              <p className="text-slate-400 text-sm mt-1">
                10+ test centers across major cities
              </p>
            </div>

            {/* Mock markers */}
            <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-violet-500 rounded-full opacity-30 animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-violet-500 rounded-full opacity-30 animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/3 w-4 h-4 bg-violet-500 rounded-full opacity-30 animate-pulse"></div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-slate-600">Seats Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
              <span className="text-slate-600">Full</span>
            </div>
          </div>
        </div>

        {/* Upcoming SAT Dates */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Upcoming SAT Dates</h2>
          </div>

          <div className="space-y-3">
            {upcomingSATDates.map((sat) => (
              <div
                key={sat.date}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-800">{sat.name}</p>
                  <p className="text-sm text-slate-500">{sat.date}</p>
                </div>
                <div className="px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-sm">
                  Demo Mode
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <a
              href="https://satsuite.collegeboard.org/sat/registration/dates-deadlines"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
            >
              <span>View official SAT dates</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Sample Test Centers */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Sample Test Centers (Preview)</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="pb-3 text-sm font-medium text-slate-500">Center Name</th>
                <th className="pb-3 text-sm font-medium text-slate-500">City</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'RMIT Vietnam - Saigon South', city: 'Ho Chi Minh City', status: 'available' },
                { name: 'Hanoi University', city: 'Hanoi', status: 'limited' },
                { name: 'Da Nang International School', city: 'Da Nang', status: 'full' },
                { name: 'British Vietnamese International School', city: 'Ho Chi Minh City', status: 'available' },
                { name: 'Vietnam National University', city: 'Hanoi', status: 'limited' },
              ].map((center, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="py-3 text-slate-800">{center.name}</td>
                  <td className="py-3 text-slate-600">{center.city}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        center.status === 'available'
                          ? 'bg-emerald-100 text-emerald-700'
                          : center.status === 'limited'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {center.status === 'available' ? 'Seats Available' : center.status === 'limited' ? 'Limited' : 'Full'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          * Sample data for demonstration. Actual availability requires College Board API integration.
        </p>
      </div>
    </div>
  );
};

export default SatTrackerDemo;
