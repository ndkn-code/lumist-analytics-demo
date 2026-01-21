import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { usePermissions } from './usePermissions';
import { ROUTES } from './constants';

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, requiredRoute }) {
  const { user, profile, isLoading } = useAuth();
  const { canAccess, getFirstAllowedRoute } = usePermissions();
  const location = useLocation();

  // Show loading spinner while checking auth state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not logged in → redirect to login page
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Logged in but no profile or profile is inactive → pending approval
  if (!profile || !profile.is_active) {
    return <Navigate to={ROUTES.PENDING} replace />;
  }

  // Check if user can access this specific route
  const routeToCheck = requiredRoute || location.pathname;
  if (!canAccess(routeToCheck)) {
    // If user can't access the home route, redirect to their first allowed route
    // This handles the case where a user logs in but doesn't have access to "/"
    if (routeToCheck === ROUTES.HOME) {
      const firstAllowed = getFirstAllowedRoute();
      if (firstAllowed && firstAllowed !== ROUTES.UNAUTHORIZED) {
        return <Navigate to={firstAllowed} replace />;
      }
    }
    // For any other forbidden route, show Access Denied
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  // All checks passed → render children
  return children;
}

// Higher-order component version (optional utility)
export function withProtectedRoute(Component, requiredRoute) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute requiredRoute={requiredRoute}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
