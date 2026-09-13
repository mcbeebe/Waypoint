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
import { describe, it, expect } from 'vitest';
import { deadlineFor } from './requestClocks';
import { clockAnchorFor } from './sentNext';

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

describe('the clock a send starts (LettersScreen “marked sent” moment)', () => {
  // Marking a letter sent decides, in one step, what date the statutory clock
  // runs from. Two ways to get that wrong, both of which put a citation on a
  // date the law never gave:
  //   1. Anchoring a FOUNDING send on the UTC day — after 5pm Pacific that is
  //      tomorrow, so the due date lands a day late.
  //   2. Anchoring a RE-SEND on today — the tracker still counts from the
  //      original ask, so one request showed two statutory dates weeks apart.
  // clockAnchorFor owns that decision, so both are pinned here.
  const SENT_AT = new Date(2026, 8, 6, 18, 30); // Sep 6 2026, 6:30pm local

  it('a founding send anchors on the family’s local day, not the UTC day', () => {
    // In Los Angeles the UTC slice of this instant is already 2026-09-07 —
    // that is the regression. In Ho Chi Minh City the two agree, so the
    // tz-west project is the one this bites in.
    expect(clockAnchorFor(null, SENT_AT)).toBe('2026-09-06');
    const dl = deadlineFor('ipp_meeting', clockAnchorFor(null, SENT_AT), SENT_AT)!;
    expect(dl.dueOn).toBe('2026-10-06');
    expect(dl.daysRemaining).toBe(30);
  });

  it('a re-send does NOT restart the clock of the request it joins', () => {
    // Asked Aug 1; re-sending the same open ask on Sep 6 keeps the Aug 1
    // clock — which, by then, is long overdue. Anchoring on the send day
    // instead showed a comfortable Oct 6 beside the tracker's Aug 31.
    const joined = { requested_on: '2026-08-01' };
    expect(clockAnchorFor(joined, SENT_AT)).toBe('2026-08-01');
    const dl = deadlineFor('ipp_meeting', clockAnchorFor(joined, SENT_AT), SENT_AT)!;
    expect(dl.dueOn).toBe('2026-08-31');
    expect(dl.overdue).toBe(true);
  });

  it('the celebration and the Request Tracker cite the same date, always', () => {
    // The tracker computes from the stored row; the sent moment computes from
    // the anchor. For every request either could be looking at, they agree.
    for (const requested_on of ['2026-08-01', '2026-09-06', '2026-01-05']) {
      const celebrated = deadlineFor('ipp_meeting', clockAnchorFor({ requested_on }, SENT_AT), SENT_AT);
      const tracked = deadlineFor('ipp_meeting', requested_on, SENT_AT);
      expect(celebrated?.dueOn).toBe(tracked?.dueOn);
      expect(celebrated?.overdue).toBe(tracked?.overdue);
    }
  });

  it('holds for the 15-day assessment-plan clock', () => {
    const dl = deadlineFor('iep_evaluation', clockAnchorFor(null, SENT_AT), SENT_AT)!;
    expect(dl.dueOn).toBe('2026-09-21');
    expect(dl.daysRemaining).toBe(15);
  });
});
