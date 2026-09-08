/**
 * Reading a FHIR date on the device's local calendar.
 *
 * FHIR `date` and `dateTime` elements are deliberately imprecise: the spec
 * allows `2026`, `2026-08`, `2026-08-01`, and a full instant such as
 * `2026-08-01T18:30:00-07:00`. Only the last of those names a moment in
 * time; the first three name a calendar period with no zone at all.
 *
 * Splitting the value at `'T'` treats all four the same and is wrong for
 * exactly one of them — the full instant, whose text is usually normalized
 * to UTC by the server. A lab drawn at 6pm Pacific arrives as
 * `2026-08-02T01:30:00Z`, and the split renders it as August 2nd: a date the
 * family never experienced, on a record they may carry into an appointment.
 *
 * So: pass the partial forms through untouched (there is no zone to correct,
 * and inventing a day we were not given would be worse than showing less),
 * and resolve a real instant onto the device's own calendar.
 *
 * Pure — no expo, no react-native, unlike `fhir.ts` itself — so it lives in
 * the `logic` world and is pinned in BOTH timezone suites by
 * `fhirDate.tz.test.ts`.
 */

import { localDayISO } from '@/lib/dateOnly';

/** `2026` — a year, no month, no day. */
const YEAR = /^\d{4}$/;
/** `2026-08` — a month, no day. */
const YEAR_MONTH = /^\d{4}-\d{2}$/;
/** `2026-08-01` — a calendar day, already zone-free. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** `2026-08-01T…` — a day with a time attached, i.e. a real instant. */
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T/;

/** Whether `y-m-d` is a day that actually exists on the calendar. */
function isRealDay(y: number, m: number, d: number): boolean {
  const probe = new Date(y, m - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

/**
 * The day to show a parent for a FHIR `date` / `dateTime` value.
 *
 * - `2026`, `2026-08` → returned unchanged. The record genuinely does not
 *   say which day; a caller renders the coarser label rather than guessing.
 * - `2026-08-01` → returned unchanged. It already names a calendar day and
 *   carries no zone, so there is nothing to convert.
 * - A full instant → the `YYYY-MM-DD` the device's clock puts it on.
 * - Missing or blank → `null`, so the caller decides what an absent date
 *   looks like (a dash, an empty cell, "unknown date").
 * - An instant we cannot trust — a nonexistent day like `2026-02-30T10:00Z`,
 *   or an unusable time like `2026-08-01T25:00:00Z` — falls back to the day
 *   the record literally states. `new Date` would roll the first forward to
 *   March 2nd, which is a date the record does not contain, and this module
 *   would rather show less than invent a day.
 * - Anything else unrecognized → the original string, so a family sees what
 *   the record actually says rather than `NaN-NaN-NaN`.
 */
export function fhirDisplayDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  if (YEAR.test(v) || YEAR_MONTH.test(v) || DATE_ONLY.test(v)) return v;

  const m = INSTANT.exec(v);
  if (m) {
    const stated = `${m[1]}-${m[2]}-${m[3]}`;
    if (!isRealDay(Number(m[1]), Number(m[2]), Number(m[3]))) return stated;
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? stated : localDayISO(parsed);
  }

  return v;
}
