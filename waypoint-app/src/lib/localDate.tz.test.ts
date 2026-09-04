/**
 * The local-day helpers, run in BOTH hemispheres.
 *
 * This file is `.tz.test.ts`, so vitest runs it twice: once under
 * `Asia/Ho_Chi_Minh` (the `tz` project) and once under
 * `America/Los_Angeles` (`tz-west`). Both must pass, so nothing below may
 * assume the sign of the offset.
 *
 * That is not ceremony. The bug these helpers replace is INVISIBLE under
 * `TZ=UTC`, which is what a default `logic` run uses:
 *
 *   - east catches "stored a day EARLY" (a picked birthday),
 *   - west catches "today is TOMORROW" (an evening in California).
 *
 * A single-timezone suite certifies one of those two as fine.
 */
import { describe, it, expect } from 'vitest';
import { toLocalISODate, todayLocalISO } from './localDate';

/** What the ten call sites used to do, kept here as the thing being replaced. */
const utcDay = (d: Date) => d.toISOString().split('T')[0];

describe('toLocalISODate reads the calendar the family is looking at', () => {
  it('keeps a date picked from a calendar on the day that was picked', () => {
    // The web date input hands back "2020-01-01"; OnboardingFlow turns that
    // into local midnight. Whatever the offset, it must come back out as the
    // same day it went in.
    const [y, m, d] = '2020-01-01'.split('-').map(Number);
    expect(toLocalISODate(new Date(y, m - 1, d))).toBe('2020-01-01');
  });

  it('agrees with the Date object it was given, at every hour of the day', () => {
    // The property that actually matters, asserted without naming an offset:
    // the string always names the SAME calendar day the Date does locally.
    for (let hour = 0; hour < 24; hour++) {
      const at = new Date(2026, 0, 1, hour, 30, 0);
      expect(toLocalISODate(at)).toBe('2026-01-01');
      expect(at.getDate()).toBe(1);
    }
  });

  it('pads single-digit months and days', () => {
    expect(toLocalISODate(new Date(2026, 8, 4))).toBe('2026-09-04');
    expect(toLocalISODate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('rolls the year over on local New Year, not UTC New Year', () => {
    expect(toLocalISODate(new Date(2025, 11, 31, 23, 59))).toBe('2025-12-31');
    expect(toLocalISODate(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });

  it('handles a leap day', () => {
    expect(toLocalISODate(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

describe('todayLocalISO', () => {
  it('is the local day of the moment it is given', () => {
    expect(todayLocalISO(new Date(2026, 0, 1, 17, 0))).toBe('2026-01-01');
  });

  it('does not tick over before local midnight', () => {
    // The California case: 5pm is already TOMORROW in UTC. "Today" must not be.
    const evening = new Date(2026, 0, 1, 17, 0);
    const nextMorning = new Date(2026, 0, 2, 9, 0);
    expect(todayLocalISO(evening)).toBe('2026-01-01');
    expect(todayLocalISO(nextMorning)).toBe('2026-01-02');
    expect(todayLocalISO(evening)).not.toBe(todayLocalISO(nextMorning));
  });
});

describe('the bug this replaces is real in exactly one hemisphere each', () => {
  it('differs from the UTC day somewhere in the day, whichever way we are offset', () => {
    // Written so it passes east AND west without asserting a direction: at some
    // hour of the day the UTC day and the local day disagree, unless the
    // machine is genuinely at offset zero.
    const offsetMinutes = new Date(2026, 0, 1, 12).getTimezoneOffset();
    const hours = Array.from({ length: 24 }, (_, h) => new Date(2026, 0, 1, h, 30));
    const disagreements = hours.filter((d) => utcDay(d) !== toLocalISODate(d)).length;

    if (offsetMinutes === 0) {
      expect(disagreements).toBe(0);
    } else {
      // A non-zero offset ALWAYS produces some window where the two disagree.
      // That window is what shipped to families for ten call sites.
      expect(disagreements).toBeGreaterThan(0);
    }
    // And the helper never disagrees with itself.
    for (const d of hours) expect(toLocalISODate(d)).toBe('2026-01-01');
  });
});
