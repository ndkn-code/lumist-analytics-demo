import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../auth';
import { ROUTES } from '../auth/constants';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-4">
        {/* Icon */}
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-8 h-8 text-rose-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Access Denied
        </h1>

        {/* Description */}
        <p className="text-slate-600 mb-6">
          You don't have permission to access this page.
          {profile?.role === 'viewer' && (
            <span className="block mt-2 text-sm">
              As a viewer, you have access to User Engagement and Feature Adoption only.
            </span>
          )}
          {profile?.role === 'internal' && (
            <span className="block mt-2 text-sm">
              Your access is limited to your team's assigned areas.
            </span>
          )}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
