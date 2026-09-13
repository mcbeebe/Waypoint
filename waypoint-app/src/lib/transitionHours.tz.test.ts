/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on.
 *
 * `forecastCapDate` is built from a LOCAL-midnight date (`today` + days at
 * the burn rate). Slicing its `toISOString()` named the previous day on
 * every UTC+ device — "hits the cap ~Oct 2" for a cap the math put at Oct 3.
 */
import { describe, it, expect } from 'vitest';
import { transitionHoursStatus } from './transitionHours';

describe('transitionHoursStatus forecast on the local calendar', () => {
  it('forecastCapDate is the local calendar day, at both edges of the day', () => {
    // 1680 minutes = 28h over the 28-day window → exactly 1h/day; 12h remain
    // of the 40h cap → the cap is hit 12 days after "today". Both `now`
    // instants fall on local Aug 1, so the forecast is Aug 13 in every zone.
    const events = [
      { activity_type: 'transition_099' as const, minutes: 1680, occurred_on: '2026-07-25' },
    ];
    expect(transitionHoursStatus(events, [], new Date(2026, 7, 1, 23, 30)).forecastCapDate).toBe(
      '2026-08-13'
    );
    expect(transitionHoursStatus(events, [], new Date(2026, 7, 1, 0, 30)).forecastCapDate).toBe(
      '2026-08-13'
    );
  });
});
