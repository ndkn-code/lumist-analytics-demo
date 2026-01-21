import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../auth';
import AdminLayout from '../components/admin/AdminLayout';
import UsersTab from '../components/admin/UsersTab';
import AccessRequestsTab from '../components/admin/AccessRequestsTab';
import InvitesTab from '../components/admin/InvitesTab';
import TeamsTab from '../components/admin/TeamsTab';
import AuditLogsTab from '../components/admin/AuditLogsTab';
import NotificationsTab from '../components/admin/NotificationsTab';

export default function AdminPage() {
  const { profile, organization } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState('users');

  // Only super admins can access
  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const tabs = [
    { id: 'users', label: 'Users', icon: 'Users' },
    { id: 'requests', label: 'Access Requests', icon: 'UserPlus' },
    { id: 'invites', label: 'Invites', icon: 'Mail' },
    { id: 'teams', label: 'Teams', icon: 'Building' },
    { id: 'audit', label: 'Audit Logs', icon: 'FileText' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab organizationId={organization?.id} />;
      case 'requests':
        return <AccessRequestsTab organizationId={organization?.id} />;
      case 'invites':
        return <InvitesTab organizationId={organization?.id} />;
      case 'teams':
        return <TeamsTab organizationId={organization?.id} />;
      case 'audit':
        return <AuditLogsTab organizationId={organization?.id} />;
      case 'notifications':
        return <NotificationsTab />;
      default:
        return <UsersTab organizationId={organization?.id} />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
        <p className="text-slate-600">Manage users, teams, and permissions for {organization?.name}</p>
      </div>

      <AdminLayout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
}
