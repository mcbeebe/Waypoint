/**
 * Entitlement hook (PRD W-E: E2/E3) — resolves the family's tier from
 * entitlement rows. Fails free: any error resolves to the free tier, so a
 * network blip can never lock a family out of what free includes.
 *
 * "Loading" covers the family's own load too, and is derived rather than
 * toggled: the hook is loading until it holds an answer for THIS family id.
 * Resolving Free before the id arrived used to block a paying family from
 * the moment the id landed until the lookup returned — and an answer for an
 * earlier id, or an earlier lookup, can never stand in for the current one.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
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
 * @param familyLoading - True while the family itself is still loading, so a
 *   missing id means "not yet" rather than "no family". Required on purpose:
 *   leaving it out is how the startup paywall flash came back.
 */
export function useEntitlement(
  familyId: string | undefined,
  familyLoading: boolean,
): UseEntitlementReturn {
  const [answer, setAnswer] = useState<{ id: string; tier: ResolvedEntitlement } | null>(null);
  const latest = useRef(0);

  const refetch = useCallback(async () => {
    // Paywall off (FLAGS.paywall): everyone is Premium — no fetch needed.
    if (!FLAGS.paywall || !familyId) return;
    const seq = ++latest.current;
    let tier = FREE;
    try {
      const { data, error } = await supabase
        .from('entitlements')
        .select('sponsor_type, status, period_start, period_end')
        .eq('family_id', familyId);
      tier = error ? FREE : resolveEntitlement(data ?? []);
    } catch {
      tier = FREE;
    }
    // Only the newest lookup may answer.
    if (seq === latest.current) setAnswer({ id: familyId, tier });
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!FLAGS.paywall) return { ...UNGATED, loading: false, refetch };
  const current = familyId && answer?.id === familyId ? answer.tier : null;
  const loading = familyId ? current === null : familyLoading;
  return { ...(current ?? FREE), loading, refetch };
}
