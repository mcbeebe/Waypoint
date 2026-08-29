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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import {
  addPin as addPinPure,
  defaultPins,
  encodePins,
  hasChosen,
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

/** Reports failure instead of swallowing it: a pin saved nowhere is not a pin. */
async function writeLocal(pins: string[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(LOCAL_PINS_KEY, JSON.stringify(pins));
    return true;
  } catch {
    return false;
  }
}

const FAILED_MESSAGE: Record<string, string> = {
  en: "Couldn't save that — nothing was changed.",
  es: 'No se pudo guardar — no se cambió nada.',
  vi: 'Không lưu được — chưa có gì thay đổi.',
};

export interface UseToolPins {
  pins: string[];
  /** False when the pins live only on this device (048 not applied). */
  shared: boolean;
  loading: boolean;
  /** The one tool Waypoint offers to pin, or null. */
  suggestion: string | null;
  /** Returns a message when the pin was refused (the cap), else null. */
  pin: (key: string) => Promise<string | null>;
  unpin: (key: string) => Promise<string | null>;
  /** Called when a tool is opened, feeding the suggestion heuristic. */
  noteOpened: (key: string) => void;
  /** How many times this device has opened the suggested tool. */
  opensOf: (key: string) => number;
  /** Re-read the shared list — two screens render these tiles. */
  refetch: () => Promise<void>;
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
  // unpin needs to record a decline, and declineSuggestion is defined below it.
  const declineRef = useRef<(key: string) => Promise<void>>(async () => {});
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
      // No family row resolved — nothing is shared, and saying otherwise
      // would promise a scope over state loaded from nowhere.
      setShared(false);
      apply(normalizePins(await readJson<unknown>(LOCAL_PINS_KEY, null), validKeys));
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
        everSaved.current = hasChosen(raw);
        if (everSaved.current) {
          apply(normalizePins(raw, validKeys));
        } else {
          // Never chosen. Anything pinned on this device before the column
          // existed is the family's real choice — move it up rather than
          // silently replacing it with defaults on the next launch.
          const local = normalizePins(await readJson<unknown>(LOCAL_PINS_KEY, null), validKeys);
          const seed = local.length ? local : defaultPins(validKeys);
          apply(seed);
          if (local.length) {
            const { error: upErr } = await supabase
              .from('families')
              .update({ tool_pins: encodePins(seed) })
              .eq('id', familyId);
            if (!upErr) {
              everSaved.current = true;
              await AsyncStorage.removeItem(LOCAL_PINS_KEY).catch(() => {});
            }
          }
        }
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

  // Home and Tools both render these tiles; without this, pinning on one
  // left the other showing the old set for the rest of the session.
  useFocusEffect(
    useCallback(() => {
      void fetchPins();
    }, [fetchPins])
  );

  /**
   * The column holds one shared value, so a blind write is last-write-wins:
   * a second device with a stale list would evict the other parent's tiles —
   * the eviction the cap exists to prevent, through the back door. Every
   * write re-reads the row and applies the change to what is actually there.
   */
  const mutate = useCallback(
    async (
      change: (current: string[]) => { pins: string[]; ok: boolean; message?: string }
    ): Promise<{ pins: string[]; message: string | null }> => {
      const before = pinsRef.current;
      if (familyId && !columnMissing.current) {
        const { data, error: readErr } = await supabase
          .from('families')
          .select('tool_pins')
          .eq('id', familyId)
          .maybeSingle();
        if (!readErr) {
          const raw = (data as { tool_pins?: unknown } | null)?.tool_pins;
          const current = hasChosen(raw) ? normalizePins(raw, validKeys) : before;
          const result = change(current);
          if (!result.ok) return { pins: current, message: result.message ?? null };
          const { error } = await supabase
            .from('families')
            .update({ tool_pins: encodePins(result.pins) })
            .eq('id', familyId);
          if (!error) {
            everSaved.current = true;
            return { pins: result.pins, message: null };
          }
          if (!isMissingToolPinsColumn(error.message)) {
            // Neither store took it. Nothing was saved anywhere, and the
            // caller says so rather than showing a tile that will vanish.
            const local = await writeLocal(result.pins);
            return local
              ? { pins: result.pins, message: null }
              : { pins: before, message: FAILED_MESSAGE[locale] };
          }
          columnMissing.current = true;
        } else if (!isMissingToolPinsColumn(readErr.message)) {
          const result = change(before);
          if (!result.ok) return { pins: before, message: result.message ?? null };
          const local = await writeLocal(result.pins);
          return local
            ? { pins: result.pins, message: null }
            : { pins: before, message: FAILED_MESSAGE[locale] };
        } else {
          columnMissing.current = true;
        }
      }
      const result = change(before);
      if (!result.ok) return { pins: before, message: result.message ?? null };
      const local = await writeLocal(result.pins);
      setShared(false);
      return local
        ? { pins: result.pins, message: null }
        : { pins: before, message: FAILED_MESSAGE[locale] };
    },
    [familyId, validKeys, locale]
  );

  const pin = useCallback(
    async (key: string): Promise<string | null> => {
      const { pins: next, message } = await mutate((current) =>
        addPinPure(current, key, locale)
      );
      apply(next);
      return message;
    },
    [apply, mutate, locale]
  );

  const unpin = useCallback(
    async (key: string): Promise<string | null> => {
      const { pins: next, message } = await mutate((current) => ({
        pins: removePinPure(current, key),
        ok: true,
      }));
      apply(next);
      // Removing a tile is a decision, so Waypoint must not turn around and
      // suggest the same tool back — opens keep accruing on a pinned tile.
      await declineRef.current(key);
      return message;
    },
    [apply, mutate]
  );

  /**
   * Home and the Tools screen each hold an instance of this hook, and both
   * write this key. Merging against what is stored — rather than against this
   * instance's snapshot — stops one screen erasing the other's counts, which
   * made the three-open threshold effectively unreachable.
   */
  const noteOpened = useCallback((key: string) => {
    void (async () => {
      const stored = await readJson<Record<string, number>>(OPENS_KEY, {});
      const merged = { ...stored, ...opensRef.current };
      for (const [k, v] of Object.entries(stored)) {
        merged[k] = Math.max(v, opensRef.current[k] ?? 0);
      }
      merged[key] = (merged[key] ?? 0) + 1;
      opensRef.current = merged;
      setOpens(merged);
      await AsyncStorage.setItem(OPENS_KEY, JSON.stringify(merged)).catch(() => {});
    })();
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

  declineRef.current = declineSuggestion;

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
    refetch: fetchPins,
  };
}
