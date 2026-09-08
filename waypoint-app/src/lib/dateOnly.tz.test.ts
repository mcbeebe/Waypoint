/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on — every assertion states
 * what must hold on ANY device clock.
 */
import { describe, it, expect } from 'vitest';
import { parseDateLocal, localDayISO } from './dateOnly';

describe('parseDateLocal', () => {
  it('reads a Postgres date as that day on the LOCAL calendar', () => {
    const d = parseDateLocal('2026-08-01');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 7, 1]);
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0]);
  });

  it('formats to the day the row names — the Overdue badge bug', () => {
    // ActionsScreen renders `formatDate(due_date)` beside a badge computed on
    // the local day. `new Date('2026-08-01')` is UTC midnight, so the label
    // read "Jul 31" for every family west of Greenwich while the badge and
    // the Overdue filter both (correctly) said Aug 1.
    const label = parseDateLocal('2026-08-01').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(label).toBe('Aug 1');
  });

  it('keeps a full timestamp as the instant it names', () => {
    const iso = '2026-08-01T14:03:00.000Z';
    expect(parseDateLocal(iso).getTime()).toBe(Date.parse(iso));
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDateLocal(' 2026-08-01 ').getDate()).toBe(1);
  });

  it('yields an Invalid Date for garbage, same as new Date()', () => {
    expect(Number.isNaN(parseDateLocal('not-a-date').getTime())).toBe(true);
  });
});

describe('localDayISO', () => {
  it('is the local calendar day at both edges of the day, never the UTC slice', () => {
    // 23:30 local is already "tomorrow" in UTC east of Greenwich; 00:30 local
    // is still "yesterday" in UTC west of it. The local day is 2026-08-01 in
    // every zone; toISOString().slice(0, 10) is wrong in one suite each.
    expect(localDayISO(new Date(2026, 7, 1, 23, 30))).toBe('2026-08-01');
    expect(localDayISO(new Date(2026, 7, 1, 0, 30))).toBe('2026-08-01');
  });

  it('zero-pads month and day', () => {
    expect(localDayISO(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
});
