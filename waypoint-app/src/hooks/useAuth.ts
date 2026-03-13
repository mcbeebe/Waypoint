/**
 * Auth hook — manages Supabase session state
 * Listens for auth state changes and provides current user
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/** Infer Session type from Supabase auth client */
type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'];

export function useAuth() {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}
