/**
 * The half of the age bug that has nothing to do with timezones.
 *
 * `ai-proxy` counted a year older as soon as the birth MONTH arrived, never
 * looking at the day:
 *
 * ```js
 * if (now.getMonth() < birth.getMonth()) years--;
 * ```
 *
 * That is wrong under every clock on Earth, so it belongs in the plain
 * `logic` project rather than a tz suite. The timezone half is pinned
 * separately in `edgeChildAge.tz.test.ts`.
 *
 * Placed in `src/`, following `replyPush.mirror.test.ts` and
 * `gmailMime.test.ts`, which already reach across this boundary the same way.
 * Everything under `supabase/functions/` is uploaded by `supabase functions
 * deploy`, so a `.test.ts` importing `vitest` in that tree is a deploy-time
 * hazard nothing here could catch — there is no Deno in this toolchain.
 * Reaching across from this side costs one relative import and risks nothing.
 *
 * Side benefit, shared with those two: importing `childAge.ts` pulls it into
 * the TypeScript program, so it is typechecked despite `tsconfig.json`'s
 * `exclude: ["supabase/functions"]`.
 */
import { describe, it, expect } from 'vitest';
import { ageFromDob } from '../../supabase/functions/_shared/childAge';
import { ageFromDob as appAgeFromDob } from './eligibility';

describe('ageFromDob counts the day of the month, not just the month', () => {
  it('is still 2 on the morning of the birthday month', () => {
    // Born 20 June 2023; on 5 June 2026 the child is 2 for another fortnight.
    // The old inline version returned 3 here — the regression, exactly.
    expect(ageFromDob('2023-06-20', new Date(2026, 5, 5))).toBe(2);
  });

  it('is still 2 the day BEFORE the birthday', () => {
    expect(ageFromDob('2023-06-20', new Date(2026, 5, 19))).toBe(2);
  });

  it('turns 3 on the birthday itself, not before', () => {
    expect(ageFromDob('2023-06-20', new Date(2026, 5, 20))).toBe(3);
  });

  it('is 3 the day after', () => {
    expect(ageFromDob('2023-06-20', new Date(2026, 5, 21))).toBe(3);
  });

  it('crosses the Early Start boundary on the right day', () => {
    // Turning 3 is the Part C → Part B transition. Being told it happened
    // three weeks early is being told you have aged out of a service you
    // are still entitled to.
    const dob = '2023-09-15';
    expect(ageFromDob(dob, new Date(2026, 8, 14))).toBe(2);
    expect(ageFromDob(dob, new Date(2026, 8, 15))).toBe(3);
  });
});

describe('ageFromDob edge cases', () => {
  it('returns null for a missing date of birth', () => {
    expect(ageFromDob(null)).toBeNull();
    expect(ageFromDob(undefined)).toBeNull();
    expect(ageFromDob('')).toBeNull();
  });

  it('returns null rather than NaN for an unparsable one', () => {
    // The old inline version rendered this into the prompt as
    // "NaN years old".
    expect(ageFromDob('not-a-date')).toBeNull();
  });

  it('is 0 for an infant', () => {
    expect(ageFromDob('2026-01-10', new Date(2026, 5, 5))).toBe(0);
  });

  it('goes negative for a future date of birth, per the documented contract', () => {
    expect(ageFromDob('2027-01-01', new Date(2026, 5, 5))).toBe(-1);
  });
});

/**
 * The anti-drift guard.
 *
 * Deno has no `@/` alias, and nothing under `supabase/functions/` imports
 * outside that directory — the arrangement the Supabase bundler is known to
 * deploy — so this module and `src/lib/eligibility.ts` cannot share code.
 * Two implementations is what let the Edge Function keep a stale copy of
 * logic the app had already fixed.
 *
 * They cannot share an import, so they share a test instead: same matrix,
 * same expected answers, run against both. If either drifts, this fails.
 */
describe('parity with the app-side twin (src/lib/eligibility.ts)', () => {
  const DOBS = [
    '2023-06-20', // mid-month
    '2023-01-01', // the year-boundary case the UTC parse breaks
    '2023-12-31',
    '2020-02-29', // leap day
    '2026-01-10',
    '2027-01-01', // future
  ];
  const NOWS = [
    new Date(2026, 0, 1, 0, 30), // first minutes of the year
    new Date(2026, 5, 5, 12, 0),
    new Date(2026, 5, 20, 23, 30), // last minutes of a birthday
    new Date(2026, 11, 31, 23, 59),
    // Adjacent to the awkward birthdays above. Without these the leap-day and
    // 31 December entries only ever hit the "some other month" branch, and a
    // `now.getDate() < Math.min(birth.getDate(), 28)` regression passed the
    // entire suite in both timezones.
    new Date(2026, 1, 27, 12, 0), // 27 Feb — before a 29 Feb birthday
    new Date(2026, 1, 28, 23, 30), // 28 Feb — the day it lands on in a non-leap year
    new Date(2026, 2, 1, 0, 30), // 1 Mar — just after
    new Date(2026, 11, 29, 12, 0), // 29 Dec — before a 31 Dec birthday
    new Date(2026, 11, 30, 23, 30), // 30 Dec — the day before
  ];

  it('agrees with the app on every combination', () => {
    for (const dob of DOBS) {
      for (const now of NOWS) {
        expect(
          ageFromDob(dob, now),
          `dob=${dob} now=${now.toISOString()}`,
        ).toBe(appAgeFromDob(dob, now));
      }
    }
  });

  it('agrees on the null cases too', () => {
    expect(ageFromDob(null)).toBe(appAgeFromDob(null));
    expect(ageFromDob(undefined)).toBe(appAgeFromDob(undefined));
    expect(ageFromDob('not-a-date')).toBe(appAgeFromDob('not-a-date'));
  });
});
