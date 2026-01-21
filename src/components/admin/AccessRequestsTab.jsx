import { useState, useEffect } from 'react';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';
import { useAuth } from '../../auth';
import {
  Search, Clock, CheckCircle, XCircle, X,
  User, Shield, UserCheck, Check, AlertCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-amber-600 bg-amber-50', icon: Clock },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  denied: { label: 'Denied', color: 'text-red-600 bg-red-50', icon: XCircle },
};

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', icon: Shield, description: 'Full access to all dashboard routes' },
  { value: 'internal', label: 'Internal', icon: UserCheck, description: 'Access to team-assigned routes only' },
  { value: 'viewer', label: 'Viewer', icon: User, description: 'Limited access (Home & Features only)' },
];

export default function AccessRequestsTab({ organizationId }) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('pending'); // 'pending', 'denied', 'all'

  // Approve modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [approving, setApproving] = useState(false);
  const [approvalData, setApprovalData] = useState({
    role: 'viewer',
    team_id: null,
  });

  // Fetch access requests
  useEffect(() => {
    fetchRequests();
  }, [organizationId, filter]);

  // Fetch teams for the approve modal
  useEffect(() => {
    if (!organizationId) return;

    const fetchTeams = async () => {
      try {
        const session = await supabaseSocial.auth.getSession();
        const token = session.data.session?.access_token;

        const response = await fetch(
          `${PROXY_SUPABASE_URL}/rest/v1/teams?organization_id=eq.${organizationId}&select=id,name`,
          {
            headers: {
              'apikey': PROXY_SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Accept-Profile': 'identity',
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setTeams(data);
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
      }
    };

    fetchTeams();
  }, [organizationId]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      // Build filter query
      // We want users who: is_active = false AND request_status IS NOT NULL
      let filterQuery = 'is_active=eq.false&request_status=not.is.null';

      // Apply status filter
      if (filter === 'pending') {
        filterQuery += '&request_status=eq.pending';
      } else if (filter === 'denied') {
        filterQuery += '&request_status=eq.denied';
      }
      // 'all' shows both pending and denied

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?${filterQuery}&select=*&order=request_submitted_at.desc.nullsfirst,created_at.desc`,
        {
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Accept-Profile': 'identity',
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch access requests');
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      console.error('Error fetching access requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open approve modal
  const openApproveModal = (user) => {
    setSelectedUser(user);
    setApprovalData({ role: 'viewer', team_id: null });
    setShowApproveModal(true);
  };

  // Approve request
  const approveRequest = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setApproving(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      const updateData = {
        role: approvalData.role,
        team_id: approvalData.role === 'internal' ? approvalData.team_id : null,
        organization_id: organizationId,
        is_active: true,
        request_status: 'approved',
        request_processed_by: profile.id,
        request_processed_at: new Date().toISOString(),
      };

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${selectedUser.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) throw new Error('Failed to approve request');

      // Remove from list or update status
      setRequests(requests.filter(r => r.id !== selectedUser.id));
      setShowApproveModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Failed to approve request: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  // Deny request
  const denyRequest = async (userId) => {
    if (!confirm('Are you sure you want to deny this access request?')) return;

    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      const updateData = {
        request_status: 'denied',
        request_processed_by: profile.id,
        request_processed_at: new Date().toISOString(),
      };

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) throw new Error('Failed to deny request');

      // Update local state
      if (filter === 'pending') {
        setRequests(requests.filter(r => r.id !== userId));
      } else {
        setRequests(requests.map(r =>
          r.id === userId ? { ...r, request_status: 'denied' } : r
        ));
      }
    } catch (err) {
      console.error('Error denying request:', err);
      alert('Failed to deny request: ' + err.message);
    }
  };

  // Filter requests by search
  const filteredRequests = requests.filter(request =>
    request.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count pending requests
  const pendingCount = requests.filter(r => r.request_status === 'pending').length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-600">Loading access requests...</span>
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
    <>
      <div className="bg-white rounded-lg border">
        {/* Header with filters */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
              />
            </div>
            <span className="text-sm text-slate-500">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Pending
              {filter !== 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('denied')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'denied'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Denied
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Requested At</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRequests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.request_status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;

                return (
                  <tr key={request.id} className="hover:bg-slate-50">
                    {/* User info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium">
                          {request.avatar_url ? (
                            <img src={request.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            request.display_name?.charAt(0) || request.email?.charAt(0) || '?'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{request.display_name || 'No name'}</p>
                          <p className="text-sm text-slate-500">{request.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Requested At */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-600">
                        {request.request_submitted_at
                          ? new Date(request.request_submitted_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : request.created_at
                          ? new Date(request.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {request.request_status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openApproveModal(request)}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => denyRequest(request.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Deny
                          </button>
                        </div>
                      )}
                      {request.request_status === 'denied' && (
                        <button
                          onClick={() => openApproveModal(request)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          Reconsider
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500">
              {filter === 'pending' && 'No pending access requests'}
              {filter === 'denied' && 'No denied requests'}
              {filter === 'all' && 'No access requests found'}
            </p>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">Approve Access Request</h3>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedUser(null);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={approveRequest} className="p-4 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    selectedUser.display_name?.charAt(0) || selectedUser.email?.charAt(0) || '?'
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{selectedUser.display_name || 'No name'}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign Role
                </label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((role) => {
                    const Icon = role.icon;
                    return (
                      <label
                        key={role.value}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          approvalData.role === role.value
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={approvalData.role === role.value}
                          onChange={(e) => setApprovalData({ ...approvalData, role: e.target.value })}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-slate-600" />
                            <span className="font-medium text-slate-800">{role.label}</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Team (only for internal role) */}
              {approvalData.role === 'internal' && teams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Assign to Team
                  </label>
                  <select
                    value={approvalData.team_id || ''}
                    onChange={(e) => setApprovalData({ ...approvalData, team_id: e.target.value || null })}
                    required={approvalData.role === 'internal'}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {approvalData.role === 'internal' && teams.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    No teams available. Create a team first to assign internal users.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving || (approvalData.role === 'internal' && !approvalData.team_id)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {approving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Approve Access
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
