import { useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { ROLE_HIERARCHY, ROUTES } from './constants';

export function usePermissions() {
  const { profile, allowedRoutes } = useAuth();

  // Check if user can access a specific route
  const canAccess = useCallback((route) => {
    // No profile or inactive = no access
    if (!profile || !profile.is_active) return false;

    // Super admin wildcard = access everything
    if (allowedRoutes.includes('*')) return true;

    // Exact match
    if (allowedRoutes.includes(route)) return true;

    // Prefix match (e.g., '/social-media' allows '/social-media/facebook')
    return allowedRoutes.some(allowedRoute =>
      route.startsWith(allowedRoute + '/') || route === allowedRoute
    );
  }, [profile, allowedRoutes]);

  // Get the first allowed route for redirecting users who can't access default route
  const getFirstAllowedRoute = useCallback(() => {
    if (!profile || !profile.is_active) return ROUTES.LOGIN;

    // Super admin can access everything, default to home
    if (allowedRoutes.includes('*')) return ROUTES.HOME;

    // Return first allowed route, or unauthorized if none
    if (allowedRoutes.length > 0) {
      return allowedRoutes[0];
    }

    return ROUTES.UNAUTHORIZED;
  }, [profile, allowedRoutes]);

  // Role checks
  const isSuperAdmin = useMemo(() =>
    profile?.role === 'super_admin', [profile]);

  const isAdmin = useMemo(() =>
    ['super_admin', 'admin'].includes(profile?.role), [profile]);

  const isInternal = useMemo(() =>
    ['super_admin', 'admin', 'internal'].includes(profile?.role), [profile]);

  const isViewer = useMemo(() =>
    profile?.role === 'viewer', [profile]);

  const canAccessAdmin = useMemo(() =>
    isSuperAdmin, [isSuperAdmin]);

  // Check if user has at least a minimum role level
  const hasMinRole = useCallback((minRole) => {
    if (!profile) return false;
    return ROLE_HIERARCHY[profile.role] >= ROLE_HIERARCHY[minRole];
  }, [profile]);

  return {
    canAccess,
    getFirstAllowedRoute,
    allowedRoutes,
    isSuperAdmin,
    isAdmin,
    isInternal,
    isViewer,
    canAccessAdmin,
    hasMinRole,
    role: profile?.role || null,
  };
}
