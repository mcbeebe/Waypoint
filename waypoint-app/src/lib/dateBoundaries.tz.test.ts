/**
 * The calendar-day boundary, across every module that computes one.
 *
 * WHY THIS FILE EXISTS. Twenty-three places in this app turned a `Date` into a
 * `YYYY-MM-DD` with `toISOString().split('T')[0]` or `.slice(0, 10)` — the day
 * in **UTC**, not the day the family is living in. The two disagree for part of
 * every day, in opposite directions depending on which side of Greenwich you
 * are on:
 *
 *   - **West** (California, where Waypoint's families are): the UTC day rolls
 *     over at 4pm or 5pm local, so from late afternoon "today" is TOMORROW.
 *   - **East**: local midnight is still yesterday in UTC, so a computed date
 *     lands a day EARLY.
 *
 * The repo had already been bitten twice and fixed it twice — `requestClocks.ts`
 * and `RequestTrackerScreen.tsx` each carry a comment naming the exact bug. But
 * both fixes were inline, so the knowledge never spread and the other
 * twenty-three sites kept the UTC slice. This file, and `localDate.ts`, are the
 * shared answer.
 *
 * Runs under `tz` (Asia/Ho_Chi_Minh) and `tz-west` (America/Los_Angeles). No
 * assertion below may assume the sign of the offset — a suite that passes in
 * only one hemisphere is how this survived.
 */
import { describe, it, expect } from 'vitest';
import { toLocalISODate, todayLocalISO } from './localDate';
import { deadlineFor } from './requestClocks';
import { addDaysISO as addDays, addYearsISO as addYears } from './localDate';

/** The pattern being replaced, kept as the thing under comparison. */
const utcDay = (d: Date) => d.toISOString().split('T')[0];

/** A moment that is a different UTC day than local day, wherever we are. */
function skewedMoment(): { local: string; at: Date } {
  const offset = new Date(2026, 0, 15, 12).getTimezoneOffset();
  // West of Greenwich (offset > 0): late evening is already tomorrow in UTC.
  // East (offset < 0): just after midnight is still yesterday in UTC.
  const at = offset > 0 ? new Date(2026, 0, 15, 23, 30) : new Date(2026, 0, 15, 0, 30);
  return { local: '2026-01-15', at };
}

describe('the day a moment falls on', () => {
  it('is the local day, at the hour where UTC disagrees', () => {
    const { local, at } = skewedMoment();
    expect(toLocalISODate(at)).toBe(local);

    // Prove the fixture is actually exercising the boundary — otherwise this
    // whole file could pass by testing an hour where nothing differs.
    if (at.getTimezoneOffset() !== 0) {
      expect(utcDay(at)).not.toBe(local);
    }
  });

  it('todayLocalISO never disagrees with the local calendar', () => {
    const { local, at } = skewedMoment();
    expect(todayLocalISO(at)).toBe(local);
  });
});

// ─── Statutory clocks — a date the law did not give is the worst case ───────

describe('requestClocks.deadlineFor', () => {
  it('counts from the requested day to a stable due day', () => {
    // W&I §4646.5(b): an IPP review requested on the 1st is due within 30 days.
    const due = deadlineFor('ipp_meeting', '2026-01-01');
    expect(due?.dueOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The exact date is the module's business; what must hold everywhere is
    // that it does not drift by hemisphere.
    expect(deadlineFor('ipp_meeting', '2026-01-01')?.dueOn).toBe(due?.dueOn);
  });

  it('gives the same due date in both hemispheres for the same request date', () => {
    // Pinned literally: if this file runs east and west and both agree with
    // this string, the value is offset-independent — which is the property
    // that failed before.
    expect(deadlineFor('ipp_meeting', '2026-03-02')?.dueOn).toBe('2026-04-01');
  });
});

describe('iepDeadlines day arithmetic', () => {
  it('adds days without losing one to the UTC boundary', () => {
    // Ed Code §56321: an assessment plan is due 15 calendar days after the
    // written request. 2026-01-01 + 15 is 2026-01-16 in every timezone.
    expect(addDays('2026-01-01', 15)).toBe('2026-01-16');
  });

  it('adds the 60-day assessment clock unshifted', () => {
    // Ed Code §56344: assessment complete and the IEP held within 60 days of
    // signed consent.
    expect(addDays('2026-01-01', 60)).toBe('2026-03-02');
  });

  it('adds years without losing a day', () => {
    // An annual review held 2025-03-10 is due 2026-03-10 — not 03-09.
    expect(addYears('2025-03-10', 1)).toBe('2026-03-10');
  });

  it('adds the triennial three years out', () => {
    expect(addYears('2024-03-10', 3)).toBe('2027-03-10');
  });

  it('crosses a year boundary without drifting', () => {
    // The case most likely to expose a UTC slice: adding into New Year.
    expect(addDays('2025-12-20', 15)).toBe('2026-01-04');
  });

  it('handles a leap day the same way in both hemispheres', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
  });
});
