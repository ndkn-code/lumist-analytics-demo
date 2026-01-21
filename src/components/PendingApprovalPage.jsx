import { Clock, LogOut, Mail, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROUTES } from '../auth';

export default function PendingApprovalPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      // Still navigate to login even if there's an error
      navigate(ROUTES.LOGIN, { replace: true });
    }
  };

  // Check if request was denied
  const isDenied = profile?.request_status === 'denied';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-4">
        {isDenied ? (
          // DENIED STATE
          <>
            {/* Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Access Request Denied
            </h1>

            {/* Description */}
            <p className="text-slate-600 mb-2">
              Your request for access has been reviewed and denied by an administrator.
            </p>

            {user?.email && (
              <p className="text-sm text-slate-500 mb-6">
                Signed in as: <span className="font-medium">{user.email}</span>
              </p>
            )}

            {/* Info Card */}
            <div className="bg-white rounded-xl border border-red-200 p-4 mb-6">
              <div className="flex items-start gap-3 text-left">
                <Mail className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Need help?
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    If you believe this is an error, please contact your team administrator to discuss access to the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // PENDING STATE
          <>
            {/* Icon */}
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Pending Approval
            </h1>

            {/* Description */}
            <p className="text-slate-600 mb-2">
              Your access request has been submitted and is awaiting review by an administrator.
            </p>

            {user?.email && (
              <p className="text-sm text-slate-500 mb-6">
                Signed in as: <span className="font-medium">{user.email}</span>
              </p>
            )}

            {/* Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <div className="flex items-start gap-3 text-left">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    What happens next?
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    An administrator will review your request and grant access if appropriate. You&apos;ll be able to access the dashboard once approved.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 mx-auto text-slate-600 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out and try another account
        </button>
      </div>
    </div>
  );
}
