import { useState, useEffect } from 'react';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';
import { Search, MoreVertical, Shield, ShieldCheck, User, UserCheck, UserX } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50' },
  { value: 'admin', label: 'Admin', icon: Shield, color: 'text-blue-600 bg-blue-50' },
  { value: 'internal', label: 'Internal', icon: UserCheck, color: 'text-green-600 bg-green-50' },
  { value: 'viewer', label: 'Viewer', icon: User, color: 'text-slate-600 bg-slate-50' },
];

export default function UsersTab({ organizationId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Fetch users
  useEffect(() => {
    if (!organizationId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?organization_id=eq.${organizationId}&select=*,team:teams(name)&order=created_at.desc`,
          {
            headers: {
              'apikey': PROXY_SUPABASE_KEY,
              'Authorization': `Bearer ${(await supabaseSocial.auth.getSession()).data.session?.access_token}`,
              'Accept-Profile': 'identity',
            }
          }
        );

        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [organizationId]);

  // Update user role
  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${(await supabaseSocial.auth.getSession()).data.session?.access_token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) throw new Error('Failed to update role');

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role: ' + err.message);
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${(await supabaseSocial.auth.getSession()).data.session?.access_token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      if (!response.ok) throw new Error('Failed to update status');

      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      setActionMenuOpen(null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status: ' + err.message);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleConfig = (role) => ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[3];

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-600">Loading users...</span>
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
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
          />
        </div>
        <span className="text-sm text-slate-500">{filteredUsers.length} users</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">User</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Role</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Team</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Last Login</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => {
              const roleConfig = getRoleConfig(user.role);
              const RoleIcon = roleConfig.icon;

              return (
                <tr key={user.id} className="hover:bg-slate-50">
                  {/* User info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium text-sm">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          user.display_name?.charAt(0) || user.email?.charAt(0) || '?'
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{user.display_name || 'No name'}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3 px-4">
                    {editingUser === user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        onBlur={() => setEditingUser(null)}
                        autoFocus
                        className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {ROLE_OPTIONS.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingUser(user.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig.label}
                      </button>
                    )}
                  </td>

                  {/* Team */}
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-600">
                      {user.team?.name || '—'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'text-green-600 bg-green-50'
                        : 'text-red-600 bg-red-50'
                    }`}>
                      {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Last Login */}
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-500">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Never'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)}
                      className="p-1 hover:bg-slate-100 rounded"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>

                    {actionMenuOpen === user.id && (
                      <div className="absolute right-4 top-10 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="w-4 h-4 text-red-500" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 text-green-500" />
                              <span>Activate</span>
                            </>
                          )}
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

      {filteredUsers.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No users found
        </div>
      )}
    </div>
  );
}
