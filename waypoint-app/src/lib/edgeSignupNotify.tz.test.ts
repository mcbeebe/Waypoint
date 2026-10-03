/**
 * The sign-up alert's timestamp, pinned in both timezone projects. The Edge
 * runtime's clock is UTC and the owner reads the email in California, so the
 * formatter must name its zone explicitly; on a Pacific laptop a formatter
 * that forgot `timeZone` would still pass — `tz` (UTC+7) is the one to catch it.
 */
import { describe, expect, it } from 'vitest';
import { pacificTime } from '../../supabase/functions/_shared/signupNotify';

describe('pacificTime', () => {
  it('reports the California wall clock, not UTC — 03:30Z on Oct 3 is the evening of Oct 2', () => {
    const s = pacificTime('2026-10-03T03:30:00Z');
    expect(s).toContain('Oct 2, 2026');
    expect(s).toContain('8:30');
    expect(s).toContain('PDT');
  });

  it('passes an unparseable timestamp through unchanged', () => {
    expect(pacificTime('not a date')).toBe('not a date');
  });
});

