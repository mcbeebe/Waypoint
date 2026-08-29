/**
 * Pinned tools (Home rebuild phase 4) — one shared set per family, stored in
 * `families.tool_pins` (migration 048), plus the per-device open counts that
 * drive the one suggestion Waypoint makes.
 *
 * Split on purpose: a pin is a decision the family made together, so it
 * belongs in the database; how often THIS phone opened a tool is a heuristic
 * about one device and belongs on it.
 *
 * Migrations here are applied by hand, so a project without 048 must not lose
 * the feature: pins fall back to on-device storage and `shared` reports false,
 * exactly as deferrals do.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import {
  addPin as addPinPure,
  defaultPins,
  normalizePins,
  removePin as removePinPure,
  suggestPin,
} from '@/lib/toolPins';
import type { FunnelLocale } from '@/lib/eligibility';

const LOCAL_PINS_KEY = 'waypoint.tools.pins';
const OPENS_KEY = 'waypoint.tools.opens';
const DECLINED_KEY = 'waypoint.tools.declinedPins';

/** True when the failure is migration 048 not being applied yet. */
export function isMissingToolPinsColumn(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /tool_pins/.test(message) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface UseToolPins {
  pins: string[];
  /** False when the pins live only on this device (048 not applied). */
  shared: boolean;
  loading: boolean;
  /** The one tool Waypoint offers to pin, or null. */
  suggestion: string | null;
  /** Returns a message when the pin was refused (the cap), else null. */
  pin: (key: string) => Promise<string | null>;
  unpin: (key: string) => Promise<void>;
  /** Called when a tool is opened, feeding the suggestion heuristic. */
  noteOpened: (key: string) => void;
  /** How many times this device has opened the suggested tool. */
  opensOf: (key: string) => number;
  /** Decline the suggestion; it is never offered for that tool again. */
  declineSuggestion: (key: string) => Promise<void>;
}

export function useToolPins(
  familyId: string | undefined,
  validKeys: string[],
  locale: FunnelLocale = 'en'
): UseToolPins {
  const [pins, setPins] = useState<string[]>([]);
  const [shared, setShared] = useState(true);
  const [loading, setLoading] = useState(true);
  const [opens, setOpens] = useState<Record<string, number>>({});
  const [declined, setDeclined] = useState<string[]>([]);
  const declinedRef = useRef<string[]>([]);
  const pinsRef = useRef<string[]>([]);
  const opensRef = useRef<Record<string, number>>({});
  const columnMissing = useRef(false);
  // Whether this family has ever chosen: an empty stored list is a real
  // choice ("I removed them all"), and must not be re-seeded with defaults.
  const everSaved = useRef(false);

  const apply = useCallback((next: string[]) => {
    pinsRef.current = next;
    setPins(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const [storedOpens, storedDeclined] = await Promise.all([
        readJson<Record<string, number>>(OPENS_KEY, {}),
        readJson<string[]>(DECLINED_KEY, []),
      ]);
      opensRef.current = storedOpens;
      setOpens(storedOpens);
      declinedRef.current = storedDeclined;
      setDeclined(storedDeclined);
    })();
  }, []);

  const fetchPins = useCallback(async () => {
    if (!familyId) {
      apply([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (!columnMissing.current) {
      const { data, error } = await supabase
        .from('families')
        .select('tool_pins')
        .eq('id', familyId)
        .maybeSingle();
      if (!error) {
        const raw = (data as { tool_pins?: unknown } | null)?.tool_pins;
        const parsed = normalizePins(raw, validKeys);
        everSaved.current = Array.isArray(raw);
        apply(everSaved.current ? parsed : defaultPins(validKeys));
        setShared(true);
        setLoading(false);
        return;
      }
      if (!isMissingToolPinsColumn(error.message)) {
        // A failed read is not "you have no pins" — keep the device copy and
        // say the scope is local rather than showing an empty toolbox.
        const local = await readJson<string[]>(LOCAL_PINS_KEY, defaultPins(validKeys));
        apply(normalizePins(local, validKeys));
        setShared(false);
        setLoading(false);
        return;
      }
      columnMissing.current = true;
    }
    const local = await readJson<string[]>(LOCAL_PINS_KEY, defaultPins(validKeys));
    apply(normalizePins(local, validKeys));
    setShared(false);
    setLoading(false);
    // validKeys is a fresh array each render; its content is static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, apply]);

  useEffect(() => {
    void fetchPins();
  }, [fetchPins]);

  const persist = useCallback(
    async (next: string[]): Promise<boolean> => {
      if (familyId && !columnMissing.current) {
        const { error } = await supabase
          .from('families')
          .update({ tool_pins: next })
          .eq('id', familyId);
        if (!error) {
          everSaved.current = true;
          return true;
        }
        if (isMissingToolPinsColumn(error.message)) columnMissing.current = true;
      }
      await AsyncStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(next)).catch(() => {});
      setShared(false);
      return true;
    },
    [familyId]
  );

  const pin = useCallback(
    async (key: string): Promise<string | null> => {
      const result = addPinPure(pinsRef.current, key, locale);
      if (!result.ok) return result.message ?? null;
      const before = pinsRef.current;
      apply(result.pins);
      const ok = await persist(result.pins);
      if (!ok) apply(before);
      return null;
    },
    [apply, persist, locale]
  );

  const unpin = useCallback(
    async (key: string) => {
      const before = pinsRef.current;
      const next = removePinPure(before, key);
      apply(next);
      const ok = await persist(next);
      if (!ok) apply(before);
    },
    [apply, persist]
  );

  const noteOpened = useCallback((key: string) => {
    const next = { ...opensRef.current, [key]: (opensRef.current[key] ?? 0) + 1 };
    opensRef.current = next;
    setOpens(next);
    AsyncStorage.setItem(OPENS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // The write stays out of the state updater: React may call an updater
  // twice, and a decline must be recorded exactly once.
  const declineSuggestion = useCallback(async (key: string) => {
    if (declinedRef.current.includes(key)) return;
    const next = [...declinedRef.current, key];
    declinedRef.current = next;
    setDeclined(next);
    await AsyncStorage.setItem(DECLINED_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const suggestion = suggestPin({ opens, pins, declined, validKeys });

  return {
    pins,
    shared,
    loading,
    suggestion,
    pin,
    unpin,
    noteOpened,
    opensOf: (key: string) => opens[key] ?? 0,
    declineSuggestion,
  };
}
