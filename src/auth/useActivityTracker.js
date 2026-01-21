import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabaseSocial } from '../lib/supabase';

// Generate a unique session ID
const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export function useActivityTracker() {
  const { user, profile } = useAuth();
  const location = useLocation();

  // Persist session ID across page navigations
  const sessionId = useRef(
    sessionStorage.getItem('activity_session_id') || generateSessionId()
  );
  const pageLoadTime = useRef(Date.now());

  // Store session ID in sessionStorage
  useEffect(() => {
    sessionStorage.setItem('activity_session_id', sessionId.current);
  }, []);

  // Track page views automatically
  useEffect(() => {
    if (!user || !profile?.is_active) return;

    const logPageView = async () => {
      try {
        await supabaseSocial.rpc('log_activity', {
          p_session_id: sessionId.current,
          p_route: location.pathname,
          p_action: 'page_view',
          p_metadata: { search: location.search },
        });
      } catch (error) {
        console.error('Error logging page view:', error);
      }
    };

    logPageView();
    pageLoadTime.current = Date.now();

    // Log page leave with duration when navigating away
    return () => {
      const duration = Date.now() - pageLoadTime.current;
      if (duration > 1000) { // Only log if > 1 second
        // Fire and forget - wrap in async IIFE since rpc() returns PostgrestFilterBuilder
        (async () => {
          try {
            await supabaseSocial.rpc('log_activity', {
              p_session_id: sessionId.current,
              p_route: location.pathname,
              p_action: 'page_leave',
              p_duration_ms: duration,
            });
          } catch (e) {
            console.error('Error logging page leave:', e);
          }
        })();
      }
    };
  }, [location.pathname, user, profile]);

  // Manual action tracking function
  const trackAction = useCallback(async (action, metadata = {}) => {
    if (!user || !profile?.is_active) return;

    try {
      await supabaseSocial.rpc('log_activity', {
        p_session_id: sessionId.current,
        p_route: location.pathname,
        p_action: action,
        p_metadata: metadata,
      });
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }, [user, profile, location.pathname]);

  return { trackAction, sessionId: sessionId.current };
}
