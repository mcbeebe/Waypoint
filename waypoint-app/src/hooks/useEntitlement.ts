/**
 * Entitlement hook (PRD W-E: E2/E3) — resolves the family's tier from
 * entitlement rows. Fails free: any error resolves to the free tier, so a
 * network blip can never lock a family out of what free includes.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { resolveEntitlement } from '@/lib/entitlements';
import type { ResolvedEntitlement } from '@/lib/entitlements';

interface UseEntitlementReturn extends ResolvedEntitlement {
  loading: boolean;
  refetch: () => Promise<void>;
}

const FREE: ResolvedEntitlement = { isPremium: false, sponsorType: null, sponsorLabel: null };

export function useEntitlement(familyId: string | undefined): UseEntitlementReturn {
  const [resolved, setResolved] = useState<ResolvedEntitlement>(FREE);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) {
      setResolved(FREE);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('entitlements')
        .select('sponsor_type, status, period_start, period_end')
        .eq('family_id', familyId);
      setResolved(error ? FREE : resolveEntitlement(data ?? []));
    } catch {
      setResolved(FREE);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...resolved, loading, refetch };
}
