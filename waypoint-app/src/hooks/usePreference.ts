/**
 * A single remembered UI choice — collapsed sections, chosen filters.
 *
 * Small enough for AsyncStorage and not worth a round trip to Supabase:
 * these are per-device conveniences, not family data. Reads are async, so
 * the hook reports `ready` and callers render the default until it lands
 * rather than flashing from one state to the other.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'waypoint_pref_';

export function useBooleanPreference(
  key: string,
  defaultValue = false
): [boolean, (next: boolean) => void, boolean] {
  const [value, setValue] = useState(defaultValue);
  const [ready, setReady] = useState(false);
  const storageKey = useRef(`${PREFIX}${key}`);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey.current)
      .then((raw) => {
        if (cancelled) return;
        if (raw === 'true' || raw === 'false') setValue(raw === 'true');
      })
      .catch(() => {
        // A device that can't read preferences still gets a working screen
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: boolean) => {
    setValue(next);
    AsyncStorage.setItem(storageKey.current, String(next)).catch(() => {});
  }, []);

  return [value, update, ready];
}
