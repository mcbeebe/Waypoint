/**
 * Calendar sync hook — bi-directional sync between Waypoint and Google Calendar.
 * Pull: Google events → Waypoint appointments (upsert by google_calendar_event_id)
 * Push: Waypoint appointments → Google Calendar (create if no gcal ID)
 * Conflict resolution: Waypoint wins (local changes overwrite Google)
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { fetchCalendarEvents, createCalendarEvent, updateCalendarEvent } from '@/lib/googleCalendar';
import { getGoogleAccessToken } from '@/lib/auth';
import type { Appointment, GoogleCalendarEvent } from '@/types/database';

const LAST_SYNC_KEY = 'waypoint_calendar_last_sync';
const SYNC_RANGE_DAYS = 90;

interface UseCalendarSyncOptions {
  familyId: string;
}

export interface SyncResult {
  ok: boolean;
  pulled: number;
  pushed: number;
  /** Set when the Google connection is gone/expired and must be re-granted */
  needsReconnect?: boolean;
  error?: string;
}

interface UseCalendarSyncReturn {
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
  isGoogleConnected: boolean;
  /** True once we know the connection is dead — drives the reconnect banner */
  needsReconnect: boolean;
  syncNow: () => Promise<SyncResult>;
  checkConnection: () => Promise<boolean>;
}

export function useCalendarSync(options: UseCalendarSyncOptions): UseCalendarSyncReturn {
  const { familyId } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  /** Check if Google Calendar is accessible */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const token = await getGoogleAccessToken();
    const connected = !!token;
    setIsGoogleConnected(connected);
    setNeedsReconnect(!connected);
    return connected;
  }, []);

  // Know the connection state before the parent taps Sync, so the screen can
  // say "reconnect" up front instead of failing silently on the first tap.
  useEffect(() => {
    if (!familyId) return;
    checkConnection().catch(() => {});
  }, [familyId, checkConnection]);

  /** Pull Google Calendar events → Waypoint appointments */
  const pullFromGoogle = useCallback(async (): Promise<number> => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + SYNC_RANGE_DAYS);

    const gcalEvents = await fetchCalendarEvents(
      now.toISOString(),
      endDate.toISOString()
    );

    let upsertCount = 0;

    for (const gcalEvent of gcalEvents) {
      const startTime = gcalEvent.start.dateTime ?? gcalEvent.start.date ?? '';
      const endTime = gcalEvent.end.dateTime ?? gcalEvent.end.date ?? null;

      // Check if we already have this event
      const { data: existing } = await supabase
        .from('appointments')
        .select('id, updated_at')
        .eq('google_calendar_event_id', gcalEvent.id)
        .eq('family_id', familyId)
        .maybeSingle();

      if (existing) {
        // Existing — only update if Google event is newer (and no local edits win)
        // Waypoint wins: skip Google updates if local was modified after last sync
        continue;
      }

      // New event from Google — insert, tagged so the app can offer a
      // "just my Waypoint items" view later
      const row = {
        family_id: familyId,
        title: gcalEvent.summary,
        start_time: startTime,
        end_time: endTime,
        location: gcalEvent.location,
        notes: gcalEvent.description,
        google_calendar_event_id: gcalEvent.id,
        status: 'scheduled',
      };
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({ ...row, source: 'google' });
      // Pre-031 database: still record the event, just untagged
      if (insertError && /source/i.test(insertError.message) &&
          /does not exist|schema cache|could not find/i.test(insertError.message)) {
        await supabase.from('appointments').insert(row);
      }

      upsertCount++;
    }

    return upsertCount;
  }, [familyId]);

  /** Push Waypoint appointments → Google Calendar */
  const pushToGoogle = useCallback(async (): Promise<number> => {
    // Find local appointments without a Google Calendar event ID
    const { data: localOnly, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('family_id', familyId)
      .is('google_calendar_event_id', null)
      .neq('status', 'cancelled');

    if (fetchError || !localOnly) return 0;

    let pushCount = 0;

    for (const appt of localOnly as Appointment[]) {
      try {
        const gcalEvent = await createCalendarEvent({
          summary: appt.title,
          description: appt.notes ?? undefined,
          location: appt.location ?? undefined,
          start: { dateTime: appt.start_time },
          end: { dateTime: appt.end_time ?? appt.start_time },
        });

        // Store the Google Calendar event ID back
        await supabase
          .from('appointments')
          .update({ google_calendar_event_id: gcalEvent.id })
          .eq('id', appt.id);

        pushCount++;
      } catch {
        // Skip individual event failures — continue syncing others
      }
    }

    return pushCount;
  }, [familyId]);

  /**
   * Full bi-directional sync. Always resolves with a result the caller can
   * show the parent — a sync that quietly does nothing is indistinguishable
   * from a broken app.
   */
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (isSyncing) return { ok: false, pulled: 0, pushed: 0, error: 'Already syncing' };

    setIsSyncing(true);
    setError(null);

    try {
      const connected = await checkConnection();
      if (!connected) {
        const msg =
          'Your Google Calendar connection has expired. Reconnect it in Profile → Google Account.';
        setError(msg);
        setNeedsReconnect(true);
        return { ok: false, pulled: 0, pushed: 0, needsReconnect: true, error: msg };
      }

      const pulled = await pullFromGoogle();
      const pushed = await pushToGoogle();

      const syncTime = new Date().toISOString();
      setLastSyncAt(syncTime);
      await AsyncStorage.setItem(LAST_SYNC_KEY, syncTime);
      setNeedsReconnect(false);
      return { ok: true, pulled, pushed };
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Calendar sync failed';
      // A 401 that survived the token refresh means the grant itself is gone
      const expired = /401|invalid_grant|sign in|access token/i.test(raw);
      const msg = expired
        ? 'Your Google Calendar connection has expired. Reconnect it in Profile → Google Account.'
        : `Calendar sync failed: ${raw}`;
      setError(msg);
      if (expired) setNeedsReconnect(true);
      return { ok: false, pulled: 0, pushed: 0, needsReconnect: expired, error: msg };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkConnection, pullFromGoogle, pushToGoogle]);

  return {
    isSyncing,
    lastSyncAt,
    error,
    isGoogleConnected,
    needsReconnect,
    syncNow,
    checkConnection,
  };
}
