import { useState, useEffect } from 'react';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';
import {
  Search, Download, LogIn, LogOut, Eye,
  MousePointer, RefreshCw, ChevronLeft, ChevronRight,
  Calendar, User, Globe, Monitor
} from 'lucide-react';

const EVENT_TYPES = {
  login_success: { label: 'Login', icon: LogIn, color: 'text-green-600 bg-green-50' },
  logout: { label: 'Logout', icon: LogOut, color: 'text-slate-600 bg-slate-50' },
  login_failed: { label: 'Failed Login', icon: LogIn, color: 'text-red-600 bg-red-50' },
  page_view: { label: 'Page View', icon: Eye, color: 'text-blue-600 bg-blue-50' },
  action: { label: 'Action', icon: MousePointer, color: 'text-purple-600 bg-purple-50' },
};

const TABS = [
  { id: 'logins', label: 'Login History' },
  { id: 'activity', label: 'Activity Logs' },
];

export default function AuditLogsTab({ organizationId }) {
  const [activeTab, setActiveTab] = useState('logins');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('7d'); // 24h, 7d, 30d, all
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // Fetch logs
  useEffect(() => {
    if (!organizationId) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const session = await supabaseSocial.auth.getSession();
        const token = session.data.session?.access_token;

        // Calculate date filter
        let dateFilterQuery = '';
        const now = new Date();
        if (dateFilter === '24h') {
          const yesterday = new Date(now - 24 * 60 * 60 * 1000);
          dateFilterQuery = `&created_at=gte.${yesterday.toISOString()}`;
        } else if (dateFilter === '7d') {
          const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          dateFilterQuery = `&created_at=gte.${weekAgo.toISOString()}`;
        } else if (dateFilter === '30d') {
          const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
          dateFilterQuery = `&created_at=gte.${monthAgo.toISOString()}`;
        }

        const table = activeTab === 'logins' ? 'login_logs' : 'activity_logs';

        // Get count first
        const countResponse = await fetch(
          `${PROXY_SUPABASE_URL}/rest/v1/${table}?select=count${dateFilterQuery}`,
          {
            headers: {
              'apikey': PROXY_SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Accept-Profile': 'identity',
              'Prefer': 'count=exact',
            }
          }
        );

        if (countResponse.ok) {
          const countHeader = countResponse.headers.get('content-range');
          if (countHeader) {
            const total = parseInt(countHeader.split('/')[1]);
            setTotalCount(total);
          }
        }

        // Get paginated data (without join - user_profiles join may fail)
        const offset = (page - 1) * pageSize;
        const response = await fetch(
          `${PROXY_SUPABASE_URL}/rest/v1/${table}?select=*${dateFilterQuery}&order=created_at.desc&limit=${pageSize}&offset=${offset}`,
          {
            headers: {
              'apikey': PROXY_SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Accept-Profile': 'identity',
            }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Fetch logs error:', response.status, errorText);
          throw new Error(`Failed to fetch logs: ${response.status}`);
        }
        const logsData = await response.json();

        // Fetch user profiles separately for the user_ids in the logs
        const userIds = [...new Set(logsData.map(log => log.user_id).filter(Boolean))];
        let userMap = {};

        if (userIds.length > 0) {
          try {
            const usersResponse = await fetch(
              `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=in.(${userIds.join(',')})&select=id,email,display_name`,
              {
                headers: {
                  'apikey': PROXY_SUPABASE_KEY,
                  'Authorization': `Bearer ${token}`,
                  'Accept-Profile': 'identity',
                }
              }
            );
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              userMap = usersData.reduce((acc, user) => {
                acc[user.id] = user;
                return acc;
              }, {});
            }
          } catch (userErr) {
            console.error('Error fetching user profiles:', userErr);
          }
        }

        // Merge user data into logs
        const logsWithUsers = logsData.map(log => ({
          ...log,
          user: userMap[log.user_id] || null,
        }));

        setLogs(logsWithUsers);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [organizationId, activeTab, dateFilter, page]);

  // Export logs as CSV
  const exportCSV = () => {
    if (logs.length === 0) return;

    const headers = activeTab === 'logins'
      ? ['Date', 'User', 'Event', 'Provider', 'IP Address', 'User Agent']
      : ['Date', 'User', 'Route', 'Action', 'Duration (ms)'];

    const rows = logs.map(log => {
      if (activeTab === 'logins') {
        return [
          new Date(log.created_at).toISOString(),
          log.user?.email || log.user_id,
          log.event_type,
          log.provider || '',
          log.ip_address || '',
          log.user_agent || '',
        ];
      } else {
        return [
          new Date(log.created_at).toISOString(),
          log.user?.email || log.user_id,
          log.route || '',
          log.action || '',
          log.duration_ms || '',
        ];
      }
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter logs by search
  const filteredLogs = logs.filter(log =>
    log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.route?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && logs.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-600">Loading logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Sub-tabs */}
      <div className="border-b">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPage(1);
              // Trigger refetch by toggling loading
              setLoading(true);
            }}
            className="p-2 hover:bg-slate-100 rounded text-slate-500"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {activeTab === 'logins' ? (
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Event</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Provider</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">IP Address</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.map((log) => {
                const eventConfig = EVENT_TYPES[log.event_type] || EVENT_TYPES.login_success;
                const EventIcon = eventConfig.icon;

                // Parse user agent for device info
                const userAgent = log.user_agent || '';
                const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
                const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[0] || 'Unknown';

                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-800">
                          {log.user?.display_name || log.user?.email || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${eventConfig.color}`}>
                        <EventIcon className="w-3 h-3" />
                        {eventConfig.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600 capitalize">
                        {log.provider || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600 font-mono">
                          {log.ip_address || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {browser} {isMobile ? '(Mobile)' : '(Desktop)'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Route</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Action</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-800">
                        {log.user?.display_name || log.user?.email || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {log.route || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">
                      {log.action || 'page_view'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filteredLogs.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No logs found for the selected filters.
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} logs
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
