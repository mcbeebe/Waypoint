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
import { localDayISO } from './dateOnly';

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

describe('the send-day anchor (LettersScreen / Request Tracker founding row)', () => {
  // Marking a letter sent anchors a statutory clock on TODAY. The screen used
  // to slice the UTC string — which, after 5pm Pacific, is tomorrow: the row
  // said the family asked on a day they hadn't lived yet, and the citation's
  // due date arrived one day later than the law allows. The anchor must be
  // the family's local calendar day.
  const SENT_AT = new Date(2026, 8, 6, 18, 30); // Sep 6 2026, 6:30pm local

  it('anchors on the local calendar day of the send, in any timezone', () => {
    // In Los Angeles the UTC slice of this instant is 2026-09-07 — the
    // regression this pins. In Ho Chi Minh City the two agree; the west
    // project is the one this assertion bites in.
    expect(localDayISO(SENT_AT)).toBe('2026-09-06');
  });

  it('gives the 30-day IPP clock its lawful due date from the send day', () => {
    const dl = deadlineFor('ipp_meeting', localDayISO(SENT_AT), SENT_AT)!;
    expect(dl.dueOn).toBe('2026-10-06');
    expect(dl.daysRemaining).toBe(30);
    expect(dl.overdue).toBe(false);
  });

  it('holds for the 15-day assessment-plan clock', () => {
    const dl = deadlineFor('iep_evaluation', localDayISO(SENT_AT), SENT_AT)!;
    expect(dl.dueOn).toBe('2026-09-21');
    expect(dl.daysRemaining).toBe(15);
  });
});
