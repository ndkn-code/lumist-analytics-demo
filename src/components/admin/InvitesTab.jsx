import { useState, useEffect } from 'react';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';
import { useAuth } from '../../auth';
import {
  Search, Plus, Mail, Clock, CheckCircle, XCircle,
  Send, Trash2, X, User, Shield, UserCheck
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', icon: Shield, description: 'Full access to all dashboard routes' },
  { value: 'internal', label: 'Internal', icon: UserCheck, description: 'Access to team-assigned routes only' },
  { value: 'viewer', label: 'Viewer', icon: User, description: 'Limited access (Home & Features only)' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  accepted: { label: 'Accepted', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  expired: { label: 'Expired', color: 'text-red-600 bg-red-50', icon: XCircle },
  revoked: { label: 'Revoked', color: 'text-slate-600 bg-slate-50', icon: XCircle },
};

export default function InvitesTab({ organizationId }) {
  const { profile } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // New invite form state
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'viewer',
    team_id: null,
  });
  const [teams, setTeams] = useState([]);

  // Fetch invites
  useEffect(() => {
    if (!organizationId) return;

    const fetchInvites = async () => {
      setLoading(true);
      try {
        const session = await supabaseSocial.auth.getSession();
        const token = session.data.session?.access_token;

        const response = await fetch(
          `${PROXY_SUPABASE_URL}/rest/v1/user_invites?organization_id=eq.${organizationId}&select=*,invited_by_user:user_profiles!invited_by(display_name,email)&order=created_at.desc`,
          {
            headers: {
              'apikey': PROXY_SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Accept-Profile': 'identity',
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch invites');
        const data = await response.json();
        setInvites(data);
      } catch (err) {
        console.error('Error fetching invites:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvites();
  }, [organizationId]);

  // Fetch teams for the dropdown
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

  // Create new invite (or update existing profile if user already signed up)
  const createInvite = async (e) => {
    e.preventDefault();
    if (!newInvite.email) return;

    setCreating(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;
      const emailLower = newInvite.email.toLowerCase().trim();

      // Check if invite already exists
      const existingInvite = invites.find(
        i => i.email.toLowerCase() === emailLower && i.status === 'pending'
      );
      if (existingInvite) {
        alert('An invite for this email is already pending');
        setCreating(false);
        return;
      }

      // Check if user profile already exists (user signed up before invite was created)
      // Use ilike for case-insensitive email matching (Google OAuth may store different casing)
      const profileResponse = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?email=ilike.${encodeURIComponent(emailLower)}&select=id,email,is_active,role`,
        {
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Accept-Profile': 'identity',
          }
        }
      );

      if (profileResponse.ok) {
        const existingProfiles = await profileResponse.json();

        if (existingProfiles.length > 0) {
          // Profile exists - update it directly instead of creating an invite
          const existingProfile = existingProfiles[0];

          const updateData = {
            role: newInvite.role,
            organization_id: organizationId,
            team_id: newInvite.role === 'internal' ? newInvite.team_id : null,
            is_active: true,
          };

          const updateResponse = await fetch(
            `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${existingProfile.id}`,
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

          if (!updateResponse.ok) {
            const errData = await updateResponse.json();
            throw new Error(errData.message || 'Failed to update existing profile');
          }

          // Create an "accepted" invite record for audit purposes
          const inviteData = {
            email: emailLower,
            role: newInvite.role,
            organization_id: organizationId,
            invited_by: profile.id,
            team_id: newInvite.role === 'internal' ? newInvite.team_id : null,
            status: 'accepted', // Mark as already accepted
            accepted_at: new Date().toISOString(),
            expires_at: new Date().toISOString(), // Already processed
          };

          const inviteResponse = await fetch(
            `${PROXY_SUPABASE_URL}/rest/v1/user_invites`,
            {
              method: 'POST',
              headers: {
                'apikey': PROXY_SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Profile': 'identity',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
              },
              body: JSON.stringify(inviteData),
            }
          );

          if (inviteResponse.ok) {
            const [createdInvite] = await inviteResponse.json();
            setInvites([{ ...createdInvite, invited_by_user: { display_name: profile.display_name, email: profile.email } }, ...invites]);
          }

          alert(`User ${emailLower} already exists and has been activated with the ${newInvite.role} role. They can now access the dashboard.`);
          setShowCreateModal(false);
          setNewInvite({ email: '', role: 'viewer', team_id: null });
          setCreating(false);
          return;
        }
      }

      // No existing profile - create invite as normal
      const inviteData = {
        email: emailLower,
        role: newInvite.role,
        organization_id: organizationId,
        invited_by: profile.id,
        team_id: newInvite.role === 'internal' ? newInvite.team_id : null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_invites`,
        {
          method: 'POST',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(inviteData),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create invite');
      }

      const [createdInvite] = await response.json();
      setInvites([{ ...createdInvite, invited_by_user: { display_name: profile.display_name, email: profile.email } }, ...invites]);
      setShowCreateModal(false);
      setNewInvite({ email: '', role: 'viewer', team_id: null });
    } catch (err) {
      console.error('Error creating invite:', err);
      alert('Failed to create invite: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Cancel invite
  const cancelInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;

    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_invites?id=eq.${inviteId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'revoked' }),
        }
      );

      if (!response.ok) throw new Error('Failed to cancel invite');

      setInvites(invites.map(i => i.id === inviteId ? { ...i, status: 'revoked' } : i));
    } catch (err) {
      console.error('Error cancelling invite:', err);
      alert('Failed to cancel invite: ' + err.message);
    }
  };

  // Resend invite (create new one, cancel old)
  const resendInvite = async (invite) => {
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      // Cancel old invite
      await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_invites?id=eq.${invite.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'revoked' }),
        }
      );

      // Create new invite
      const inviteData = {
        email: invite.email,
        role: invite.role,
        organization_id: organizationId,
        invited_by: profile.id,
        team_id: invite.team_id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_invites`,
        {
          method: 'POST',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(inviteData),
        }
      );

      if (!response.ok) throw new Error('Failed to resend invite');

      const [newInviteData] = await response.json();
      setInvites([
        { ...newInviteData, invited_by_user: { display_name: profile.display_name, email: profile.email } },
        ...invites.map(i => i.id === invite.id ? { ...i, status: 'revoked' } : i)
      ]);

      alert('Invite resent successfully!');
    } catch (err) {
      console.error('Error resending invite:', err);
      alert('Failed to resend invite: ' + err.message);
    }
  };

  // Filter invites by search
  const filteredInvites = invites.filter(invite =>
    invite.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if invite is expired
  const isExpired = (invite) => {
    if (invite.status !== 'pending') return false;
    return invite.expires_at && new Date(invite.expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-600">Loading invites...</span>
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
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search invites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Invited By</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Expires</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvites.map((invite) => {
                const expired = isExpired(invite);
                const status = expired ? 'expired' : invite.status;
                const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const roleOption = ROLE_OPTIONS.find(r => r.value === invite.role) || ROLE_OPTIONS[2];
                const RoleIcon = roleOption.icon;

                return (
                  <tr key={invite.id} className="hover:bg-slate-50">
                    {/* Email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-800">{invite.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <RoleIcon className="w-4 h-4" />
                        {roleOption.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>

                    {/* Invited By */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-slate-500">
                        {invite.invited_by_user?.display_name || invite.invited_by_user?.email || '—'}
                      </span>
                    </td>

                    {/* Expires */}
                    <td className="py-3 px-4">
                      <span className={`text-sm ${expired ? 'text-red-500' : 'text-slate-500'}`}>
                        {invite.expires_at
                          ? new Date(invite.expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {(status === 'pending' || status === 'expired') && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resendInvite(invite)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-violet-600"
                            title="Resend invite"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelInvite(invite.id)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600"
                            title="Cancel invite"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvites.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No invites found. Click "Invite User" to send your first invite.
          </div>
        )}
      </div>

      {/* Create Invite Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">Invite New User</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={createInvite} className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((role) => {
                    const Icon = role.icon;
                    return (
                      <label
                        key={role.value}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          newInvite.role === role.value
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={newInvite.role === role.value}
                          onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
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
              {newInvite.role === 'internal' && teams.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Team
                  </label>
                  <select
                    value={newInvite.team_id || ''}
                    onChange={(e) => setNewInvite({ ...newInvite, team_id: e.target.value || null })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newInvite.email}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Invite
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
