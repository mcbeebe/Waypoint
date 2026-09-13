/**
 * Which tracked deadlines have actually passed — on the family's calendar.
 *
 * `deadlines.due_date` is a Postgres `date` (migration 001): a calendar day
 * with no instant and no zone. The question "has it passed?" therefore has to
 * be asked against the day the FAMILY is living in, not the day UTC is on.
 * `new Date().toISOString().split('T')[0]` is already tomorrow every evening
 * after 17:00 Pacific, so a deadline due today reads as passed — and the sole
 * caller does not merely label it, it PERSISTS `status: 'overdue'`. A label
 * self-corrects at midnight; a written row does not.
 *
 * **Nothing calls that caller today.** `useDeadlines.refreshStatuses` is
 * exported and unreferenced, and it is the only writer of `status: 'overdue'`
 * in the app, so no `deadlines` row currently holds that value and none of the
 * harm below has ever reached a family. This module exists so that the harm
 * cannot arrive with the wiring — state it in the conditional, not the
 * present, until a screen actually calls it:
 *
 * - `useNotifications.scheduleAllReminders` would treat `overdue` as a reason
 *   to stop scheduling reminders, so a deadline stamped a day early would
 *   also lose the push that warned the family it was coming.
 * - Per CLAUDE.md's escalation-tone rule, "overdue" is the framing a family
 *   carries into the phone call. It must not fire before the day is out.
 *
 * Note the skip on rows already marked `overdue` (carried over from the
 * original loop): this only ever promotes, so it cannot repair a row an
 * earlier build mis-stamped. Harmless while nothing writes them; worth
 * revisiting if `refreshStatuses` is ever wired up.
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
 * `YYYY-MM-DD`, which is the same ordering as the calendar.
 *
 * A deadline due TODAY is not overdue — the family still has the day. That is
 * a product judgment carried over from the original loop, not a fact about
 * dates: a 5pm consent deadline is functionally past at 6pm.
 */
export function newlyOverdue<T extends DeadlineLike>(
  deadlines: readonly T[],
  today: string = localDayISO()
): T[] {
  return deadlines.filter(
    (d) =>
      d.status !== 'completed' && d.status !== 'overdue' && d.due_date < today
  );
}
