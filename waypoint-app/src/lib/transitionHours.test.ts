import { describe, it, expect } from 'vitest';
import { transitionHoursStatus, canLogTransitionMinutes } from './transitionHours';
import { SDP_TRANSITION_HOURS_CAP } from '@/data/benefitFigures';

const NOW = new Date('2026-08-23T12:00:00');

function ev(minutes: number, occurred_on: string) {
  return { activity_type: 'transition_099' as const, minutes, occurred_on };
}

describe('transitionHoursStatus', () => {
  it('sums only 099 events against the cap', () => {
    const s = transitionHoursStatus(
      [ev(120, '2026-08-01'), ev(60, '2026-08-10'),
       { activity_type: 'facilitation' as const, minutes: 600, occurred_on: '2026-08-11' }],
      [],
      NOW
    );
    expect(s.usedHours).toBe(3);
    expect(s.capHours).toBe(SDP_TRANSITION_HOURS_CAP);
    expect(s.atWarning).toBe(false);
    expect(s.atCap).toBe(false);
  });

  it('warns at 80% and caps at 100%', () => {
    const warn = transitionHoursStatus([ev(32 * 60, '2026-08-01')], [], NOW);
    expect(warn.pctUsed).toBe(80);
    expect(warn.atWarning).toBe(true);
    expect(warn.atCap).toBe(false);

    const cap = transitionHoursStatus([ev(40 * 60, '2026-08-01')], [], NOW);
    expect(cap.atCap).toBe(true);
    expect(cap.remainingHours).toBe(0);
  });

  it('approved extensions raise the effective cap; pending ones do not', () => {
    const events = [ev(41 * 60, '2026-08-01')];
    const pending = transitionHoursStatus(events, [{ approved_on: null, additional_hours: 10 }], NOW);
    expect(pending.atCap).toBe(true);
    expect(pending.hasPendingExtension).toBe(true);

    const approved = transitionHoursStatus(
      events,
      [{ approved_on: '2026-08-15', additional_hours: 10 }],
      NOW
    );
    expect(approved.capHours).toBe(50);
    expect(approved.atCap).toBe(false);
  });

  it('forecasts the cap-hit date from the recent burn rate', () => {
    // 14h in the last 28 days → 0.5h/day; 20h used → 20h remaining → ~40 days
    const s = transitionHoursStatus(
      [ev(6 * 60, '2026-07-01'), ev(14 * 60, '2026-08-10')],
      [],
      NOW
    );
    expect(s.forecastCapDate).toBe('2026-10-02');
  });

  it('no recent burn → no forecast, honestly', () => {
    const s = transitionHoursStatus([ev(10 * 60, '2026-01-05')], [], NOW);
    expect(s.forecastCapDate).toBeNull();
  });
});

describe('canLogTransitionMinutes — the hard stop', () => {
  it('hour 41 cannot be logged without an approved extension', () => {
    const events = [ev(40 * 60, '2026-08-01')];
    const check = canLogTransitionMinutes(30, events);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('40h');
    expect(check.reason).toContain('extension');
  });

  it('an approved extension unlocks the hours', () => {
    const events = [ev(40 * 60, '2026-08-01')];
    const check = canLogTransitionMinutes(30, events, [
      { approved_on: '2026-08-15', additional_hours: 5 },
    ]);
    expect(check.allowed).toBe(true);
  });

  it('an entry that lands exactly on the cap is allowed', () => {
    const events = [ev(39 * 60, '2026-08-01')];
    expect(canLogTransitionMinutes(60, events).allowed).toBe(true);
    expect(canLogTransitionMinutes(61, events).allowed).toBe(false);
  });
});
