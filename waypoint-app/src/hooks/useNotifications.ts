/**
 * Notifications hook — schedule/manage push notifications for deadlines
 * Uses expo-notifications for local push notifications
 *
 * Features:
 * - Schedule reminders at configurable days before deadline
 * - Cancel existing notifications when deadlines are completed
 * - Request permission on first use
 * - Supports multiple reminder intervals per deadline
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Deadline } from '@/types/database';
import { diffReminders, type ReminderSpec } from '@/lib/notificationPolicy';

const NOTIFICATION_IDS_KEY = 'waypoint_notification_ids';
/** key → scheduled-notification id, for the policy-driven outbound loop
 *  (phase 7). Kept separate from the legacy deadline map above so the two
 *  schedulers never fight over the same ids. */
const REMINDER_MAP_KEY = 'waypoint_reminder_map';

// ─── Configure notification behavior ────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotificationMapping {
  deadlineId: string;
  notificationIds: string[];
}

interface UseNotificationsReturn {
  /** Whether push notifications are permitted */
  hasPermission: boolean;
  /** Request notification permission from the user */
  requestPermission: () => Promise<boolean>;
  /** Re-read OS permission (call when a screen regains focus). */
  refreshPermission: () => Promise<void>;
  /** Schedule reminders for a single deadline */
  scheduleDeadlineReminders: (deadline: Deadline) => Promise<void>;
  /** Cancel all reminders for a deadline (e.g., on completion) */
  cancelDeadlineReminders: (deadlineId: string) => Promise<void>;
  /** Schedule reminders for all active deadlines */
  scheduleAllReminders: (deadlines: Deadline[]) => Promise<void>;
  /** Reconcile the device's scheduled reminders against a policy plan (phase 7
   *  outbound loop). Cancels what the plan dropped, schedules what it added,
   *  leaves matches untouched. */
  syncReminders: (specs: ReminderSpec[]) => Promise<void>;
  /** Cancel all scheduled notifications */
  cancelAllReminders: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications(): UseNotificationsReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const mappingsRef = useRef<NotificationMapping[]>([]);
  /** spec key → scheduled notification id (phase 7 outbound loop). */
  const reminderMapRef = useRef<Record<string, string>>({});

  // Check current permission status on mount, and again whenever the app comes
  // back to the foreground — a parent can revoke (or grant) notifications in OS
  // Settings while we're backgrounded, and a stale `true` would keep the calm
  // state promising delivery the OS now drops (phase-7 review finding).
  useEffect(() => {
    checkPermission();
    loadMappings();
    loadReminderMap();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPermission();
    });
    return () => sub.remove();
  }, []);

  async function checkPermission(): Promise<void> {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  }

  /** Re-read OS permission on demand (e.g. Home regaining focus after the
   *  parent changed it on the Settings screen or in OS Settings). */
  const refreshPermission = useCallback(async (): Promise<void> => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  }, []);

  async function loadMappings(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
      if (raw) {
        mappingsRef.current = JSON.parse(raw);
      }
    } catch {
      // Non-critical — notifications will just be re-scheduled
    }
  }

  async function saveMappings(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(mappingsRef.current));
    } catch {
      console.warn('[Notifications] Failed to persist notification mappings');
    }
  }

  async function loadReminderMap(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(REMINDER_MAP_KEY);
      if (raw) reminderMapRef.current = JSON.parse(raw);
    } catch {
      // Non-critical — reminders will re-sync on the next pass.
    }
  }

  async function saveReminderMap(): Promise<void> {
    try {
      await AsyncStorage.setItem(REMINDER_MAP_KEY, JSON.stringify(reminderMapRef.current));
    } catch {
      console.warn('[Notifications] Failed to persist reminder map');
    }
  }

  /** Request notification permission */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // On iOS, need to request permission
    if (Platform.OS === 'ios') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') {
        setHasPermission(true);
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    }

    // Android: notifications are enabled by default for SDK < 33
    // For SDK 33+, expo-notifications handles the permission request
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasPermission(granted);
    return granted;
  }, []);

  /** Schedule reminders for a single deadline */
  const scheduleDeadlineReminders = useCallback(async (deadline: Deadline): Promise<void> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    // Cancel any existing notifications for this deadline first
    await cancelDeadlineReminders(deadline.id);

    const dueDate = new Date(deadline.due_date);
    const now = new Date();
    const scheduledIds: string[] = [];

    // Default reminder days if none specified: 30, 14, 7, 1 day(s) before
    const reminderDays = deadline.reminder_days?.length > 0
      ? deadline.reminder_days
      : [30, 14, 7, 1];

    for (const daysBefore of reminderDays) {
      const triggerDate = new Date(dueDate);
      triggerDate.setDate(triggerDate.getDate() - daysBefore);
      // Set to 9 AM local time
      triggerDate.setHours(9, 0, 0, 0);

      // Skip if trigger date is in the past
      if (triggerDate <= now) continue;

      try {
        const daysLabel = daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Deadline: ${deadline.title}`,
            body: `Due ${daysLabel}. Tap to view your action plan.`,
            data: {
              type: 'deadline_reminder',
              deadlineId: deadline.id,
              screen: 'Calendar',
            },
            sound: true,
            badge: 1,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

        scheduledIds.push(id);
      } catch (err) {
        console.warn(`[Notifications] Failed to schedule reminder for ${daysBefore}d before:`, err);
      }
    }

    // Also schedule a same-day reminder at 8 AM
    const sameDayTrigger = new Date(dueDate);
    sameDayTrigger.setHours(8, 0, 0, 0);
    if (sameDayTrigger > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `Due Today: ${deadline.title}`,
            body: 'This deadline is due today. Take action now.',
            data: {
              type: 'deadline_due',
              deadlineId: deadline.id,
              screen: 'Calendar',
            },
            sound: true,
            badge: 1,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: sameDayTrigger,
          },
        });
        scheduledIds.push(id);
      } catch (err) {
        console.warn('[Notifications] Failed to schedule same-day reminder:', err);
      }
    }

    // Save mapping
    if (scheduledIds.length > 0) {
      mappingsRef.current = [
        ...mappingsRef.current.filter((m) => m.deadlineId !== deadline.id),
        { deadlineId: deadline.id, notificationIds: scheduledIds },
      ];
      await saveMappings();
    }
  }, [hasPermission, requestPermission]);

  /** Cancel all reminders for a specific deadline */
  const cancelDeadlineReminders = useCallback(async (deadlineId: string): Promise<void> => {
    const mapping = mappingsRef.current.find((m) => m.deadlineId === deadlineId);
    if (!mapping) return;

    for (const notifId of mapping.notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch {
        // Already cancelled or expired — safe to ignore
      }
    }

    mappingsRef.current = mappingsRef.current.filter((m) => m.deadlineId !== deadlineId);
    await saveMappings();
  }, []);

  /** Schedule reminders for all active deadlines */
  const scheduleAllReminders = useCallback(async (deadlines: Deadline[]): Promise<void> => {
    const active = deadlines.filter((d) => d.status !== 'completed' && d.status !== 'overdue');
    for (const deadline of active) {
      await scheduleDeadlineReminders(deadline);
    }
  }, [scheduleDeadlineReminders]);

  /**
   * Reconcile the device against a policy plan (phase 7 outbound loop). The
   * plan (from `reminderPlan`) is the desired state; this makes the device
   * match it by key, touching only the difference.
   *
   * SERIALIZED: the HomeScreen effect fires this on every data change, and on a
   * cold start three fetches settle at different times — without a lock, two
   * overlapping runs read the same (empty) map and both schedule the same spec,
   * leaving a duplicate notification whose id the map never recorded (so it can
   * never be cancelled). Each call waits for the previous to finish, then reads
   * a fresh map. (Phase-7 review HIGH finding.)
   */
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const syncReminders = useCallback((specs: ReminderSpec[]): Promise<void> => {
    const run = chainRef.current.then(() => doSyncReminders(specs));
    // Swallow errors on the chain so one failed run can't wedge the queue.
    chainRef.current = run.catch(() => {});
    return run;
  }, []);

  const doSyncReminders = useCallback(async (specs: ReminderSpec[]): Promise<void> => {
    const map = reminderMapRef.current;
    const { toCancel, toSchedule } = diffReminders(Object.keys(map), specs);

    for (const key of toCancel) {
      const id = map[key];
      if (id) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // Already fired or cancelled — safe to forget.
        }
      }
      delete map[key];
    }

    for (const spec of toSchedule) {
      const when = new Date(spec.fireAt);
      // Guard: never hand expo a past date (a plan is only as fresh as its
      // `now`; a slow render could leave a just-past instant in the set).
      if (when.getTime() <= Date.now()) continue;
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: spec.title,
            body: spec.body,
            data: { ...spec.data, screen: 'Home' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
        map[spec.key] = id;
      } catch (err) {
        console.warn('[Notifications] Failed to schedule reminder:', spec.key, err);
      }
    }

    await saveReminderMap();
  }, []);

  /** Cancel all scheduled notifications */
  const cancelAllReminders = useCallback(async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    mappingsRef.current = [];
    reminderMapRef.current = {};
    await saveMappings();
    await saveReminderMap();
  }, []);

  return {
    hasPermission,
    requestPermission,
    refreshPermission,
    scheduleDeadlineReminders,
    cancelDeadlineReminders,
    scheduleAllReminders,
    syncReminders,
    cancelAllReminders,
  };
}
