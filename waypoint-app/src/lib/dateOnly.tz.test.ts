import { describe, it, expect } from 'vitest';
import { localDayISO, parseLocalDay } from './dateOnly';

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
});

describe('parseLocalDay', () => {
  it('reads a date-only string as the local day, not UTC midnight', () => {
    const d = parseLocalDay('2026-08-01')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });

  it('round-trips with localDayISO in every zone', () => {
    expect(localDayISO(parseLocalDay('2026-08-01')!)).toBe('2026-08-01');
    expect(localDayISO(parseLocalDay('2026-12-31')!)).toBe('2026-12-31');
  });

  it('formats to the stored day — the label a family sees', () => {
    const label = parseLocalDay('2026-08-01')!.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(label).toBe('Aug 1');
  });

  it('passes timestamps through unchanged', () => {
    const iso = '2026-08-01T12:00:00Z';
    expect(parseLocalDay(iso)!.getTime()).toBe(Date.parse(iso));
  });

  it('returns null for missing or unparsable input', () => {
    expect(parseLocalDay(null)).toBeNull();
    expect(parseLocalDay(undefined)).toBeNull();
    expect(parseLocalDay('')).toBeNull();
    expect(parseLocalDay('not a date')).toBeNull();
  });
});
