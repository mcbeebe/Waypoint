/**
 * The bridge sentence on two clocks — Asia/Ho_Chi_Minh (east, UTC+7) and
 * America/Los_Angeles (west, UTC−7/8), the SAME file run twice.
 *
 * Why both: one timezone is not a timezone suite. East catches a day computed
 * EARLY, west a day computed LATE, and Waypoint's families are in California —
 * `actionSort` once bucketed on its UTC day for a full PR, invisible at UTC+7
 * and an off-by-one every evening in California. So nothing here may assume a
 * sign; each assertion is either zone-invariant or compared against the
 * device's own clock.
 *
 * Two things carry a date in this module:
 *  - `due_date` / `follow_up_date` — Postgres `date`, a calendar day with no
 *    zone. `Aug 24` must read as Aug 24 everywhere, and "has it passed?" must
 *    be asked against the day the FAMILY is living in.
 *  - `completed_at` — a real timestamp, whose calendar day legitimately
 *    differs by zone. That is correct, and it is asserted as such.
 */
import { describe, it, expect } from 'vitest';
import { actionAskPrefill } from './actionAsk';
import type { ActionAskInput } from './actionAsk';
import { localDayISO } from './dateOnly';

const BASE: ActionAskInput = {
  title: 'Apply for Medi-Cal',
  status: 'not_started',
  due_date: null,
  completed_at: null,
  steps: null,
  follow_up_date: null,
};
const at = (over: Partial<ActionAskInput>): ActionAskInput => ({ ...BASE, ...over });

/** The local calendar day `n` days from today, by the device's own clock. */
function localDayOffset(n: number): string {
  const d = new Date();
  // Date arithmetic on the local calendar, so a 23- or 25-hour DST day still
  // moves exactly one day.
  d.setDate(d.getDate() + n);
  return localDayISO(d);
}

describe('a date-only column names the same calendar day in both zones', () => {
  it('a due date renders as the day the row names, never the day before', () => {
    const s = actionAskPrefill(at({ due_date: '2026-08-24' }), { today: '2026-10-14' });
    expect(s).toContain('Aug 24');
    expect(s).not.toContain('Aug 23');
    expect(s).not.toContain('Aug 25');
  });

  it('a date-only completed_at renders as that day', () => {
    const s = actionAskPrefill(at({ status: 'completed', completed_at: '2026-01-01' }), {
      today: '2026-10-14',
    });
    expect(s).toContain('Jan 1');
    expect(s).not.toContain('Dec 31');
  });
});

describe('"has it passed?" is asked on the family\'s calendar, not UTC\'s', () => {
  // No `today` passed: these exercise the default, which is the bug surface.
  it('a date due TODAY has not passed — in either zone', () => {
    const s = actionAskPrefill(at({ due_date: localDayOffset(0) }));
    expect(s).not.toContain('has passed');
    expect(s).toContain("It's due");
  });

  it('a date due YESTERDAY has passed — in either zone', () => {
    const s = actionAskPrefill(at({ due_date: localDayOffset(-1) }));
    expect(s).toContain('and that date has passed');
  });

  it('a date due TOMORROW has not passed — in either zone', () => {
    const s = actionAskPrefill(at({ due_date: localDayOffset(1) }));
    expect(s).not.toContain('has passed');
  });

  it('a follow-up due TODAY is not yet a past-due answer', () => {
    const s = actionAskPrefill(
      at({ status: 'completed', completed_at: '2026-10-02', follow_up_date: localDayOffset(0) })
    );
    expect(s).not.toContain('past due');
  });

  it('a follow-up that was due YESTERDAY is a past-due answer', () => {
    const s = actionAskPrefill(
      at({ status: 'completed', completed_at: '2026-10-02', follow_up_date: localDayOffset(-1) })
    );
    expect(s).toContain('An answer on it is past due.');
  });
});

describe('a timestamp belongs to the day the family is living in', () => {
  it('completed_at renders on the device clock, not forced to UTC', () => {
    const iso = '2026-10-02T18:00:00.000Z';
    // UTC+7 is already Oct 3 at that instant; UTC−7 is still Oct 2. Both are
    // right — what would be wrong is pinning either one. So the expectation is
    // computed from the same clock the suite is running on.
    const expected = new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const s = actionAskPrefill(at({ status: 'completed', completed_at: iso }), {
      today: '2026-10-14',
    });
    expect(s).toContain(expected);
  });
});
