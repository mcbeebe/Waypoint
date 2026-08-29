/**
 * "Not today" — what a family set aside on Home, and the day it comes back
 * (Roadmap/Home-Rebuild-Plan.md phase 2, migration 048).
 *
 * Deferrals belong to the family, not the phone: the 20-persona audit found
 * silent snoozes, where one parent dismissed a card and the other never
 * learned it existed. So this hook writes `home_deferrals`.
 *
 * Migrations are applied by hand against this project, so the table may not
 * exist yet. When it doesn't, the hook falls back to on-device storage and
 * reports `shared: false` — the button keeps working and the card says the
 * skip is local, rather than promising a co-parent something it cannot keep.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const LOCAL_KEY = 'waypoint.home.deferrals';

/** item id → the local calendar date it returns to Home. */
export type DeferralMap = Record<string, string>;

interface StoredDeferral {
  returnsOn: string;
  title?: string | null;
}

/** True when the failure is migration 048 not being applied yet. */
export function isMissingDeferralsTable(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /home_deferrals/.test(message) &&
    /does not exist|schema cache|could not find|relation/i.test(message)
  );
}

async function readLocal(): Promise<DeferralMap> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredDeferral>;
    const out: DeferralMap = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (v && typeof v.returnsOn === 'string') out[id] = v.returnsOn;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeLocal(map: DeferralMap): Promise<void> {
  try {
    const payload: Record<string, StoredDeferral> = {};
    for (const [id, returnsOn] of Object.entries(map)) payload[id] = { returnsOn };
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
  } catch {
    /* a failed cache write must not break the screen */
  }
}

export interface UseDeferrals {
  deferrals: DeferralMap;
  /** False when the set-aside list lives only on this device. */
  shared: boolean;
  loading: boolean;
  /** Set an item aside until `returnsOn` (a local calendar date). */
  defer: (itemId: string, returnsOn: string, title?: string) => Promise<void>;
  /** Bring it back now. */
  undo: (itemId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDeferrals(familyId: string | undefined): UseDeferrals {
  const [deferrals, setDeferrals] = useState<DeferralMap>({});
  const [shared, setShared] = useState(true);
  const [loading, setLoading] = useState(true);
  // Latched for the session: one missing-table answer is enough.
  const tableMissing = useRef(false);

  const fetchDeferrals = useCallback(async () => {
    if (!familyId) {
      setDeferrals({});
      setLoading(false);
      return;
    }
    setLoading(true);
    if (!tableMissing.current) {
      const { data, error } = await supabase
        .from('home_deferrals')
        .select('item_id, returns_on')
        .eq('family_id', familyId);
      if (!error) {
        const map: DeferralMap = {};
        for (const row of (data ?? []) as { item_id: string; returns_on: string }[]) {
          map[row.item_id] = row.returns_on;
        }
        setDeferrals(map);
        setShared(true);
        setLoading(false);
        return;
      }
      if (!isMissingDeferralsTable(error.message)) {
        // A transient read failure is not a reason to claim nothing was set
        // aside — keep whatever we already have and stay honest about scope.
        setLoading(false);
        return;
      }
      tableMissing.current = true;
    }
    setShared(false);
    setDeferrals(await readLocal());
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    void fetchDeferrals();
  }, [fetchDeferrals]);

  const defer = useCallback(
    async (itemId: string, returnsOn: string, title?: string) => {
      // Optimistic: the card must advance the moment it is tapped.
      const next = { ...deferrals, [itemId]: returnsOn };
      setDeferrals(next);
      if (!familyId) return;
      if (!tableMissing.current) {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from('home_deferrals').upsert(
          {
            family_id: familyId,
            item_id: itemId,
            returns_on: returnsOn,
            title: title ?? null,
            created_by: auth?.user?.id ?? null,
          },
          { onConflict: 'family_id,item_id' }
        );
        if (!error) return;
        if (!isMissingDeferralsTable(error.message)) return;
        tableMissing.current = true;
        setShared(false);
      }
      await writeLocal(next);
    },
    [deferrals, familyId]
  );

  const undo = useCallback(
    async (itemId: string) => {
      const next = { ...deferrals };
      delete next[itemId];
      setDeferrals(next);
      if (!familyId) return;
      if (!tableMissing.current) {
        const { error } = await supabase
          .from('home_deferrals')
          .delete()
          .eq('family_id', familyId)
          .eq('item_id', itemId);
        if (!error) return;
        if (!isMissingDeferralsTable(error.message)) return;
        tableMissing.current = true;
        setShared(false);
      }
      await writeLocal(next);
    },
    [deferrals, familyId]
  );

  return { deferrals, shared, loading, defer, undo, refetch: fetchDeferrals };
}
