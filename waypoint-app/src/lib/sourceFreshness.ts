/**
 * Provenance freshness (Build-Plan-Items1-4 phase A3, the half that needs no
 * network) — how old is each `verifiedOn` date, and which ones have decayed?
 *
 * `contentSources.ts` already guards that a `verifiedOn` exists and is not in
 * the future. Nothing guards that it is still TRUE. "Verified Aug 23, 2026"
 * rendered under a statute in 2028 is a stronger-looking claim than no date at
 * all, and a worse one — the reader trusts it more precisely because it is
 * dated.
 *
 * This is the honest alternative to what a competitor does. Special Needs
 * Navigator's assistant looks benefit figures up live: always fresh, never
 * attributable. Waypoint's are dated and attributable — which only beats live
 * lookup if the date means something, and a date means something only if
 * something forces it to be renewed. That is this module's whole job.
 *
 * Pure and timezone-safe: `verifiedOn` is a date-only string and ages are
 * computed in UTC, so a citation is not one day older in Ho Chi Minh City than
 * in Los Angeles. Only the caller's notion of "today" is local, and it is
 * passed in.
 */
import { CONTENT_SOURCES } from '@/data/contentSources';
import { localDayISO } from '@/lib/dateOnly';

/**
 * Past this, an entry is worth re-checking. Chosen to put every source through
 * roughly two reviews a year — often enough to catch a statute amended in a
 * legislative session, rarely enough that a solo owner can actually do it.
 */
export const AGING_AFTER_DAYS = 180;

/**
 * Past this, the date is no longer evidence of anything. A full year covers one
 * complete California legislative cycle, so an entry that has gone this long
 * has survived a whole session's worth of amendments unchecked.
 */
export const STALE_AFTER_DAYS = 365;

export type Freshness = 'fresh' | 'aging' | 'stale';

/** One registry entry, aged. */
export interface FreshnessRow {
  key: string;
  title: string;
  verifiedOn: string;
  /** Whole days between `verifiedOn` and the reference day. Never negative. */
  ageDays: number;
  status: Freshness;
}

const MS_PER_DAY = 86_400_000;

/** A `YYYY-MM-DD` date-only string as a UTC timestamp, or NaN if malformed. */
function utcMidnight(dateOnly: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Whole days from `from` to `to`, both date-only strings.
 *
 * Computed in UTC on purpose: both ends are calendar days with no time and no
 * zone, so anchoring them anywhere else would make the same citation a
 * different age for two readers.
 */
export function daysBetween(from: string, to: string): number {
  const a = utcMidnight(from);
  const b = utcMidnight(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
  return Math.round((b - a) / MS_PER_DAY);
}

/** Bucket an age. A future date counts as fresh — the registry test rejects it separately. */
export function statusForAge(ageDays: number): Freshness {
  if (ageDays >= STALE_AFTER_DAYS) return 'stale';
  if (ageDays >= AGING_AFTER_DAYS) return 'aging';
  return 'fresh';
}

/**
 * Age every registry entry against a reference day, oldest first.
 *
 * @param asOf the day to measure from, as `YYYY-MM-DD`. Defaults to the
 *   caller's LOCAL day — the family's day, matching the rest of the app.
 */
export function freshness(
  sources: ReadonlyArray<{ key: string; title: string; verifiedOn: string }> = CONTENT_SOURCES,
  asOf: string = localDayISO()
): FreshnessRow[] {
  return sources
    .map((s) => {
      const ageDays = Math.max(0, daysBetween(s.verifiedOn, asOf) || 0);
      return { key: s.key, title: s.title, verifiedOn: s.verifiedOn, ageDays, status: statusForAge(ageDays) };
    })
    .sort((a, b) => b.ageDays - a.ageDays);
}

/** Entries past {@link STALE_AFTER_DAYS} — the ones whose date is no longer evidence. */
export function staleEntries(
  sources?: ReadonlyArray<{ key: string; title: string; verifiedOn: string }>,
  asOf?: string
): FreshnessRow[] {
  return freshness(sources, asOf).filter((r) => r.status === 'stale');
}

/** Entries past {@link AGING_AFTER_DAYS}, stale ones included — the re-verification queue. */
export function needsReverification(
  sources?: ReadonlyArray<{ key: string; title: string; verifiedOn: string }>,
  asOf?: string
): FreshnessRow[] {
  return freshness(sources, asOf).filter((r) => r.status !== 'fresh');
}

/**
 * One line a human can act on: how old the oldest entry is and what is due.
 * Written for a commit message or a console, not for a family.
 */
export function freshnessSummary(
  sources?: ReadonlyArray<{ key: string; title: string; verifiedOn: string }>,
  asOf?: string
): string {
  const rows = freshness(sources, asOf);
  if (rows.length === 0) return 'registry is empty';
  const stale = rows.filter((r) => r.status === 'stale').length;
  const aging = rows.filter((r) => r.status === 'aging').length;
  return `${rows.length} sources · oldest ${rows[0].ageDays}d (${rows[0].key}) · ${aging} aging · ${stale} stale`;
}
