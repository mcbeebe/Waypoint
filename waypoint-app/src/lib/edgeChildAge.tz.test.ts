/**
 * The timezone half of the age bug, pinned in both directions.
 *
 * `date_of_birth` is a Postgres `date`. `new Date('2023-01-01')` parses it as
 * UTC midnight, which west of Greenwich is 31 December of the PREVIOUS YEAR.
 * East of Greenwich the two agree, so — like the LettersScreen clock tests —
 * this is a regression the `tz-west` project is the one to catch, while `tz`
 * proves the fix did not break the other direction.
 *
 * The expectation is re-derived from plain calendar NUMBERS rather than by
 * parsing a string, so this cannot pass itself: if `ageFromDob` ever goes
 * back to `new Date(dob)`, the left and right sides stop agreeing west of
 * Greenwich.
 */
import { describe, it, expect } from 'vitest';
import { ageFromDob } from '../../supabase/functions/_shared/childAge';

/**
 * Age from birth components, with no string parsing anywhere — the
 * independent oracle.
 */
function expectedAge(by: number, bm: number, bd: number, now: Date): number {
  let years = now.getFullYear() - by;
  const before =
    now.getMonth() < bm - 1 ||
    (now.getMonth() === bm - 1 && now.getDate() < bd);
  if (before) years--;
  return years;
}

describe('a child’s age is read on the family’s calendar', () => {
  it('runs this file OFF UTC, or it proves nothing', () => {
    // Guard the guard: at UTC the naive parse and the honest one agree, so
    // every assertion below would be vacuous. Direction-agnostic, because
    // this same file runs in `tz` (UTC+) and `tz-west` (UTC−).
    expect(new Date(2026, 0, 1).getTimezoneOffset()).not.toBe(0);
  });

  it('a 1 January birthday does not read as the previous year', () => {
    // The sharp case. Parsed as UTC, '2023-01-01' is 31 Dec 2022 in
    // California — a birth YEAR too early. On 31 Dec 2026 that returns 4
    // for a child who is 3 until tomorrow.
    const now = new Date(2026, 11, 31, 18, 0);
    expect(ageFromDob('2023-01-01', now)).toBe(expectedAge(2023, 1, 1, now));
    expect(ageFromDob('2023-01-01', now)).toBe(3);
  });

  it('holds across the turn of the year itself', () => {
    const newYear = new Date(2027, 0, 1, 0, 30);
    expect(ageFromDob('2023-01-01', newYear)).toBe(
      expectedAge(2023, 1, 1, newYear),
    );
    expect(ageFromDob('2023-01-01', newYear)).toBe(4);
  });

  it('a 1st-of-the-month birthday keeps its month', () => {
    // Parsed as UTC, '2023-07-01' is 30 June west of Greenwich, moving the
    // birthday into the previous month.
    const now = new Date(2026, 5, 15, 20, 0); // 15 June 2026, evening
    expect(ageFromDob('2023-07-01', now)).toBe(expectedAge(2023, 7, 1, now));
    expect(ageFromDob('2023-07-01', now)).toBe(2);
  });

  it('is stable across the whole day, not just the morning', () => {
    // Same calendar day, both edges of it: the answer must not change when
    // the UTC day flips underneath the family.
    const dob = '2023-09-15';
    const early = new Date(2026, 8, 15, 0, 30);
    const late = new Date(2026, 8, 15, 23, 30);
    expect(ageFromDob(dob, early)).toBe(ageFromDob(dob, late));
    expect(ageFromDob(dob, early)).toBe(3);
  });

  it('handles a leap-day birthday', () => {
    const now = new Date(2026, 2, 1, 12, 0); // 1 Mar 2026
    expect(ageFromDob('2020-02-29', now)).toBe(expectedAge(2020, 2, 29, now));
  });
});
