/**
 * Admin Panel Demo Placeholder
 *
 * Displays a read-only preview of the admin panel features
 * without actual management capabilities.
 */

import { useState } from 'react';
import {
  Users,
  Mail,
  Shield,
  Activity,
  Bell,
  AlertCircle,
  UserPlus,
  Settings,
  Lock
} from 'lucide-react';

const AdminDemo = () => {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'invites', label: 'Invites', icon: Mail },
    { id: 'teams', label: 'Teams', icon: Shield },
    { id: 'audit', label: 'Audit Logs', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  // Sample data for demo (English names)
  const sampleUsers = [
    { name: 'Sarah Chen', email: 'sarah.chen@example.com', role: 'super_admin', status: 'active' },
    { name: 'Michael Tran', email: 'michael.tran@example.com', role: 'admin', status: 'active' },
    { name: 'Emily Nguyen', email: 'emily.nguyen@example.com', role: 'viewer', status: 'active' },
    { name: 'David Lee', email: 'david.lee@example.com', role: 'viewer', status: 'pending' },
    { name: 'Jessica Wang', email: 'jessica.wang@example.com', role: 'viewer', status: 'inactive' },
  ];

  const sampleTeams = [
    { name: 'Analytics Team', members: 3, routes: ['/', '/features', '/revenue'] },
    { name: 'Marketing Team', members: 2, routes: ['/social-media', '/acquisition'] },
    { name: 'Leadership', members: 1, routes: ['*'] },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
        <p className="text-slate-500 mt-1">User and organization management</p>
      </div>

      {/* Demo Notice */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-100 rounded-xl">
            <Lock className="w-6 h-6 text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-violet-800">Demo Mode - Read Only</h3>
            <p className="text-violet-700 mt-1">
              The admin panel is view-only in demo mode. In production, super admins can:
            </p>
            <ul className="text-violet-600 mt-2 text-sm list-disc list-inside space-y-1">
              <li>Manage user roles and permissions</li>
              <li>Create and send user invitations</li>
              <li>Configure team access to dashboard routes</li>
              <li>View login and activity audit logs</li>
              <li>Configure transaction email notifications</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)] p-6">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">User Management</h2>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                Add User (Disabled)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100">
                    <th className="pb-3 text-sm font-medium text-slate-500">Name</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Email</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Role</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Status</th>
                    <th className="pb-3 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sampleUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="py-4 text-slate-800 font-medium">{user.name}</td>
                      <td className="py-4 text-slate-600">{user.email}</td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'super_admin'
                              ? 'bg-violet-100 text-violet-700'
                              : user.role === 'admin'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : user.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          disabled
                          className="text-slate-300 cursor-not-allowed text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Invitation Management</h2>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                Send Invite (Disabled)
              </button>
            </div>

            <div className="text-center py-12 text-slate-500">
              <Mail className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">No pending invitations</p>
              <p className="text-sm mt-1">
                In production, you can invite new users via email
              </p>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Team Management</h2>
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Shield className="w-4 h-4" />
                Create Team (Disabled)
              </button>
            </div>

            <div className="grid gap-4">
              {sampleTeams.map((team, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800">{team.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {team.members} member{team.members !== 1 ? 's' : ''} • {' '}
                        {team.routes[0] === '*' ? 'Full access' : `${team.routes.length} routes`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {team.routes.slice(0, 3).map((route, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs"
                        >
                          {route === '*' ? 'All' : route}
                        </span>
                      ))}
                      {team.routes.length > 3 && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                          +{team.routes.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Audit Logs</h2>

            <div className="space-y-3">
              {[
                { action: 'login_success', user: 'sarah.chen@example.com', time: '2 minutes ago' },
                { action: 'page_view', user: 'michael.tran@example.com', time: '5 minutes ago', detail: '/revenue' },
                { action: 'login_success', user: 'emily.nguyen@example.com', time: '15 minutes ago' },
                { action: 'page_view', user: 'sarah.chen@example.com', time: '20 minutes ago', detail: '/features' },
                { action: 'logout', user: 'david.lee@example.com', time: '1 hour ago' },
              ].map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.action === 'login_success'
                          ? 'bg-emerald-500'
                          : log.action === 'logout'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    ></div>
                    <div>
                      <span className="text-sm text-slate-800">{log.user}</span>
                      <span className="text-sm text-slate-500 ml-2">
                        {log.action.replace('_', ' ')}
                        {log.detail && <span className="text-violet-600"> {log.detail}</span>}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 mt-4">
              * Sample audit data. Production version includes full activity history with export.
            </p>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Notification Settings</h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                <div>
                  <h3 className="font-medium text-slate-800">Transaction Emails</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Send email notifications for successful transactions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-emerald-600">Enabled</span>
                  <div className="w-10 h-6 bg-emerald-500 rounded-full relative opacity-50 cursor-not-allowed">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <h3 className="font-medium text-slate-800 mb-3">Email Recipients</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">admin@lumist.ai</span>
                    <span className="text-xs text-slate-400">Primary</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">finance@lumist.ai</span>
                    <span className="text-xs text-slate-400">Secondary</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <h3 className="font-medium text-slate-800 mb-3">Minimum Transaction Amount</h3>
                <p className="text-sm text-slate-500">
                  Only send notifications for transactions above: <span className="font-medium text-slate-800">$10.00</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDemo;
