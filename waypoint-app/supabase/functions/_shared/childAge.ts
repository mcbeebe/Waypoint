/**
 * A child's age in whole years, read on a real calendar.
 *
 * This exists because `ai-proxy` computed it twice, inline, and got it wrong
 * twice in the same five lines:
 *
 * ```js
 * const birth = new Date(child.date_of_birth);
 * let years = now.getFullYear() - birth.getFullYear();
 * if (now.getMonth() < birth.getMonth()) years--;
 * ```
 *
 * 1. `date_of_birth` is a Postgres `date` — a calendar day with no instant
 *    and no zone. `new Date('2023-07-01')` parses it as UTC MIDNIGHT, which
 *    is 30 June 17:00 in California, so the birth month reads as June. A
 *    1 January birthday reads as 31 December of the PREVIOUS YEAR.
 * 2. The comparison never looks at the day of the month, which is wrong in
 *    every timezone on Earth: a child born on the 20th is counted a year
 *    older from the 1st of their birth month, nearly three weeks early.
 *
 * Neither is cosmetic here. This number goes into the model's context, and
 * age is the gate on the advice that comes back: Early Start is 0–3, the
 * Part C → Part B transition is at 3, Lanterman eligibility runs to 22. A
 * child reported as 3 three weeks early is told they have aged out of Early
 * Start while they are still entitled to it.
 *
 * **This must agree with `ageFromDob` in `src/lib/eligibility.ts`** — the
 * app-side twin, which the app fixed while this copy was left behind. They
 * cannot share a module: Deno has no `@/` alias and nothing under
 * `supabase/functions/` imports outside that directory today, which is the
 * arrangement the Supabase bundler is known to deploy. So agreement is
 * pinned by a parity test instead of by a shared import — see
 * `src/lib/edgeChildAge.test.ts`, which runs both over the same matrix and
 * fails if either drifts.
 *
 * Pure — no Deno globals, no I/O, no imports — which is what lets the vitest
 * projects reach it from `src/` at all. That is deliberate: everything in
 * this directory is excluded from `tsconfig.json` and deploys to production
 * on merge, so logic that CAN be written to be testable from `src/` should
 * be. The tests deliberately live over there rather than beside this file,
 * because `supabase functions deploy` uploads this tree and a stray
 * `vitest` import in it would be a deploy hazard no CI here could catch.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a Postgres `date` on the local calendar rather than as UTC midnight.
 *
 * Mirrors `parseDateLocal` in `src/lib/dateOnly.ts`: a bare `YYYY-MM-DD`
 * becomes local midnight of exactly that day; anything else is a real
 * instant and is parsed as-is.
 */
function parseDateLocal(value: string): Date {
  const m = DATE_ONLY.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/**
 * Age in whole years from an ISO date of birth, read on the LOCAL calendar;
 * `null` when unknown or unparsable.
 *
 * Negative for a future date of birth — callers that gate on age should
 * clamp if that matters to them. (Same contract as the app-side twin.)
 *
 * @param dob `date_of_birth` as stored — `YYYY-MM-DD`, or null.
 * @param now Clock to read against; injectable so the suites can pin it.
 */
export function ageFromDob(
  dob: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!dob) return null;
  const birth = parseDateLocal(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  return years;
}
