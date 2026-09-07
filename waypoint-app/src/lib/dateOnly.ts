/**
 * Date-only helpers for Postgres `date` columns (no time, no zone).
 *
 * A `date` column compared against `toISOString().slice(0, 10)` uses the
 * UTC day, which is tomorrow every evening in California — the wrong side
 * of the boundary for the families Waypoint serves. Compare `date` values
 * against the device's local calendar day instead.
 */

/**
 * The local calendar day of `d` as `YYYY-MM-DD` — the string form Postgres
 * `date` columns arrive in, so the two compare lexicographically.
 */
export function localDayISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a stored date for display. A date-only string (`YYYY-MM-DD`, the
 * Postgres `date` wire format) becomes LOCAL midnight of that day —
 * `new Date('2026-08-01')` alone is UTC midnight, the previous evening in
 * California, so a label formatted from it prints one day early. Timestamps
 * parse as-is. Returns null for missing or unparsable input.
 */
export function parseLocalDay(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const m = DATE_ONLY.exec(dateStr.trim());
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}
