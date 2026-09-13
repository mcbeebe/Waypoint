/**
 * sourceFreshness across timezones.
 *
 * Runs twice — `tz` at Asia/Ho_Chi_Minh (UTC+7) and `tz-west` at
 * America/Los_Angeles — so the assertions here cannot assume a sign. East
 * catches an age computed a day early, west a day late.
 *
 * The invariant under test: **how old a citation is must not depend on where
 * the reader is.** `verifiedOn` is a calendar day with no time and no zone, so
 * anchoring it to a local midnight would make the same statute 180 days old in
 * California and 181 in Ho Chi Minh City — and, at exactly the wrong moment,
 * "aging" in one place and "fresh" in the other.
 */
import { describe, it, expect } from 'vitest';
import { daysBetween, freshness, statusForAge, AGING_AFTER_DAYS } from './sourceFreshness';
import { localDayISO } from './dateOnly';

const src = (key: string, verifiedOn: string) => ({ key, title: key, verifiedOn });

describe('freshness is timezone-invariant', () => {
  it('the same two dates are the same distance apart in any zone', () => {
    // Hard-coded expectations, not a re-derivation — a test that recomputes the
    // answer the same way as the code proves nothing.
    expect(daysBetween('2026-08-23', '2026-09-13')).toBe(21);
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364);
    expect(daysBetween('2028-02-01', '2028-03-01')).toBe(29); // leap year
  });

  it('an age computed across a DST boundary is still whole days', () => {
    // US DST ends Nov 1 2026; Ho Chi Minh City has no DST at all. Both must
    // agree, which they only do if the math never touches a local clock.
    expect(daysBetween('2026-10-25', '2026-11-08')).toBe(14);
  });

  it('a source sitting exactly on the aging threshold buckets the same everywhere', () => {
    const verifiedOn = '2026-01-01';
    const asOf = '2026-06-30'; // exactly AGING_AFTER_DAYS later
    expect(daysBetween(verifiedOn, asOf)).toBe(AGING_AFTER_DAYS);
    const [row] = freshness([src('edge', verifiedOn)], asOf);
    expect(row.status).toBe('aging');
    expect(statusForAge(row.ageDays)).toBe('aging');
  });

  it('an explicit reference day produces identical rows in either zone', () => {
    const rows = freshness(
      [src('a', '2026-01-01'), src('b', '2025-06-15'), src('c', '2026-09-01')],
      '2026-09-13'
    );
    expect(rows.map((r) => [r.key, r.ageDays, r.status])).toEqual([
      ['b', 455, 'stale'],
      ['a', 255, 'aging'],
      ['c', 12, 'fresh'],
    ]);
  });

  it('the default reference day is the LOCAL day, and never more than a day off UTC', () => {
    // The default intentionally follows the family's own calendar day, so the
    // two zones can legitimately differ — by at most one day, in either
    // direction. Asserting the magnitude rather than the sign is what lets this
    // pass at UTC+7 and UTC-8 alike.
    const [local] = freshness([src('x', '2026-01-01')]);
    const [utc] = freshness([src('x', '2026-01-01')], new Date().toISOString().slice(0, 10));
    expect(Math.abs(local.ageDays - utc.ageDays)).toBeLessThanOrEqual(1);
    expect(localDayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
