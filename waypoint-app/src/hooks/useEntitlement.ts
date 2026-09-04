/**
 * Entitlement hook (PRD W-E: E2/E3) — resolves the family's tier from
 * entitlement rows. Fails free: any error resolves to the free tier, so a
 * network blip can never lock a family out of what free includes.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { retryQuery } from '@/lib/netRetry';
import { FLAGS } from '@/lib/flags';
import { resolveEntitlement } from '@/lib/entitlements';
import type { ResolvedEntitlement } from '@/lib/entitlements';

interface UseEntitlementReturn extends ResolvedEntitlement {
  loading: boolean;
  refetch: () => Promise<void>;
}

const FREE: ResolvedEntitlement = { isPremium: false, sponsorType: null, sponsorLabel: null };
const UNGATED: ResolvedEntitlement = { isPremium: true, sponsorType: null, sponsorLabel: null };

export function useEntitlement(familyId: string | undefined): UseEntitlementReturn {
  const [resolved, setResolved] = useState<ResolvedEntitlement>(FLAGS.paywall ? FREE : UNGATED);
  const [loading, setLoading] = useState(FLAGS.paywall);

  const refetch = useCallback(async () => {
    // Paywall off (FLAGS.paywall): everyone is Premium — no fetch needed.
    if (!FLAGS.paywall) {
      setResolved(UNGATED);
      setLoading(false);
      return;
    }
    if (!familyId) {
      setResolved(FREE);
      setLoading(false);
      return;
    }
    try {
      // Fail-free is the right TERMINAL posture and is unchanged — but it is
      // not costless in the other direction: resolving a paying family to FREE
      // silently downgrades them to the 30-message cap and the cheaper model.
      // Retrying the blip first means only a real, persistent failure does
      // that.
      const { data, error } = await retryQuery<
        Parameters<typeof resolveEntitlement>[0] | null
      >(() =>
        supabase
          .from('entitlements')
          .select('sponsor_type, status, period_start, period_end')
          .eq('family_id', familyId)
      );
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
