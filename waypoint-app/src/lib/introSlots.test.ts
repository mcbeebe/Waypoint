import { describe, it, expect } from 'vitest';
import { nextIntroSlots } from './introSlots';

describe('nextIntroSlots', () => {
  it('returns four slots on the next two business days', () => {
    // Friday → next business days are Mon/Tue
    const slots = nextIntroSlots(new Date('2026-08-21T09:00:00'));
    expect(slots).toHaveLength(4);
    expect(slots[0].dayLabel).toBe('Mon 24');
    expect(slots[2].dayLabel).toBe('Tue 25');
    expect(slots.map((s) => s.timeLabel)).toEqual([
      '10:00 AM',
      '2:30 PM',
      '10:00 AM',
      '2:30 PM',
    ]);
  });

  it('skips weekends from a midweek start', () => {
    // Thursday → Fri, then Mon
    const slots = nextIntroSlots(new Date('2026-08-20T09:00:00'));
    expect(slots[0].dayLabel).toBe('Fri 21');
    expect(slots[2].dayLabel).toBe('Mon 24');
  });

  it('produces valid ISO starts', () => {
    for (const s of nextIntroSlots(new Date('2026-08-21T09:00:00'))) {
      expect(Number.isNaN(new Date(s.startIso).getTime())).toBe(false);
    }
  });
});
