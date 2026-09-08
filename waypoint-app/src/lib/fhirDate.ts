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
 * - Unparsable → the original string. Showing the raw value beats rendering
 *   `NaN-NaN-NaN` into a record a family reads.
 */
export function fhirDisplayDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  if (YEAR.test(v) || YEAR_MONTH.test(v) || DATE_ONLY.test(v)) return v;

  const parsed = new Date(v);
  if (Number.isNaN(parsed.getTime())) return v;
  return localDayISO(parsed);
}
