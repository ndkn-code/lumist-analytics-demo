/**
 * Demo Auth Context
 *
 * Provides a pre-authenticated demo user without requiring real authentication.
 * All routes are accessible in demo mode.
 */

import { createContext, useContext, useState, useEffect } from 'react';

// Demo user configuration
const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@lumist.ai',
  user_metadata: {
    full_name: 'Demo User',
    avatar_url: null
  }
};

const DEMO_PROFILE = {
  id: 'demo-user-id',
  email: 'demo@lumist.ai',
  display_name: 'Demo User',
  role: 'super_admin', // Full access for demo
  is_active: true,
  organization_id: 'org-demo',
  team_id: 'team-demo',
  avatar_url: null,
  created_at: '2025-01-01T00:00:00Z'
};

const DEMO_ORGANIZATION = {
  id: 'org-demo',
  name: 'Lumist Demo',
  created_at: '2025-01-01T00:00:00Z'
};

const DEMO_TEAM = {
  id: 'team-demo',
  name: 'Demo Team',
  allowed_routes: ['*'],
  organization_id: 'org-demo'
};

const AuthContext = createContext({
  user: null,
  profile: null,
  organization: null,
  team: null,
  allowedRoutes: [],
  isLoading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading delay (for demo realism)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Brief loading state for UI consistency

    return () => clearTimeout(timer);
  }, []);

  // Demo sign in (does nothing, already authenticated)
  const signInWithGoogle = async () => {
    console.log('Demo mode: Already authenticated');
  };

  // Demo sign out (does nothing in demo)
  const signOut = async () => {
    console.log('Demo mode: Sign out not available');
  };

  // Demo refresh profile (does nothing)
  const refreshProfile = async () => {
    console.log('Demo mode: Profile refresh not needed');
  };

  const value = {
    user: DEMO_USER,
    profile: DEMO_PROFILE,
    organization: DEMO_ORGANIZATION,
    team: DEMO_TEAM,
    allowedRoutes: ['*'], // Full access for demo
    isLoading,
    isAuthenticated: true, // Always authenticated in demo
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
