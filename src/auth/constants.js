// Route and permission constants

export const ROUTES = {
  HOME: '/',
  FEATURES: '/features',
  TRAFFIC: '/traffic',
  SAT_TRACKER: '/sat-tracker',
  SOCIAL_MEDIA: '/social-media',
  ADMIN: '/admin',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',
  PENDING: '/pending-approval',
  AUTH_CALLBACK: '/auth/callback',
};

export const ROLE_HIERARCHY = {
  viewer: 1,
  internal: 2,
  admin: 3,
  super_admin: 4,
};

export const DEFAULT_ROLE_ROUTES = {
  super_admin: ['*'],
  admin: ['/', '/features', '/revenue', '/traffic', '/sat-tracker', '/social-media'],
  internal: [],
  viewer: ['/', '/features'],
};

export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.AUTH_CALLBACK,
];

export const ADMIN_ROUTES = [
  ROUTES.ADMIN,
];
