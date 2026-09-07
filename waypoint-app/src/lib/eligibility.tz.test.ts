/**
 * A child's age, computed on the family's calendar.
 *
 * `date_of_birth` is a Postgres `date` — no time, no zone. `new Date(dob)`
 * parses it as UTC MIDNIGHT, which is the previous local evening everywhere
 * west of Greenwich: the birthday appears one day early, so the age — and
 * every phase gate and eligibility rule keyed on it — flips a day before the
 * actual birthday. The Journey Map's "You are here" moved a phase early; an
 * age-gated benefit card could switch the same way.
 *
 * This file runs under both tz projects (Asia/Ho_Chi_Minh and
 * America/Los_Angeles — see vitest.config.ts). Fixtures are built from LOCAL
 * date components, so every assertion holds in both zones; the west run is
 * the one that bites on the old UTC parse.
 */
import { describe, it, expect } from 'vitest';
import { ageFromDob } from './eligibility';

describe('ageFromDob reads the dob on the local calendar', () => {
  it('runs this file OFF UTC, or it proves nothing', () => {
    expect(new Date(2026, 8, 5).getTimezoneOffset()).not.toBe(0);
  });

  it('the day BEFORE the birthday, the child has not aged yet', () => {
    // Born Sep 6 2020; on the local afternoon of Sep 5 2026 the child is
    // still 5. The UTC parse made this 6 in Los Angeles — a day early.
    expect(ageFromDob('2020-09-06', new Date(2026, 8, 5, 12, 0))).toBe(5);
  });

  it('the age turns on the birthday itself, from local midnight', () => {
    expect(ageFromDob('2020-09-06', new Date(2026, 8, 6, 0, 30))).toBe(6);
    expect(ageFromDob('2020-09-06', new Date(2026, 8, 6, 23, 30))).toBe(6);
  });

  it('a late-evening "now" does not borrow tomorrow', () => {
    // 11:30pm local on Sep 5 is already Sep 6 in UTC for a western family —
    // the age still must not turn until the local birthday.
    expect(ageFromDob('2020-09-06', new Date(2026, 8, 5, 23, 30))).toBe(5);
  });

  it('a Jan 1 birthday holds across the year boundary', () => {
    expect(ageFromDob('2021-01-01', new Date(2026, 11, 31, 23, 0))).toBe(5);
    expect(ageFromDob('2021-01-01', new Date(2027, 0, 1, 1, 0))).toBe(6);
  });

  it('still answers null for unknown or unparsable dobs', () => {
    expect(ageFromDob(null)).toBeNull();
    expect(ageFromDob(undefined)).toBeNull();
    expect(ageFromDob('not-a-date')).toBeNull();
  });
});
