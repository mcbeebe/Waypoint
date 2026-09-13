/**
 * A child's age in whole years, for the context this function hands the model.
 *
 * `ai-proxy` computed this twice, inline, and got it wrong twice in the same
 * five lines:
 *
 * ```js
 * const birth = new Date(child.date_of_birth);
 * let years = now.getFullYear() - birth.getFullYear();
 * if (now.getMonth() < birth.getMonth()) years--;
 * ```
 *
 * **The bug that was reaching families** is the second line of that: the
 * comparison never looks at the day of the month, so a child born on the 20th
 * counted a year older from the 1st of their birth month — nearly three weeks
 * early, under every clock on Earth. Child born 2023-06-20, on 2026-06-05:
 * true age 2, that code returned 3.
 *
 * Not cosmetic. The number goes into the model's context, and age is the gate
 * on the advice that comes back: Early Start is 0–3, the Part C → Part B
 * transition is at 3, Lanterman eligibility runs to 22. A child reported as 3
 * three weeks early is told they have aged out of a service they are still
 * entitled to.
 *
 * ## What this does NOT fix, so nobody has to rediscover it
 *
 * `date_of_birth` is a Postgres `date` — a calendar day with no instant and
 * no zone — and `new Date('2023-07-01')` parses it as UTC midnight. On a
 * device that is a real bug (17:00 the previous evening in California), which
 * is why the app twin uses a local parse. **This function is not on a device.**
 * It runs on a Supabase Edge server that does not know the family's zone, so
 * `parseDateLocal` below reads the SERVER's calendar, and in production
 * (UTC) it returns exactly what `new Date(dob)` would. The local parse is
 * here for consistency with the app twin and so the parity test holds under
 * any runner — not because it moves the answer in production.
 *
 * The genuinely unfixed edge is `now`: it is the server clock. Between the
 * family's local midnight and the server's, the two disagree, so for a few
 * hours before every birthday this reports the higher number while the app
 * on the parent's phone reports the lower one. That is the same
 * server-doesn't-know-the-zone ambiguity the entitlement check in
 * `ai-proxy/index.ts` handles explicitly with a UTC±1 tolerance. Closing it
 * needs the client to send its zone, which is a contract change, not a patch.
 *
 * ## Why this is a copy
 *
 * `ageFromDob` in `src/lib/eligibility.ts` is the app-side twin, and this
 * must agree with it. They cannot share a module: Deno has no `@/` alias and
 * nothing under `supabase/functions/` imports outside that directory. This is
 * the same hand-copy-plus-parity-test arrangement already used for
 * `_shared/replyPush.ts` and `_shared/mime.ts`; agreement is pinned by
 * `src/lib/edgeChildAge.test.ts`, which runs both over one matrix and fails
 * if either drifts.
 *
 * Pure — no Deno globals, no I/O, no imports — which is what lets vitest load
 * it from `src/` at all. Keep it that way.
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a Postgres `date` on the running process's calendar rather than as
 * UTC midnight. Mirrors `parseDateLocal` in `src/lib/dateOnly.ts`.
 */
function parseDateLocal(value: string): Date {
  const m = DATE_ONLY.exec(value.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/**
 * Age in whole years from an ISO date of birth; `null` when unknown or
 * unparsable.
 *
 * Negative for a future date of birth — the app twin has the same contract.
 * Callers that put this in front of a person should refuse a negative rather
 * than render it; both `ai-proxy` call sites do.
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
