/**
 * The calendar day a Date falls on **where the family is standing**.
 *
 * WHY THIS EXISTS. Ten places in this app reached for
 * `date.toISOString().split('T')[0]` to get a `YYYY-MM-DD` for a Postgres
 * `date` column. That is the day in **UTC**, not the day the parent is living
 * in, and the two disagree for part of every single day:
 *
 *   - **West of Greenwich** (California — where Waypoint's families are) the
 *     UTC day rolls over at 4pm or 5pm local. So from late afternoon onward,
 *     "today" resolves to TOMORROW. Verified: a Date of Jan 1 2026 5:00pm in
 *     `America/Los_Angeles` stringifies to `2026-01-02`.
 *   - **East of Greenwich** a local midnight is still YESTERDAY in UTC, so a
 *     date picked from a calendar is stored a day EARLY. Verified: Jan 1 2020
 *     picked in `Asia/Ho_Chi_Minh` stringifies to `2019-12-31`.
 *
 * Neither is visible under `TZ=UTC`, which is why this file has a
 * `.tz.test.ts` beside it that runs in BOTH hemispheres — the repo learned
 * that lesson once already (see `vitest.config.ts`, the `tz-west` project).
 *
 * A date-of-birth stored a day early is not cosmetic here: it drives the age
 * band, the Early Start exit at 3, and transition planning at 16.
 */

/**
 * Format a `Date` as `YYYY-MM-DD` using its **local** calendar fields.
 *
 * Use this for any value headed for a Postgres `date` column or compared
 * against one. Never use `toISOString().split('T')[0]` for that — it answers a
 * different question (the UTC day) that no parent asked.
 *
 * @param date - the moment to read the calendar day from
 * @returns the local calendar day, zero-padded, e.g. `"2026-01-01"`
 */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Today's date, as the family's own calendar shows it.
 *
 * @param now - injectable clock, so a test can pin the moment
 * @returns the local calendar day, e.g. `"2026-01-01"`
 */
export function todayLocalISO(now: Date = new Date()): string {
  return toLocalISODate(now);
}
