/**
 * sourceFreshness — does a `verifiedOn` date still mean anything?
 *
 * The registry-wide assertion at the bottom is the one with teeth: it fails
 * when any source has gone a full California legislative cycle unchecked. That
 * failure is not a bug to route around — it is the re-verification queue
 * arriving, and the fix is to open the source, confirm it still says what we
 * say it says, and bump the date.
 */
import { describe, it, expect } from 'vitest';
import {
  daysBetween,
  statusForAge,
  freshness,
  staleEntries,
  needsReverification,
  freshnessSummary,
  AGING_AFTER_DAYS,
  STALE_AFTER_DAYS,
} from './sourceFreshness';
import { CONTENT_SOURCES } from '@/data/contentSources';

const src = (key: string, verifiedOn: string) => ({ key, title: key, verifiedOn });

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-08-23', '2026-09-13')).toBe(21);
  });

  it('is zero on the same day', () => {
    expect(daysBetween('2026-09-13', '2026-09-13')).toBe(0);
  });

  it('crosses a month boundary', () => {
    expect(daysBetween('2026-08-31', '2026-09-01')).toBe(1);
  });

  it('crosses a year boundary', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('handles a leap day', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('goes negative for a future verification date', () => {
    expect(daysBetween('2026-09-20', '2026-09-13')).toBe(-7);
  });

  it('returns NaN for a malformed date rather than a wrong number', () => {
    expect(daysBetween('August 23 2026', '2026-09-13')).toBeNaN();
    expect(daysBetween('2026-8-3', '2026-09-13')).toBeNaN();
  });
});

describe('statusForAge — the thresholds are boundaries, not vibes', () => {
  it('is fresh one day before aging', () => {
    expect(statusForAge(AGING_AFTER_DAYS - 1)).toBe('fresh');
  });

  it('is aging exactly on the threshold', () => {
    expect(statusForAge(AGING_AFTER_DAYS)).toBe('aging');
  });

  it('is aging one day before stale', () => {
    expect(statusForAge(STALE_AFTER_DAYS - 1)).toBe('aging');
  });

  it('is stale exactly on the threshold', () => {
    expect(statusForAge(STALE_AFTER_DAYS)).toBe('stale');
  });

  it('treats a brand-new entry as fresh', () => {
    expect(statusForAge(0)).toBe('fresh');
  });
});

describe('freshness', () => {
  const sources = [
    src('recent', '2026-09-01'),
    src('ancient', '2024-01-01'),
    src('middling', '2026-02-01'),
  ];

  it('ages every entry against the reference day, oldest first', () => {
    const rows = freshness(sources, '2026-09-13');
    expect(rows.map((r) => r.key)).toEqual(['ancient', 'middling', 'recent']);
    expect(rows[2].ageDays).toBe(12);
  });

  it('buckets each row', () => {
    const rows = freshness(sources, '2026-09-13');
    expect(rows.map((r) => r.status)).toEqual(['stale', 'aging', 'fresh']);
  });

  it('clamps a future verification date to zero rather than reporting a negative age', () => {
    const [row] = freshness([src('tomorrow', '2026-09-20')], '2026-09-13');
    expect(row.ageDays).toBe(0);
    expect(row.status).toBe('fresh');
  });

  it('does not mutate the caller’s array', () => {
    const input = [src('a', '2024-01-01'), src('b', '2026-09-01')];
    const before = input.map((s) => s.key);
    freshness(input, '2026-09-13');
    expect(input.map((s) => s.key)).toEqual(before);
  });

  it('handles an empty registry', () => {
    expect(freshness([], '2026-09-13')).toEqual([]);
    expect(freshnessSummary([], '2026-09-13')).toBe('registry is empty');
  });
});

describe('the re-verification queue', () => {
  const sources = [src('fresh', '2026-09-01'), src('aging', '2026-02-01'), src('stale', '2024-01-01')];

  it('staleEntries returns only what has decayed past a full cycle', () => {
    expect(staleEntries(sources, '2026-09-13').map((r) => r.key)).toEqual(['stale']);
  });

  it('needsReverification returns aging AND stale — the whole queue', () => {
    expect(needsReverification(sources, '2026-09-13').map((r) => r.key)).toEqual(['stale', 'aging']);
  });

  it('summarises in one actionable line', () => {
    expect(freshnessSummary(sources, '2026-09-13')).toBe(
      // 2024-01-01 → 2026-09-13: 731 days to 2026-01-01 (2024 is a leap year)
      // plus 255 days into 2026.
      '3 sources · oldest 986d (stale) · 1 aging · 1 stale'
    );
  });
});

describe('the real registry', () => {
  it('every source carries a parseable verifiedOn', () => {
    for (const row of freshness()) {
      expect(Number.isNaN(row.ageDays)).toBe(false);
    }
  });

  it('NO source has gone a full legislative cycle unverified', () => {
    // A failure here is the re-verification queue arriving, not a broken test.
    // Open the source, confirm it still says what contentSources.ts claims it
    // says, and bump verifiedOn. Never bump the date without opening the source
    // — that is the one move this whole module exists to prevent.
    expect(staleEntries().map((r) => `${r.key} (${r.ageDays}d)`)).toEqual([]);
  });

  it('covers every entry in the registry', () => {
    expect(freshness()).toHaveLength(CONTENT_SOURCES.length);
  });
});
