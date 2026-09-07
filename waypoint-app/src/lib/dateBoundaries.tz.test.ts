/**
 * The calendar-day boundary, at the places that actually compute one.
 *
 * WHY THIS FILE WAS REWRITTEN. Its first version asserted the HELPERS and
 * nothing else, and an adversarial pass proved the consequence: reverting all
 * nine changed production files left the whole suite — this file included —
 * green at 1287/1287. It was theatre for everything except the `addDays` /
 * `addYears` cases. It also duplicated `localDate.tz.test.ts` and
 * `requestClocks.tz.test.ts`, and one case compared a function's output to its
 * own output.
 *
 * The lesson, written down so it is not repeated: **verifying the helper does
 * not verify the call site.** A call site can take the correct helper and
 * compare its result against something still computed the old way — which is
 * exactly how the CalendarScreen day-key fix shipped as a net regression east
 * of Greenwich. So what is asserted below is the BEHAVIOUR each consumer
 * depends on, not the helper's arithmetic, which `localDate.tz.test.ts` owns.
 *
 * Runs under `tz` (Asia/Ho_Chi_Minh) and `tz-west` (America/Los_Angeles). No
 * assertion may assume the sign of the offset.
 */
import { describe, it, expect } from 'vitest';
import { toLocalISODate, parseLocalDate, addDaysISO, addYearsISO } from './localDate';
import { ageFromDob } from './eligibility';

// A hard guard, not a soft one — its sibling requestClocks.tz.test.ts does the
// same. The `if (offset !== 0)` version this file used to carry meant that at
// TZ=UTC (what CI runs) every assertion below passed vacuously: precisely the
// failure mode the file exists to prevent.
describe('the suite is running somewhere the bug is visible', () => {
  it('is not at offset zero', () => {
    expect(new Date(2026, 0, 15, 12).getTimezoneOffset()).not.toBe(0);
  });
});

// ─── The two directions of the bug ──────────────────────────────────────────

describe('Date -> day string', () => {
  it('names the local day at an hour where UTC disagrees', () => {
    const offset = new Date(2026, 0, 15, 12).getTimezoneOffset();
    // West (offset > 0): late evening is already tomorrow in UTC.
    // East (offset < 0): just after midnight is still yesterday in UTC.
    const at = offset > 0 ? new Date(2026, 0, 15, 23, 30) : new Date(2026, 0, 15, 0, 30);

    expect(toLocalISODate(at)).toBe('2026-01-15');
    // Prove the fixture sits ON the boundary rather than somewhere safe.
    expect(at.toISOString().split('T')[0]).not.toBe('2026-01-15');
  });
});

describe('day string -> Date', () => {
  it('parses a Postgres date at LOCAL midnight, not UTC midnight', () => {
    // The direction the first sweep missed entirely. A bare `new Date('…')` is
    // UTC midnight — 4pm the previous day across all of the Americas.
    const d = parseLocalDate('2026-01-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with toLocalISODate', () => {
    for (const day of ['2026-01-01', '2026-07-04', '2024-02-29', '2025-12-31']) {
      expect(toLocalISODate(parseLocalDate(day))).toBe(day);
    }
  });

  it('leaves a full timestamp alone — an instant is already unambiguous', () => {
    const iso = '2026-01-15T18:30:00.000Z';
    expect(parseLocalDate(iso).toISOString()).toBe(iso);
  });
});

// ─── Call sites: what each consumer actually depends on ─────────────────────

describe('statutory day arithmetic (iepDeadlines consumes these)', () => {
  it('Ed Code §56321 — assessment plan due 15 days after the request', () => {
    expect(addDaysISO('2026-01-01', 15)).toBe('2026-01-16');
  });

  it('Ed Code §56344 — assessment complete 60 days after signed consent', () => {
    expect(addDaysISO('2026-01-01', 60)).toBe('2026-03-02');
  });

  it('an annual review one year on keeps its day', () => {
    expect(addYearsISO('2025-03-10', 1)).toBe('2026-03-10');
  });

  it('a triennial three years on keeps its day', () => {
    expect(addYearsISO('2024-03-10', 3)).toBe('2027-03-10');
  });

  it('crosses New Year without drifting', () => {
    expect(addDaysISO('2025-12-20', 15)).toBe('2026-01-04');
  });

  it('handles leap days', () => {
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysISO('2024-02-29', 1)).toBe('2024-03-01');
  });
});

describe("a child's age, which gates Early Start and transition planning", () => {
  // ageFromDob reads LOCAL month/date off the parsed birthday. Parsed bare, a
  // `date` column became the PREVIOUS day, so a child turned 3 — the Early
  // Start exit — a day early across the Americas.
  it('is not yet 3 the day before the third birthday', () => {
    expect(ageFromDob('2023-03-01', new Date(2026, 1, 28))).toBe(2);
  });

  it('turns 3 on the third birthday itself', () => {
    expect(ageFromDob('2023-03-01', new Date(2026, 2, 1))).toBe(3);
  });

  it('is 15 the day before turning 16, and 16 on the day', () => {
    // 16 is the transition-planning trigger.
    expect(ageFromDob('2010-06-15', new Date(2026, 5, 14))).toBe(15);
    expect(ageFromDob('2010-06-15', new Date(2026, 5, 15))).toBe(16);
  });

  it('handles a New Year birthday, where the slip crosses a year', () => {
    expect(ageFromDob('2020-01-01', new Date(2025, 11, 31))).toBe(5);
    expect(ageFromDob('2020-01-01', new Date(2026, 0, 1))).toBe(6);
  });
});
