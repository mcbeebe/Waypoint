/**
 * useNotificationPrefs — the family's notification settings (phase 7 outbound
 * loop), persisted on-device. The pure shape and defaults live in
 * notificationPolicy (`NotifPrefs` / `DEFAULT_PREFS`); this only loads, saves,
 * and exposes them, plus the one-shot "we already offered" flag that keeps the
 * contextual permission ask from re-appearing after it's been dismissed.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFS, type NotifPrefs } from '@/lib/notificationPolicy';

const PREFS_KEY = 'waypoint_notif_prefs';
const PRIMED_KEY = 'waypoint_notif_primed';

interface UseNotificationPrefsReturn {
  prefs: NotifPrefs;
  /** False until the stored prefs have been read, so callers don't act on the
   *  default (disabled) state and clobber a real "on". */
  loaded: boolean;
  /** Whether the contextual permission ask has already been shown/dismissed. */
  primed: boolean;
  /** Merge a partial update and persist. */
  update: (patch: Partial<NotifPrefs>) => Promise<void>;
  /** Record that the contextual ask has been offered (won't show again). */
  markPrimed: () => Promise<void>;
}

export function useNotificationPrefs(): UseNotificationPrefsReturn {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [primed, setPrimed] = useState(false);
  // Guards a save from racing the initial load and writing the default over a
  // stored value.
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawPrefs, rawPrimed] = await Promise.all([
          AsyncStorage.getItem(PREFS_KEY),
          AsyncStorage.getItem(PRIMED_KEY),
        ]);
        if (rawPrefs) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(rawPrefs) });
        if (rawPrimed) setPrimed(true);
      } catch {
        // Fall back to defaults — a fresh, disabled state is safe.
      } finally {
        loadedRef.current = true;
        setLoaded(true);
      }
    })();
  }, []);

  const update = useCallback(async (patch: Partial<NotifPrefs>) => {
    if (!loadedRef.current) return; // never write before the first read
    let next: NotifPrefs = DEFAULT_PREFS;
    setPrefs((prev) => {
      next = { ...prev, ...patch };
      return next;
    });
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      console.warn('[NotifPrefs] Failed to persist preferences');
    }
  }, []);

  const markPrimed = useCallback(async () => {
    setPrimed(true);
    try {
      await AsyncStorage.setItem(PRIMED_KEY, '1');
    } catch {
      // Non-critical — worst case the ask shows once more.
    }
  }, []);

  return { prefs, loaded, primed, update, markPrimed };
}
