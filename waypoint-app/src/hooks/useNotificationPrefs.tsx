/**
 * Notification preferences (phase 7 outbound loop), shared app-wide via context
 * so the Settings screen and Home read and write the SAME state. (They mount as
 * separate stack screens; without a shared store, a change in Settings would
 * never reach Home's loop or its calm-state promise — Home stays mounted and
 * its state never re-reads. That split was the phase-7 review's HIGH finding.)
 *
 * The pure shape and defaults live in notificationPolicy (`NotifPrefs` /
 * `DEFAULT_PREFS`); this persists them on-device and exposes the one-shot
 * "already offered the ask" flag.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_PREFS, type NotifPrefs } from '@/lib/notificationPolicy';

const PREFS_KEY = 'waypoint_notif_prefs';
const PRIMED_KEY = 'waypoint_notif_primed';

interface NotificationPrefsValue {
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

const NotificationPrefsContext = createContext<NotificationPrefsValue | null>(null);

export function NotificationPrefsProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <NotificationPrefsContext.Provider value={{ prefs, loaded, primed, update, markPrimed }}>
      {children}
    </NotificationPrefsContext.Provider>
  );
}

export function useNotificationPrefs(): NotificationPrefsValue {
  const ctx = useContext(NotificationPrefsContext);
  if (!ctx) {
    throw new Error('useNotificationPrefs must be used within a NotificationPrefsProvider');
  }
  return ctx;
}
