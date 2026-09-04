/**
 * Profile hook — resolves the signed-in user's role (family vs staff) from
 * the profiles table (migration 035). The role decides the root shell, so it
 * loads before any family data is touched.
 *
 * Failure posture: a missing or unreadable profile resolves to 'family' —
 * a parent must never be locked out by profile plumbing, and a staff member
 * wrongly landed in the family shell can simply retry (staff access itself
 * is enforced by RLS, not by this hook).
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { retryQuery } from '@/lib/netRetry';
import type { ProfileRole } from '@/lib/roles';

interface UseProfileReturn {
  role: ProfileRole | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useProfile(userId: string | null | undefined): UseProfileReturn {
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState(!!userId);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Retry the blip BEFORE falling back. The fallback below is deliberate
      // and stays, but it is not free: resolving to 'family' on a transient
      // error drops a staff member into the parent shell. The header says such
      // a user "can simply retry" — nothing in App.tsx offers them a retry, so
      // until now that recovery did not exist. This is it.
      const { data, error } = await retryQuery<{ role: string } | null>(() =>
        supabase.from('profiles').select('role').eq('user_id', userId).maybeSingle()
      );
      if (error) {
        console.error('Profile fetch error:', error.message);
        setRole('family');
        return;
      }
      setRole((data?.role as ProfileRole) ?? 'family');
    } catch (err) {
      console.error('Profile fetch failed:', err);
      setRole('family');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { role, loading, refetch: fetchProfile };
}
