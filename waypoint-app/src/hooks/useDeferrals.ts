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
import { activeUntil, classifyWrite, isMissingSchema, reconcile } from '@/lib/syncState';

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
 * True when the failure is migration 048 not being applied yet. The rule
 * itself lives in `lib/syncState.ts`, where it is tested — including the case
 * that matters most, an RLS denial that must NOT be read as a missing table.
 */
export function isMissingDeferralsTable(message: string | undefined): boolean {
  return isMissingSchema(message, 'home_deferrals');
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

/** Reports failure rather than swallowing it: a skip saved nowhere is not a skip. */
async function writeLocal(rows: Record<string, StoredDeferral>): Promise<boolean> {
  try {
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    return true;
  } catch {
    return false;
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
    const today = localDay(new Date());
    if (!tableMissing.current) {
      const { data, error } = await supabase
        .from('home_deferrals')
        .select('item_id, returns_on, title')
        // Expired rows are history, not state; leaving them unbounded meant
        // downloading every deferral the family ever made, forever.
        .gte('returns_on', today)
        .eq('family_id', familyId);
      if (!error || !isMissingDeferralsTable(error.message)) {
        const remote = error
          ? null
          : Object.fromEntries(
              ((data ?? []) as { item_id: string; returns_on: string; title: string | null }[]).map(
                (r) => [r.item_id, { returnsOn: r.returns_on, title: r.title }]
              )
            );
        // What survives a read, and which store it came from, is decided in
        // lib/syncState.ts — including the rule that a failed read is not
        // proof of an empty list.
        const state = reconcile<StoredDeferral>({
          remote,
          local: activeUntil(await readLocal(), today),
          schemaMissing: false,
        });
        const hoisted = Object.entries(state.hoist);
        if (hoisted.length) {
          // Set aside on this device before the migration landed; without
          // this they all reappear at once the first time the read works.
          const { error: upErr } = await supabase.from('home_deferrals').upsert(
            hoisted.map(([item_id, v]) => ({
              family_id: familyId,
              item_id,
              returns_on: v.returnsOn,
              title: v.title ?? null,
            })),
            { onConflict: 'family_id,item_id' }
          );
          if (!upErr && state.clearLocal) {
            await AsyncStorage.removeItem(LOCAL_KEY).catch(() => {});
          }
        }
        apply(state.rows);
        setShared(state.backend === 'family');
        setLoading(false);
        return;
      }
      tableMissing.current = true;
    }
    setShared(false);
    apply(activeUntil(await readLocal(), today));
    setLoading(false);
  }, [familyId, apply]);

  useEffect(() => {
    void fetchDeferrals();
  }, [fetchDeferrals]);

  const defer = useCallback(
    async (itemId: string, returnsOn: string, title?: string) => {
      const before = rowsRef.current;
      // Optimistic: the card must advance the moment it is tapped. Reverted
      // below if nothing could be written.
      const next = { ...before, [itemId]: { returnsOn, title: title ?? null } };
      apply(next);
      if (!familyId) {
        const ok = await writeLocal(next);
        if (!ok) apply(before);
        setShared(false);
        return ok;
      }
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
        const localSaved = error ? await writeLocal(rowsRef.current) : false;
        const { result, schemaMissing } = classifyWrite({
          remoteAttempted: true,
          remoteError: error?.message ?? null,
          localSaved,
          object: 'home_deferrals',
        });
        if (schemaMissing) tableMissing.current = true;
        if (result.kind === 'family') return true;
        if (result.kind === 'device') {
          setShared(false);
          return true;
        }
        // Saved nowhere: the optimistic update has to go back, or the card
        // shows a skip that will not survive the session.
        apply(before);
        return false;
      }
      const savedLocally = await writeLocal(next);
      if (!savedLocally) {
        apply(before);
        return false;
      }
      setShared(false);
      return true;
    },
    [familyId, apply]
  );

  const undo = useCallback(
    async (itemId: string) => {
      const before = rowsRef.current;
      const next = { ...before };
      delete next[itemId];
      apply(next);
      if (!familyId) {
        const ok = await writeLocal(next);
        if (!ok) apply(before);
        setShared(false);
        return ok;
      }
      if (!tableMissing.current) {
        const { error } = await supabase
          .from('home_deferrals')
          .delete()
          .eq('family_id', familyId)
          .eq('item_id', itemId);
        const localSaved = error ? await writeLocal(rowsRef.current) : false;
        const { result, schemaMissing } = classifyWrite({
          remoteAttempted: true,
          remoteError: error?.message ?? null,
          localSaved,
          object: 'home_deferrals',
        });
        if (schemaMissing) tableMissing.current = true;
        if (result.kind === 'family') return true;
        if (result.kind === 'device') {
          setShared(false);
          return true;
        }
        apply(before);
        return false;
      }
      const savedLocally = await writeLocal(next);
      if (!savedLocally) {
        apply(before);
        return false;
      }
      setShared(false);
      return true;
    },
    [familyId, apply]
  );

  const deferrals: DeferralMap = {};
  const titles: DeferralTitles = {};
  for (const [id, v] of Object.entries(rows)) {
    deferrals[id] = v.returnsOn;
    if (v.title) titles[id] = v.title;
  }

  return { deferrals, titles, shared, loading, defer, undo, refetch: fetchDeferrals };
}
