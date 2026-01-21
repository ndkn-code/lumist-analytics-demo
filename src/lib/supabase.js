/**
 * Supabase Client Configuration - DEMO MODE
 *
 * This demo version uses mock data instead of real Supabase connections.
 * All data is generated client-side for portfolio demonstration purposes.
 */

// Import mock clients
import {
  supabase,
  supabaseSocial,
  supabaseSocialAnalytics,
  PROXY_SUPABASE_URL,
  PROXY_SUPABASE_KEY,
  clearMockCache
} from '../mockData/mockSupabase';

// Re-export all mock clients
export {
  supabase,
  supabaseSocial,
  supabaseSocialAnalytics,
  PROXY_SUPABASE_URL,
  PROXY_SUPABASE_KEY,
  clearMockCache
};

// Default export
export default supabase;
