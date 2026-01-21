import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseSocial } from '../lib/supabase';
import { ROUTES } from '../auth/constants';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Log the full URL for debugging
        console.log('AuthCallback - Full URL:', window.location.href);
        console.log('AuthCallback - Hash:', window.location.hash);

        // The hash contains the access token from OAuth
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const errorDescription = hashParams.get('error_description');

        console.log('AuthCallback - Parsed params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length,
          errorDescription
        });

        // Check for OAuth error in URL
        if (errorDescription) {
          console.error('OAuth error:', errorDescription);
          setStatus('Error: ' + errorDescription);
          setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
          return;
        }

        if (accessToken) {
          setStatus('Setting session...');

          // Set session without timeout - let it complete naturally
          // The SIGNED_IN event will be handled by AuthContext
          const { data, error } = await supabaseSocial.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          console.log('AuthCallback - setSession result:', {
            hasData: !!data,
            hasSession: !!data?.session,
            user: data?.user?.email,
            error
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('Error: ' + error.message);
            setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
            return;
          }

          if (data?.session) {
            setStatus('Logged in as ' + data.user.email + '! Redirecting...');

            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);

            // Wait for webhook to create profile
            await new Promise(resolve => setTimeout(resolve, 1500));

            navigate(ROUTES.HOME, { replace: true });
            return;
          } else {
            setStatus('No session returned. Checking existing session...');
          }
        }

        // Fallback: try getting existing session (tokens might have been auto-processed)
        setStatus('Checking for existing session...');

        // Give Supabase a moment to process the hash automatically
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: sessionData, error: sessionError } = await supabaseSocial.auth.getSession();

        console.log('AuthCallback - getSession result:', {
          hasSession: !!sessionData?.session,
          user: sessionData?.session?.user?.email,
          error: sessionError
        });

        if (sessionData?.session) {
          setStatus('Session found! Redirecting...');

          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);

          await new Promise(resolve => setTimeout(resolve, 1000));
          navigate(ROUTES.HOME, { replace: true });
        } else {
          setStatus('No session found. Redirecting to login...');
          setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 1500);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('Error: ' + (error.message || 'Unknown error'));
        setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">{status}</p>
        <p className="text-xs text-slate-400">Check browser console for details</p>
      </div>
    </div>
  );
}
