/**
 * Statutory dates, computed east of Greenwich.
 *
 * This file runs under `TZ=Asia/Ho_Chi_Minh` (see the `tz` project in
 * vitest.config.ts) because the bug it guards is invisible anywhere else:
 * `toISOString().slice(0, 10)` on a Date built at LOCAL midnight returns the
 * previous day for every UTC+ timezone, and agrees with the local date under
 * UTC. So the version of this test that ran in the default suite passed
 * against the broken implementation — a mutation sweep proved it decorative.
 *
 * A deadline a day early is not a rounding error here. The card attaches a
 * citation to it, so the app would be telling a family the law says something
 * it does not.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { deadlineFor, sendClock } from './requestClocks';

const NOW = new Date(2026, 7, 29, 9, 0, 0); // Aug 29 2026, local

describe('a statutory due date is the family’s calendar date', () => {
  it('runs this file OFF UTC, or it proves nothing', () => {
    // Guard the guard: if the project config stops applying TZ, every
    // assertion below silently becomes a UTC test again.
    //
    // Direction-agnostic since this file runs in two projects — `tz`
    // (Asia/Ho_Chi_Minh, UTC+) and `tz-west` (America/Los_Angeles, UTC−).
    // A day can slip forwards as easily as backwards, and the assertions
    // below hold in both; what must never happen is running at UTC, where
    // local and UTC agree and nothing is being tested.
    expect(new Date(2026, 7, 20).getTimezoneOffset()).not.toBe(0);
  });

  it('adds 30 days to the request date without slipping one back', () => {
    // Asked Aug 20; W&I §4646.5(b) gives 30 days → Sep 19, in California and
    // on a phone in Ho Chi Minh City alike.
    expect(deadlineFor('ipp_meeting', '2026-08-20', NOW)?.dueOn).toBe('2026-09-19');
  });

  it('holds for the 15-day assessment plan', () => {
    expect(deadlineFor('iep_evaluation', '2026-08-20', NOW)?.dueOn).toBe('2026-09-04');
  });

  it('holds for the 120-day assessment clock', () => {
    expect(deadlineFor('rc_assessment', '2026-01-05', NOW)?.dueOn).toBe('2026-05-05');
  });

  it('counts days remaining from the local day, not the UTC one', () => {
    const dl = deadlineFor('ipp_meeting', '2026-08-20', NOW)!;
    expect(dl.daysRemaining).toBe(21);
    expect(dl.overdue).toBe(false);
  });

  it('calls a passed date overdue on the day it passes locally', () => {
    const dl = deadlineFor('ipp_meeting', '2026-07-01', NOW)!;
    expect(dl.dueOn).toBe('2026-07-31');
    expect(dl.overdue).toBe(true);
  });
});

/**
 * `sendClock` is the day LettersScreen stamps on `family_requests.requested_on`
 * and starts the statutory window from. It used to be
 * `new Date().toISOString().slice(0, 10)` written inline in the screen, where
 * no suite could reach it.
 *
 * The clock is pinned rather than passed in — `sendClock` takes no date
 * argument at all, so these assertions exercise the real derivation. Two
 * instants, one per direction: 03:00 UTC is the previous evening in Los
 * Angeles (UTC day a day AHEAD of the family's), 18:00 UTC is the small hours
 * of the next day in Ho Chi Minh City (a day BEHIND). Each project catches one
 * and neither assertion names a sign.
 *
 * `expectedToday` re-derives the local day from Date components rather than
 * calling `localDayISO`, so this does not test the primitive against itself.
 */
describe('sendClock', () => {
  const INSTANTS: [string, string][] = [
    ['03:00 UTC — an evening west of Greenwich', '2026-08-01T03:00:00.000Z'],
    ['18:00 UTC — a small hour east of Greenwich', '2026-08-01T18:00:00.000Z'],
  ];

  afterEach(() => {
    vi.useRealTimers();
  });

  const pin = (instant: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(instant));
  };

  const expectedToday = () => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
  };

  it.each(INSTANTS)('stamps the family’s own calendar day at %s', (_label, instant) => {
    pin(instant);
    expect(sendClock().requestedOn).toBe(expectedToday());
  });

  it.each(INSTANTS)('starts a fresh clock from that same day at %s', (_label, instant) => {
    pin(instant);
    const clock = sendClock();
    expect(clock.clockFrom).toBe(clock.requestedOn);
  });

  it.each(INSTANTS)('gives a new request the FULL statutory window at %s', (_label, instant) => {
    pin(instant);
    // End to end, exactly as the sent moment renders it: stamp, then cite.
    const dl = deadlineFor('ipp_meeting', sendClock().requestedOn)!;
    expect(dl.daysRemaining).toBe(30);
    expect(dl.overdue).toBe(false);
  });

  it.each(INSTANTS)('never restarts an open request’s clock at %s', (_label, instant) => {
    pin(instant);
    // Re-sending from the catalog onto a request opened weeks ago: the
    // citation must count from the row that owns the clock, not from today.
    const clock = sendClock('2026-07-02');
    expect(clock.clockFrom).toBe('2026-07-02');
    expect(clock.requestedOn).toBe(expectedToday());
    expect(deadlineFor('ipp_meeting', clock.clockFrom)!.dueOn).toBe('2026-08-01');
  });

  it('treats a missing existing date as opening the clock today', () => {
    expect(sendClock(null).clockFrom).toBe(sendClock().requestedOn);
    expect(sendClock(undefined).clockFrom).toBe(sendClock().requestedOn);
  });
});
