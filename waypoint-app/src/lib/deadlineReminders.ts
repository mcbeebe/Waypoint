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
 * Pinned in BOTH timezone suites by `deadlineReminders.tz.test.ts`, which is
 * where its coverage lives; the `logic` project excludes `*.tz.test.ts`.
 */
import { parseDateLocal } from '@/lib/dateOnly';

/**
 * Lead times used when a row carries no `reminder_days` of its own. The
 * database column has the same default (`001_schema_v1.sql`), so a row can
 * arrive here already carrying these.
 */
export const DEFAULT_REMINDER_DAYS: readonly number[] = [30, 14, 7, 1];

/**
 * Local civil hours the two kinds of push fire at.
 *
 * These belong to the stored-Deadline scheduler only. `notificationPolicy`
 * has its own `FIRE_HOUR` for the request clocks and plan actions, and the two
 * are independent on purpose — the subsystems notify different rows. Changing
 * one does NOT change the other; the names are similar and the values happen
 * to coincide today, which is exactly how a future edit gets this wrong.
 *
 * The hours differ from each other only because they always have. The one
 * input that puts both on a single morning is a `reminder_days` entry of `0`,
 * which is storable (`integer[]`, no CHECK) and renders as "Due in 0 days" —
 * pre-existing, preserved deliberately here, and worth fixing on its own.
 */
export const AHEAD_FIRE_HOUR = 9;
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
  reminderDays?: readonly number[] | null;
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
