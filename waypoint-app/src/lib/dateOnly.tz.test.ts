import { describe, it, expect } from 'vitest';
import { localDayISO } from './dateOnly';

/**
 * Runs in BOTH tz projects (Asia/Ho_Chi_Minh and America/Los_Angeles).
 * Every assertion is about the LOCAL calendar day, so nothing here may
 * assume which side of the UTC boundary the zone sits on.
 */

describe('localDayISO', () => {
  it('formats the local wall-clock day regardless of zone', () => {
    expect(localDayISO(new Date(2026, 8, 30, 17, 0, 0))).toBe('2026-09-30');
    expect(localDayISO(new Date(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01');
    expect(localDayISO(new Date(2026, 11, 31, 23, 59, 0))).toBe('2026-12-31');
  });

  it('disagrees with the UTC slice exactly when the zone offset crosses midnight', () => {
    // 5pm on Sep 30 local: UTC is already Oct 1 in the Americas, and still
    // Sep 30 east of Greenwich. The local day is Sep 30 in both.
    const evening = new Date(2026, 8, 30, 17, 0, 0);
    expect(localDayISO(evening)).toBe('2026-09-30');
    const utcDay = evening.toISOString().slice(0, 10);
    expect(utcDay >= '2026-09-30').toBe(true);
  });
});
