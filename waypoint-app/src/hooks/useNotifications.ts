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
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Deadline } from '@/types/database';

const NOTIFICATION_IDS_KEY = 'waypoint_notification_ids';

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
  /** Schedule reminders for a single deadline */
  scheduleDeadlineReminders: (deadline: Deadline) => Promise<void>;
  /** Cancel all reminders for a deadline (e.g., on completion) */
  cancelDeadlineReminders: (deadlineId: string) => Promise<void>;
  /** Schedule reminders for all active deadlines */
  scheduleAllReminders: (deadlines: Deadline[]) => Promise<void>;
  /** Cancel all scheduled notifications */
  cancelAllReminders: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useNotifications(): UseNotificationsReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const mappingsRef = useRef<NotificationMapping[]>([]);

  // Check current permission status on mount
  useEffect(() => {
    checkPermission();
    loadMappings();
  }, []);

  async function checkPermission(): Promise<void> {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  }

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

  /** Cancel all scheduled notifications */
  const cancelAllReminders = useCallback(async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    mappingsRef.current = [];
    await saveMappings();
  }, []);

  return {
    hasPermission,
    requestPermission,
    scheduleDeadlineReminders,
    cancelDeadlineReminders,
    scheduleAllReminders,
    cancelAllReminders,
  };
}
