/**
 * Auth hook — manages Supabase session state
 * Listens for auth state changes and provides current user.
 * Also tracks password-recovery sessions (user arrived via a reset-password
 * email link) so the app can show the set-new-password screen.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { retryQuery } from '../lib/netRetry';

/** Infer Session type from Supabase auth client */
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

export function useAuth() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let alive = true;

    // `loading` gates the WHOLE app: App.tsx renders <LoadingScreen /> while it
    // is true and there is no other way out. So this resolution must be
    // total — every path has to reach setLoading(false).
    //
    // It previously did not. `getSession().then(...)` carried no `.catch`, so
    // any rejection (it reads AsyncStorage, and refreshes an expired token over
    // the network) left the promise unhandled, `loading` true forever, and the
    // app parked on the splash screen with force-quit as the only recovery.
    //
    // Retry first — a cold start in a lift or a tunnel is the ordinary case,
    // not an exception — then resolve to "signed out" and let the user act.
    // Signed-out is the safe terminal state: the Welcome screen can retry,
    // whereas a permanent splash screen cannot.
    retryQuery<{ session: Session }>(() => supabase.auth.getSession())
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.warn('Session restore failed:', error.message);
        setSession(data?.session ?? null);
      })
      .catch((err) => {
        // retryQuery converts a thrown fetch into a returned error, so this is
        // belt and braces — but `loading` must never depend on that holding.
        if (!alive) return;
        console.warn('Session restore threw:', err);
        setSession(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
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

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
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
