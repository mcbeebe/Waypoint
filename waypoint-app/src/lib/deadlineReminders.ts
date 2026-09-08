/**
 * deadlineReminders — the pure arithmetic behind stored-Deadline reminders.
 *
 * `useNotifications.scheduleDeadlineReminders` owns the 30/14/7/1-day lead
 * times for rows in the `deadlines` table, driven from Plan and Calendar.
 * `notificationPolicy` deliberately leaves those rows alone (see the NOTE
 * beside its request clocks) so one date is never notified by two subsystems —
 * which is why this lives beside that module rather than inside it.
 *
 * This moved out of the hook because inside it nothing could test it: the hook
 * needs expo-notifications and a React render, so the trigger INSTANTS — the
 * part a family actually experiences — had no coverage in any suite. That gap
 * is not hypothetical. `due_date` is a Postgres `date`, and while it was
 * parsed as UTC midnight every reminder fired a day early for families in
 * California, including the "Due Today" push, which arrived the morning
 * BEFORE the deadline. CI could not see it, because east of Greenwich the
 * naive parse and the correct one agree.
 *
 * Pure: no expo, no react-native, and no ambient clock — `now` is passed in.
 * Runs in the `logic` suite and is pinned in BOTH timezone suites by
 * `deadlineReminders.tz.test.ts`.
 */
import { parseDateLocal } from '@/lib/dateOnly';

/** Lead times used when a row carries no `reminder_days` of its own. */
export const DEFAULT_REMINDER_DAYS = [30, 14, 7, 1];

/** Local civil hour the lead-time reminders fire at. */
export const AHEAD_FIRE_HOUR = 9;

/**
 * Local civil hour the due-day push fires at — deliberately an hour earlier
 * than the lead-time reminders, so on a morning that carries both the family
 * reads "this is due today" first.
 */
export const DUE_DAY_FIRE_HOUR = 8;

/** One push to schedule: when it fires, and the words the family reads. */
export interface DeadlineTrigger {
  /** The local instant to fire at. */
  fireAt: Date;
  /** `ahead` is a lead-time nudge; `due` is the morning-of push. */
  kind: 'ahead' | 'due';
  /** Days of lead time; 0 for the due-day push. */
  daysBefore: number;
  title: string;
  body: string;
}

export interface DeadlineTriggerInput {
  /** The deadline's own title, interpolated into both strings. */
  title: string;
  /** A Postgres `date` (`2026-10-01`) — a calendar day, with no zone. */
  dueDate: string;
  /** The row's lead times; empty or absent falls back to the defaults. */
  reminderDays?: number[] | null;
  /** The moment scheduling happens. Only strictly-future triggers survive. */
  now: Date;
}

/**
 * The pushes a phone should hold for one deadline, in the order they are
 * scheduled: each lead-time reminder in the order the row lists them, then the
 * due-day push.
 *
 * A trigger already past is omitted rather than scheduled — a phone cannot
 * fire into the past, and expo rejects it. An unparsable `dueDate` yields no
 * triggers at all, which is what the caller ended up with before this was
 * extracted (expo rejected the Invalid Date and the hook logged a warning),
 * minus the pointless round trip.
 */
export function deadlineTriggers(input: DeadlineTriggerInput): DeadlineTrigger[] {
  const { title, dueDate, reminderDays, now } = input;

  const due = parseDateLocal(dueDate);
  if (Number.isNaN(due.getTime())) return [];

  const leadTimes = reminderDays?.length ? reminderDays : DEFAULT_REMINDER_DAYS;
  const triggers: DeadlineTrigger[] = [];

  for (const daysBefore of leadTimes) {
    const fireAt = new Date(due);
    fireAt.setDate(fireAt.getDate() - daysBefore);
    fireAt.setHours(AHEAD_FIRE_HOUR, 0, 0, 0);
    if (fireAt <= now) continue;

    triggers.push({
      fireAt,
      kind: 'ahead',
      daysBefore,
      title: `Deadline: ${title}`,
      body: `Due ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`}. Tap to view your action plan.`,
    });
  }

  const dueDayFireAt = new Date(due);
  dueDayFireAt.setHours(DUE_DAY_FIRE_HOUR, 0, 0, 0);
  if (dueDayFireAt > now) {
    triggers.push({
      fireAt: dueDayFireAt,
      kind: 'due',
      daysBefore: 0,
      title: `Due Today: ${title}`,
      body: 'This deadline is due today. Take action now.',
    });
  }

  return triggers;
}
