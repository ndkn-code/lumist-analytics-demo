import { Users, Mail, Building, FileText, Bell, UserPlus } from 'lucide-react';

const iconMap = {
  Users: Users,
  Mail: Mail,
  Building: Building,
  FileText: FileText,
  Bell: Bell,
  UserPlus: UserPlus,
};

export default function AdminLayout({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-slate-200">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const Icon = iconMap[tab.icon];
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
