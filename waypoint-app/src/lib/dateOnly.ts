/**
 * Reading Postgres date-only values on the device's local calendar.
 *
 * A Postgres `date` (`2026-08-01` — `due_date`, `date_of_birth`,
 * `requested_on`) names a calendar day with no instant and no zone.
 * `new Date('2026-08-01')` parses it as UTC MIDNIGHT — 17:00 the previous
 * evening for a family in California — so every naive parse displays,
 * schedules, or compares the day before the one the row names. The inverse
 * trap is `new Date().toISOString().slice(0, 10)`: that is "today" in UTC,
 * which is tomorrow every evening in California.
 *
 * `actionSort`, `planView`, `homeTriage` and the other pure modules each
 * guard their own domain already. This module is the shared rule for the
 * call sites that were still parsing naively — the screens' date labels,
 * deadline reminder scheduling, and age-from-DOB.
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest world,
 * and is pinned in BOTH timezone suites by `dateOnly.tz.test.ts`.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a value that may be a Postgres `date` OR a full timestamp.
 *
 * - `2026-08-01` → local midnight of exactly that day, on the family's own
 *   calendar.
 * - Anything else (`created_at`, an ISO timestamp) is a real instant, parsed
 *   as-is; its calendar day is whatever the device's clock says.
 *
 * An unparsable STRING yields an Invalid Date (`getTime()` is NaN), same as
 * `new Date(bad)`, so existing NaN guards keep working. The argument must
 * actually be a string, though: null/undefined throw here (unlike
 * `new Date(null)`), so callers null-guard first — a nullable column is the
 * call site's decision to make (skip the row, render nothing, return null),
 * not this parser's.
 */
export function parseDateLocal(value: string): Date {
  const m = DATE_ONLY.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/**
 * `YYYY-MM-DD` of the day `d` falls on by the device's clock — the honest
 * left-hand side when comparing against a Postgres `date` column.
 */
export function localDayISO(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
