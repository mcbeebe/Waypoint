/**
 * "Not today" — what a family set aside on Home, and the day it comes back
 * (Roadmap/Home-Rebuild-Plan.md phase 2, migration 048).
 *
 * Deferrals belong to the family, not the phone: the 20-persona audit found
 * silent snoozes, where one parent dismissed a card and the other never
 * learned it existed. So this hook writes `home_deferrals`.
 *
 * Two honesty rules it exists to keep:
 *
 * - **A skip that did not persist is not a skip.** Any failed write — offline,
 *   RLS, a missing table — reverts the optimistic state and reports it, so the
 *   card never shows "Comes back Sep 5" over a row that was never written.
 * - **It says which storage it got.** Migrations here are applied by hand, so
 *   before 048 lands this falls back to on-device storage and reports
 *   `shared: false`; the card then says "on this device only" rather than
 *   promising a co-parent something it cannot keep. When 048 does land, the
 *   device rows are migrated up on the next successful read and cleared.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { localDay } from '@/lib/homeTriage';

const LOCAL_KEY = 'waypoint.home.deferrals';

/** item id → the local calendar date it returns to Home. */
export type DeferralMap = Record<string, string>;
/** item id → the title it had when it was set aside. */
export type DeferralTitles = Record<string, string>;

interface StoredDeferral {
  returnsOn: string;
  title?: string | null;
}

/**
 * True when the failure is migration 048 not being applied yet. Deliberately
 * the same shape as `isMissingRequestIdColumn` (useCommunications) and
 * `noteIfRecurrenceMissing` (useAppointments) — one vocabulary for one class
 * of failure, so a permission error can never be read as a missing table.
 */
export function isMissingDeferralsTable(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /home_deferrals/.test(message) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

async function readLocal(): Promise<Record<string, StoredDeferral>> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredDeferral>;
    const out: Record<string, StoredDeferral> = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (v && typeof v.returnsOn === 'string') out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeLocal(rows: Record<string, StoredDeferral>): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
  } catch {
    /* a failed cache write is reported by the caller, not thrown */
  }
}

export interface UseDeferrals {
  deferrals: DeferralMap;
  /** Titles as captured at set-aside time, so Later survives the item. */
  titles: DeferralTitles;
  /** False when the set-aside list lives only on this device. */
  shared: boolean;
  loading: boolean;
  /**
   * Set an item aside until `returnsOn`. Resolves false when nothing could be
   * written anywhere — the caller must then tell the family, not pretend.
   */
  defer: (itemId: string, returnsOn: string, title?: string) => Promise<boolean>;
  /** Bring it back now. False when the removal could not be persisted. */
  undo: (itemId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useDeferrals(familyId: string | undefined): UseDeferrals {
  const [rows, setRows] = useState<Record<string, StoredDeferral>>({});
  const [shared, setShared] = useState(true);
  const [loading, setLoading] = useState(true);
  // Mirrors `rows` so a write builds on the current map rather than the one
  // captured when the callback was created — two overlapping defers used to
  // let the older map win.
  const rowsRef = useRef<Record<string, StoredDeferral>>({});
  // Latched for the session: one missing-table answer is enough.
  const tableMissing = useRef(false);

  const apply = useCallback((next: Record<string, StoredDeferral>) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const fetchDeferrals = useCallback(async () => {
    if (!familyId) {
      apply({});
      setLoading(false);
      return;
    }
    setLoading(true);
    if (!tableMissing.current) {
      const today = localDay(new Date());
      const { data, error } = await supabase
        .from('home_deferrals')
        .select('item_id, returns_on, title')
        // Expired rows are history, not state; leaving them unbounded meant
        // downloading every deferral the family ever made, forever.
        .gte('returns_on', today)
        .eq('family_id', familyId);
      if (!error) {
        const map: Record<string, StoredDeferral> = {};
        for (const row of (data ?? []) as {
          item_id: string;
          returns_on: string;
          title: string | null;
        }[]) {
          map[row.item_id] = { returnsOn: row.returns_on, title: row.title };
        }
        // The table exists now. Anything set aside on this device before the
        // migration landed would otherwise reappear all at once, so move it
        // up and clear the device copy.
        const local = await readLocal();
        const orphans = Object.entries(local).filter(([id]) => !(id in map));
        if (orphans.length) {
          const { error: upErr } = await supabase.from('home_deferrals').upsert(
            orphans.map(([item_id, v]) => ({
              family_id: familyId,
              item_id,
              returns_on: v.returnsOn,
              title: v.title ?? null,
            })),
            { onConflict: 'family_id,item_id' }
          );
          if (!upErr) {
            for (const [id, v] of orphans) if (v.returnsOn >= today) map[id] = v;
            await AsyncStorage.removeItem(LOCAL_KEY).catch(() => {});
          }
        }
        apply(map);
        setShared(true);
        setLoading(false);
        return;
      }
      if (!isMissingDeferralsTable(error.message)) {
        // A read that failed is not proof that nothing was set aside. Fall
        // back to whatever this device knows and say the scope is local, so
        // the card cannot claim a family-wide list it could not load.
        apply(await readLocal());
        setShared(false);
        setLoading(false);
        return;
      }
      tableMissing.current = true;
    }
    setShared(false);
    apply(await readLocal());
    setLoading(false);
  }, [familyId, apply]);

  useEffect(() => {
    void fetchDeferrals();
  }, [fetchDeferrals]);

  const persistLocal = useCallback(
    async (next: Record<string, StoredDeferral>) => {
      await writeLocal(next);
      setShared(false);
      return true;
    },
    []
  );

  const defer = useCallback(
    async (itemId: string, returnsOn: string, title?: string) => {
      const before = rowsRef.current;
      // Optimistic: the card must advance the moment it is tapped. Reverted
      // below if nothing could be written.
      const next = { ...before, [itemId]: { returnsOn, title: title ?? null } };
      apply(next);
      if (!familyId) return persistLocal(next);
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
        if (!error) return true;
        if (isMissingDeferralsTable(error.message)) tableMissing.current = true;
      }
      // Any other failure — offline, RLS, a bad row — still gets written
      // here so the skip survives the session, and `shared` drops so the
      // card stops claiming the family can see it.
      try {
        return await persistLocal(rowsRef.current);
      } catch {
        apply(before);
        return false;
      }
    },
    [familyId, apply, persistLocal]
  );

  const undo = useCallback(
    async (itemId: string) => {
      const before = rowsRef.current;
      const next = { ...before };
      delete next[itemId];
      apply(next);
      if (!familyId) return persistLocal(next);
      if (!tableMissing.current) {
        const { error } = await supabase
          .from('home_deferrals')
          .delete()
          .eq('family_id', familyId)
          .eq('item_id', itemId);
        if (!error) return true;
        if (isMissingDeferralsTable(error.message)) tableMissing.current = true;
      }
      try {
        return await persistLocal(rowsRef.current);
      } catch {
        apply(before);
        return false;
      }
    },
    [familyId, apply, persistLocal]
  );

  const deferrals: DeferralMap = {};
  const titles: DeferralTitles = {};
  for (const [id, v] of Object.entries(rows)) {
    deferrals[id] = v.returnsOn;
    if (v.title) titles[id] = v.title;
  }

  return { deferrals, titles, shared, loading, defer, undo, refetch: fetchDeferrals };
}
