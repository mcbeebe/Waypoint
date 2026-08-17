/**
 * Auth hook — manages Supabase session state
 * Listens for auth state changes and provides current user.
 * Also tracks password-recovery sessions (user arrived via a reset-password
 * email link) so the app can show the set-new-password screen.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/** Infer Session type from Supabase auth client */
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

export function useAuth() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
        }
        setSession(session);
        // After a Google OAuth redirect the session carries provider
        // tokens — persist them for Calendar/Gmail (fire-and-forget).
        if (session?.provider_token || session?.provider_refresh_token) {
          import('../lib/googleAuth').then(({ captureGoogleTokens }) =>
            captureGoogleTokens(session)
          );
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const clearPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  return {
    session,
    loading,
    user: session?.user ?? null,
    passwordRecovery,
    clearPasswordRecovery,
  };
}
