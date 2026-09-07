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

/**
 * Parse a Postgres `date` (`YYYY-MM-DD`) as **local** midnight.
 *
 * THE OTHER HALF OF THE BUG. `toLocalISODate` handles Date -> string. This is
 * string -> Date, and it is the direction the first sweep of this class MISSED
 * entirely. A bare `new Date('2026-01-15')` is parsed as UTC midnight by spec,
 * which is 4pm on the 14th in California — so anything that then reads local
 * calendar fields off it is a day early across the whole of the Americas, not
 * just the west coast. Verified: `new Date('2026-01-15')` renders "Jan 14" in
 * both America/Los_Angeles and America/New_York.
 *
 * Passing a value with a time component through is deliberate: a `timestamptz`
 * is an instant and already means one unambiguous moment.
 *
 * @param dateStr - `YYYY-MM-DD`, or a full ISO timestamp
 * @returns a Date at local midnight of that calendar day
 */
export function parseLocalDate(dateStr: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr);
}

/**
 * Add calendar days to a `YYYY-MM-DD`, staying on the local calendar.
 *
 * Lives here rather than in `iepDeadlines.ts` because it is pure date math and
 * that module talks to Supabase — which drags `react-native` in and makes the
 * arithmetic untestable in the node-environment timezone projects. It computes
 * STATUTORY dates (Ed Code §56321's 15 days, §56344's 60), and the UTC slice it
 * used to end with moved every one of them a day earlier east of Greenwich.
 *
 * @param dateStr - the start day, `YYYY-MM-DD`
 * @param days - calendar days to add
 * @returns the resulting local calendar day
 */
export function addDaysISO(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

/**
 * Add whole years to a `YYYY-MM-DD`, staying on the local calendar.
 *
 * @param dateStr - the start day, `YYYY-MM-DD`
 * @param years - years to add
 * @returns the resulting local calendar day
 */
export function addYearsISO(dateStr: string, years: number): string {
  const d = parseLocalDate(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return toLocalISODate(d);
}
