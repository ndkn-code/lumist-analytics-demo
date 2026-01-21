/**
 * Auth Module Exports - Demo Version
 *
 * Simplified exports for demo mode without activity tracking or route protection.
 */

export { AuthProvider, useAuth } from './AuthContext';

// Demo version of usePermissions - always returns full access
export const usePermissions = () => ({
  canAccess: () => true,
  isSuperAdmin: true,
  isAdmin: true,
  isViewer: false,
  hasRoute: () => true,
});

// Demo version of useActivityTracker - no-op
export const useActivityTracker = () => ({
  trackAction: () => {},
});

// Demo constants
export const DEFAULT_ROLE_ROUTES = {
  super_admin: ['*'],
  admin: ['*'],
  viewer: ['*'],
  internal: ['*'],
};

export const ROUTE_LABELS = {
  '/': 'User Engagement',
  '/features': 'Feature Adoption',
  '/revenue': 'Revenue',
  '/acquisition': 'Acquisition',
  '/social-media': 'Social Media',
  '/sat-tracker': 'SAT Seat Finder',
  '/admin': 'Admin Panel',
};
