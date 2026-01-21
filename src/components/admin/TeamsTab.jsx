import { useState, useEffect, useRef } from 'react';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';
import {
  Search, Plus, Building, Users, Edit2, Trash2, X,
  Check, ChevronDown, ChevronUp, Route, UserPlus,
  Folder, FolderOpen
} from 'lucide-react';

// Hierarchical route structure with groups
const ROUTE_GROUPS = [
  {
    id: 'core',
    label: 'Core Analytics',
    routes: [
      { path: '/', label: 'User Engagement' },
      { path: '/features', label: 'Feature Adoption' },
      { path: '/acquisition', label: 'Acquisition' },
      { path: '/sat-tracker', label: 'SAT Seat Finder' },
    ]
  },
  {
    id: 'revenue',
    label: 'Revenue',
    routes: [
      { path: '/revenue', label: 'Revenue Dashboard' },
    ]
  },
  {
    id: 'social-media',
    label: 'Social Media',
    routes: [
      { path: '/social-media', label: 'Social Media Hub' },
      { path: '/social-media/facebook', label: 'Facebook' },
      { path: '/social-media/threads', label: 'Threads' },
      { path: '/social-media/discord', label: 'Discord' },
      { path: '/social-media/instagram', label: 'Instagram' },
      { path: '/social-media/tiktok', label: 'TikTok' },
    ]
  },
];

// Flat list for backwards compatibility and label lookup
const AVAILABLE_ROUTES = ROUTE_GROUPS.flatMap(group =>
  group.routes.map(route => ({
    ...route,
    group: group.id,
    groupLabel: group.label
  }))
);

export default function TeamsTab({ organizationId }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [saving, setSaving] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, teamId: null });
  const contextMenuRef = useRef(null);

  // Add member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  // New team form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    allowed_routes: ['/'],
  });

  // Fetch teams with member count
  useEffect(() => {
    if (!organizationId) return;

    const fetchTeams = async () => {
      setLoading(true);
      try {
        const session = await supabaseSocial.auth.getSession();
        const token = session.data.session?.access_token;

        // Fetch teams
        const teamsResponse = await fetch(
          `${PROXY_SUPABASE_URL}/rest/v1/teams?organization_id=eq.${organizationId}&select=*&order=name.asc`,
          {
            headers: {
              'apikey': PROXY_SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Accept-Profile': 'identity',
            }
          }
        );

        if (!teamsResponse.ok) throw new Error('Failed to fetch teams');
        const teamsData = await teamsResponse.json();

        // Fetch members for each team
        const teamsWithMembers = await Promise.all(
          teamsData.map(async (team) => {
            const membersResponse = await fetch(
              `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?team_id=eq.${team.id}&select=id,email,display_name,avatar_url,role,is_active`,
              {
                headers: {
                  'apikey': PROXY_SUPABASE_KEY,
                  'Authorization': `Bearer ${token}`,
                  'Accept-Profile': 'identity',
                }
              }
            );
            const members = membersResponse.ok ? await membersResponse.json() : [];
            return { ...team, members };
          })
        );

        setTeams(teamsWithMembers);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [organizationId]);

  // Create new team
  const createTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.name) return;

    setSaving(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/teams`,
        {
          method: 'POST',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            name: newTeam.name,
            description: newTeam.description,
            allowed_routes: newTeam.allowed_routes,
            organization_id: organizationId,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create team');
      }

      const [createdTeam] = await response.json();
      setTeams([...teams, { ...createdTeam, members: [] }]);
      setShowCreateModal(false);
      setNewTeam({ name: '', description: '', allowed_routes: ['/'] });
    } catch (err) {
      console.error('Error creating team:', err);
      alert('Failed to create team: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update team
  const updateTeam = async (teamId, updates) => {
    setSaving(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/teams?id=eq.${teamId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) throw new Error('Failed to update team');

      const [updatedTeam] = await response.json();
      setTeams(teams.map(t => t.id === teamId ? { ...t, ...updatedTeam } : t));
      setEditingTeam(null);
    } catch (err) {
      console.error('Error updating team:', err);
      alert('Failed to update team: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete team
  const deleteTeam = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team?.members?.length > 0) {
      alert('Cannot delete team with members. Remove all members first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/teams?id=eq.${teamId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete team');

      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err) {
      console.error('Error deleting team:', err);
      alert('Failed to delete team: ' + err.message);
    }
  };

  // Remove member from team
  const removeMember = async (userId, teamId) => {
    if (!confirm('Remove this member from the team?')) return;

    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

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
          body: JSON.stringify({ team_id: null }),
        }
      );

      if (!response.ok) throw new Error('Failed to remove member');

      setTeams(teams.map(t =>
        t.id === teamId
          ? { ...t, members: t.members.filter(m => m.id !== userId) }
          : t
      ));
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Failed to remove member: ' + err.message);
    }
  };

  // Fetch available users for adding to team
  const fetchAvailableUsers = async (teamId) => {
    setLoadingUsers(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      // Fetch all users in the organization
      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?organization_id=eq.${organizationId}&is_active=eq.true&select=id,email,display_name,avatar_url,role,team_id`,
        {
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Accept-Profile': 'identity',
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();

      // Filter out users already in a team (since a user can only be in one team)
      // But show users from other teams with a note that they'll be moved
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e, teamId) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      teamId,
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, teamId: null });
      }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Open add member modal
  const openAddMemberModal = (teamId) => {
    setAddMemberTeamId(teamId);
    setShowAddMemberModal(true);
    setUserSearchQuery('');
    setSelectedUserId(null);
    fetchAvailableUsers(teamId);
    setContextMenu({ visible: false, x: 0, y: 0, teamId: null });
  };

  // Add member to team
  const addMemberToTeam = async () => {
    if (!selectedUserId || !addMemberTeamId) return;

    setSaving(true);
    try {
      const session = await supabaseSocial.auth.getSession();
      const token = session.data.session?.access_token;

      // Get the user being added
      const userToAdd = availableUsers.find(u => u.id === selectedUserId);
      const previousTeamId = userToAdd?.team_id;

      const response = await fetch(
        `${PROXY_SUPABASE_URL}/rest/v1/user_profiles?id=eq.${selectedUserId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': PROXY_SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Profile': 'identity',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ team_id: addMemberTeamId }),
        }
      );

      if (!response.ok) throw new Error('Failed to add member');

      const [updatedUser] = await response.json();

      // Update local state
      setTeams(teams.map(t => {
        // Remove user from previous team if they were in one
        if (previousTeamId && t.id === previousTeamId) {
          return { ...t, members: t.members.filter(m => m.id !== selectedUserId) };
        }
        // Add user to new team
        if (t.id === addMemberTeamId) {
          return { ...t, members: [...t.members, updatedUser] };
        }
        return t;
      }));

      setShowAddMemberModal(false);
      setAddMemberTeamId(null);
      setSelectedUserId(null);
    } catch (err) {
      console.error('Error adding member:', err);
      alert('Failed to add member: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter available users by search query
  const filteredAvailableUsers = availableUsers.filter(user =>
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Toggle route in team's allowed_routes
  const toggleRoute = (route) => {
    if (editingTeam) {
      const routes = editingTeam.allowed_routes || [];
      const newRoutes = routes.includes(route)
        ? routes.filter(r => r !== route)
        : [...routes, route];
      setEditingTeam({ ...editingTeam, allowed_routes: newRoutes });
    } else {
      const routes = newTeam.allowed_routes || [];
      const newRoutes = routes.includes(route)
        ? routes.filter(r => r !== route)
        : [...routes, route];
      setNewTeam({ ...newTeam, allowed_routes: newRoutes });
    }
  };

  // Filter teams by search
  const filteredTeams = teams.filter(team =>
    team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-600">Loading teams...</span>
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
              placeholder="Search teams..."
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
            Create Team
          </button>
        </div>

        {/* Teams List */}
        <div className="divide-y">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="p-4"
              onContextMenu={(e) => handleContextMenu(e, team.id)}
            >
              {/* Team Header */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-800">{team.name}</h3>
                    <p className="text-sm text-slate-500">{team.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {team.members?.length || 0} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Route className="w-4 h-4" />
                      {team.allowed_routes?.length || 0} routes
                    </span>
                    {expandedTeam === team.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openAddMemberModal(team.id)}
                    className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600"
                    title="Add member"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingTeam(team)}
                    className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-violet-600"
                    title="Edit team"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600"
                    title="Delete team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedTeam === team.id && (
                <div className="mt-4 pl-13 space-y-4">
                  {/* Allowed Routes - Grouped */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Allowed Routes</h4>
                    {team.allowed_routes?.length > 0 ? (
                      <div className="space-y-2">
                        {ROUTE_GROUPS.map(group => {
                          const groupRoutes = team.allowed_routes.filter(route =>
                            group.routes.some(r => r.path === route)
                          );
                          if (groupRoutes.length === 0) return null;

                          return (
                            <div key={group.id}>
                              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                {group.label}
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {groupRoutes.map(route => {
                                  const routeInfo = group.routes.find(r => r.path === route);
                                  return (
                                    <span
                                      key={route}
                                      className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium"
                                    >
                                      {routeInfo?.label || route}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">No routes assigned</span>
                    )}
                  </div>

                  {/* Members */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Members</h4>
                    {team.members?.length > 0 ? (
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium text-sm">
                                {member.avatar_url ? (
                                  <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                  member.display_name?.charAt(0) || member.email?.charAt(0) || '?'
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{member.display_name || member.email}</p>
                                <p className="text-xs text-slate-500">{member.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeMember(member.id, team.id)}
                              className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">No members in this team</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredTeams.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No teams found. Click "Create Team" to add your first team.
          </div>
        )}
      </div>

      {/* Create/Edit Team Modal */}
      {(showCreateModal || editingTeam) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTeam(null);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingTeam) {
                  updateTeam(editingTeam.id, {
                    name: editingTeam.name,
                    description: editingTeam.description,
                    allowed_routes: editingTeam.allowed_routes,
                  });
                } else {
                  createTeam(e);
                }
              }}
              className="p-4 space-y-4"
            >
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={editingTeam?.name || newTeam.name}
                  onChange={(e) => editingTeam
                    ? setEditingTeam({ ...editingTeam, name: e.target.value })
                    : setNewTeam({ ...newTeam, name: e.target.value })
                  }
                  placeholder="e.g., Marketing Team"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={editingTeam?.description || newTeam.description}
                  onChange={(e) => editingTeam
                    ? setEditingTeam({ ...editingTeam, description: e.target.value })
                    : setNewTeam({ ...newTeam, description: e.target.value })
                  }
                  placeholder="What does this team do?"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Allowed Routes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Allowed Routes
                </label>
                <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {ROUTE_GROUPS.map((group) => {
                    const currentRoutes = editingTeam?.allowed_routes || newTeam.allowed_routes || [];
                    const groupRoutes = group.routes.map(r => r.path);
                    const checkedCount = groupRoutes.filter(path => currentRoutes.includes(path)).length;
                    const allChecked = checkedCount === groupRoutes.length;
                    const someChecked = checkedCount > 0 && checkedCount < groupRoutes.length;

                    return (
                      <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Group Header */}
                        <div
                          className={`flex items-center gap-2 p-2.5 cursor-pointer transition-colors ${
                            checkedCount > 0 ? 'bg-violet-50' : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => {
                            // Toggle all routes in this group
                            const newRoutes = allChecked
                              ? currentRoutes.filter(r => !groupRoutes.includes(r))
                              : [...new Set([...currentRoutes, ...groupRoutes])];
                            if (editingTeam) {
                              setEditingTeam({ ...editingTeam, allowed_routes: newRoutes });
                            } else {
                              setNewTeam({ ...newTeam, allowed_routes: newRoutes });
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={el => {
                              if (el) el.indeterminate = someChecked;
                            }}
                            onChange={() => {}}
                            className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <Folder className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700 flex-1">{group.label}</span>
                          <span className="text-xs text-slate-400">
                            {checkedCount}/{groupRoutes.length}
                          </span>
                        </div>

                        {/* Group Routes */}
                        <div className="border-t border-slate-200 bg-white">
                          {group.routes.map((route) => {
                            const isChecked = currentRoutes.includes(route.path);
                            const isParentRoute = route.path === '/social-media' || route.path === '/revenue';

                            return (
                              <label
                                key={route.path}
                                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${
                                  isChecked ? 'bg-violet-50/50' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleRoute(route.path)}
                                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 ml-5"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${isParentRoute ? 'font-medium text-slate-700' : 'text-slate-600'}`}>
                                    {route.label}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-2">{route.path}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTeam(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingTeam ? 'Save Changes' : 'Create Team'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => openAddMemberModal(contextMenu.teamId)}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
          <button
            onClick={() => {
              const team = teams.find(t => t.id === contextMenu.teamId);
              if (team) setEditingTeam(team);
              setContextMenu({ visible: false, x: 0, y: 0, teamId: null });
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Team
          </button>
          <button
            onClick={() => {
              deleteTeam(contextMenu.teamId);
              setContextMenu({ visible: false, x: 0, y: 0, teamId: null });
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Team
          </button>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-800">
                Add Member to {teams.find(t => t.id === addMemberTeamId)?.name}
              </h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddMemberTeamId(null);
                  setSelectedUserId(null);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                  <span className="ml-2 text-slate-500 text-sm">Loading users...</span>
                </div>
              ) : filteredAvailableUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  {userSearchQuery ? 'No users found matching your search' : 'No available users'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredAvailableUsers.map((user) => {
                    const isInCurrentTeam = user.team_id === addMemberTeamId;
                    const isInOtherTeam = user.team_id && user.team_id !== addMemberTeamId;
                    const otherTeamName = isInOtherTeam
                      ? teams.find(t => t.id === user.team_id)?.name
                      : null;

                    if (isInCurrentTeam) return null; // Don't show users already in this team

                    return (
                      <button
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                          selectedUserId === user.id
                            ? 'bg-violet-100 ring-2 ring-violet-500'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            user.display_name?.charAt(0) || user.email?.charAt(0) || '?'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {user.display_name || user.email}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          {isInOtherTeam && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              Currently in: {otherTeamName || 'Another team'} (will be moved)
                            </p>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                          {user.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddMemberTeamId(null);
                  setSelectedUserId(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addMemberToTeam}
                disabled={!selectedUserId || saving}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
