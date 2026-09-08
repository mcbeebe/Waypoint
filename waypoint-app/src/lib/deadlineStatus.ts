/**
 * Which tracked deadlines have actually passed — on the family's calendar.
 *
 * `deadlines.due_date` is a Postgres `date` (migration 001): a calendar day
 * with no instant and no zone. The question "has it passed?" therefore has to
 * be asked against the day the FAMILY is living in, not the day UTC is on.
 * `new Date().toISOString().split('T')[0]` is already tomorrow every evening
 * after 17:00 Pacific, so a deadline due today reads as passed — and the
 * caller here does not merely label it, it PERSISTS `status: 'overdue'`. A
 * label self-corrects at midnight; a written row does not.
 *
 * Two things downstream read that stored status, which is why the day has to
 * be right rather than close:
 *
 * - `useNotifications.scheduleAllReminders` treats `overdue` as a reason to
 *   stop scheduling reminders. A deadline stamped overdue a day early loses
 *   the push that would have reminded the family it was coming.
 * - Per CLAUDE.md's escalation-tone rule, "overdue" is the framing a family
 *   carries into the phone call. It must not fire before the day is out.
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest project
 * and is pinned in BOTH timezone suites by `deadlineStatus.tz.test.ts`.
 */

import { localDayISO } from '@/lib/dateOnly';

/** The shape this needs; `Deadline` satisfies it. */
interface DeadlineLike {
  due_date: string;
  status: string;
}

/**
 * The deadlines whose day has passed and that are not already recorded as
 * such — i.e. exactly the rows worth writing `status: 'overdue'` to.
 *
 * `today` is a `YYYY-MM-DD` local day key and defaults to the device's own;
 * pass it explicitly to test a specific clock. Comparison is lexicographic on
 * `YYYY-MM-DD`, which is the same ordering as the calendar, and the day part
 * is taken as written so a value that arrives as a full timestamp still
 * compares on its date.
 *
 * A deadline due TODAY is not overdue — the family still has the day.
 */
export function newlyOverdue<T extends DeadlineLike>(
  deadlines: readonly T[],
  today: string = localDayISO()
): T[] {
  return deadlines.filter(
    (d) =>
      d.status !== 'completed' &&
      d.status !== 'overdue' &&
      d.due_date.slice(0, 10) < today
  );
}
