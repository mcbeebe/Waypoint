/**
 * Entitlement hook (PRD W-E: E2/E3) — resolves the family's tier from
 * entitlement rows. Fails free: any error resolves to the free tier, so a
 * network blip can never lock a family out of what free includes.
 *
 * "Loading" covers the family's own load too: until the family id arrives
 * there is nothing to look up, so the hook stays loading rather than
 * resolving Free — otherwise a paying family is blocked from the moment the
 * id lands until the entitlement query returns.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FLAGS } from '@/lib/flags';
import { resolveEntitlement } from '@/lib/entitlements';
import type { ResolvedEntitlement } from '@/lib/entitlements';

interface UseEntitlementReturn extends ResolvedEntitlement {
  loading: boolean;
  refetch: () => Promise<void>;
}

const FREE: ResolvedEntitlement = { isPremium: false, sponsorType: null, sponsorLabel: null };
const UNGATED: ResolvedEntitlement = { isPremium: true, sponsorType: null, sponsorLabel: null };

/**
 * Resolve the family's tier.
 * @param familyId - The family's id, or undefined while it is not known.
 * @param familyLoading - True while the family itself is still loading, so
 *   a missing id means "not yet" rather than "no family".
 */
export function useEntitlement(
  familyId: string | undefined,
  familyLoading = false,
): UseEntitlementReturn {
  const [resolved, setResolved] = useState<ResolvedEntitlement>(FLAGS.paywall ? FREE : UNGATED);
  const [loading, setLoading] = useState<boolean>(FLAGS.paywall);

  const refetch = useCallback(async () => {
    // Paywall off (FLAGS.paywall): everyone is Premium — no fetch needed.
    if (!FLAGS.paywall) {
      setResolved(UNGATED);
      setLoading(false);
      return;
    }
    if (!familyId) {
      // Family still loading: stay loading, resolve nothing.
      if (familyLoading) return;
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
  }, [familyId, familyLoading]);

  useEffect(() => {
    // A new family id starts a new lookup; the previous answer (Free, from
    // before the id existed) must not stand in for it.
    if (FLAGS.paywall && (familyId || familyLoading)) setLoading(true);
    refetch();
  }, [refetch, familyId, familyLoading]);

  return { ...resolved, loading, refetch };
}
