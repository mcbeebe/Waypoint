/**
 * Reading Postgres date-only values on a calendar, not on an instant.
 *
 * A Postgres `date` (`2026-08-01` — `period_start`, `due_date`,
 * `date_of_birth`) names a calendar day with no instant and no zone. The
 * trap on the write/compare side is `new Date().toISOString().slice(0, 10)`:
 * that is "today" in UTC, which is TOMORROW every evening in California.
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest world,
 * and is pinned in BOTH timezone suites by `dateOnly.tz.test.ts`.
 *
 * NOTE: PR #199 introduces this same module with `localDayISO` (identical
 * behavior and signature) plus a `parseDateLocal` reader. Whichever lands
 * first, the other's merge is a no-op on this function. Do not add a second
 * date-only PARSER here — take #199's `parseDateLocal`.
 */

/**
 * `YYYY-MM-DD` of the day `d` falls on by the device's clock — the honest
 * left-hand side when comparing against a Postgres `date` column.
 */
export function localDayISO(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
