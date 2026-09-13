# Waypoint — Calendar-Day Audit: What Is Left

**Date:** 8 September 2026
**Status:** adopted
**Supersedes:** —
**Superseded-by:** —

**8 September 2026.** A full sweep of the repo for the bug class that eight PRs
closed between 5–8 September (#217, #227, #228, #232, #233, #235, #236, #237):
a calendar day derived through UTC instead of the family's own calendar. This
is the list so the next session starts from findings rather than rediscovering
them.

**Scoreboard: every calendar-day derivation in active code checked → 2 real
bugs (both in one Edge Function file, both unreachable by CI) · 1 cosmetic ·
1 stale test assertion · 5 deliberate lines across 3 files · 2 lines in 1
orphaned file · 2 build scripts out of scope.**

---

## 0. Why this document exists

Four separate sessions independently fixed the same bug class in the same
week. Every merge conflict resolved on 8 September was **duplicate work, not
disagreement** — two correct fixes for one bug, three times over. One duplicate
(`sendClock` vs `clockAnchorFor`) arrived with a full parallel test suite that
had to be discarded.

That is a coordination cost, not a code defect, and it will recur on the next
bug class that is spread thin across many files. The mitigation is this list.

---

## 1. The rule, stated once

Two mirror-image mistakes. Both are invisible at UTC, which is why they
survived so long:

| | Wrong | Right | Fails where |
|---|---|---|---|
| **A. instant → calendar day** | `d.toISOString().slice(0, 10)` | `localDayISO(d)` | West of Greenwich, every evening. After 17:00 Pacific the UTC day is already tomorrow. |
| **B. calendar day → instant** | `new Date('2026-08-20')` | `parseDateLocal('2026-08-20')` | West of Greenwich, always. A date-only string parses as **UTC midnight**, i.e. the previous afternoon in California. |

Both helpers live in `waypoint-app/src/lib/dateOnly.ts`.

Every Postgres `date` column is a calendar day with no instant and no zone:
`due_date`, `requested_on`, `decided_on`, `date_of_birth`, `issued_on`,
`paid_on`, `captured_on`, `remeasure_due_on`, `period_start`, `period_end`.
Comparing one against a UTC-derived day is always pattern A. Parsing one with
`new Date()` is always pattern B.

A full `toISOString()` with no slicing is an **instant**, not a day. Those are
correct and appear throughout (`updated_at`, `sent_at`). Do not "fix" them.

---

## 2. Open — ranked

### 2.1 P0 · Child age is computed twice, wrongly, in `ai-proxy`

`waypoint-app/supabase/functions/ai-proxy/index.ts:425` and `:1051` — the same
five lines, duplicated:

```js
const birth = new Date(child.date_of_birth);
const now = new Date();
let years = now.getFullYear() - birth.getFullYear();
if (now.getMonth() < birth.getMonth()) years--;
```

**Two independent defects in one expression.**

*Bug B (timezone).* `date_of_birth` is a Postgres `date`. `new Date('2023-07-01')`
is UTC midnight — 30 June, 17:00 in California. The child's birth month reads
as June. For a **1 January** birthday it reads as 31 December of the *previous
year*.

*Bug 2 (plain arithmetic, wrong in every zone).* The comparison never looks at
the day of the month. A child born on the 20th is counted a year older from
the **1st** of their birth month — nearly three weeks early.

**Worked example.** Child born 2023-06-20, today 2026-06-05. True age 2. This
code returns **3**, and has since the file was written.

**Why it matters here specifically.** Both copies feed the value straight into
the model's context — `"The parent has a child who is N years old."` at :429,
`"N years old"` at :1055. Age is the gate on the advice
this proxy generates: Early Start is 0–3, the Part C → Part B transition is at
3, Lanterman eligibility runs to 22. A child reported as 3 three weeks early is
told they have aged out of Early Start while they are still entitled to it.

**The correct implementation already exists** —
`waypoint-app/src/lib/eligibility.ts:297`, `ageFromDob()`. It uses
`parseDateLocal` and compares month *and* day. The Edge Function is a stale
hand-copy of logic that was fixed on the app side.

**Why nothing caught it.** Per CLAUDE.md, the eight Edge Functions are excluded
from `tsconfig.json`, have no tests, and `deploy-edge-functions.yml` ships them
to the production project on merge to `main`. `npx tsc --noEmit`, `eslint` and
all four vitest projects are structurally blind to this file.

**Note before fixing:** Edge Functions run on Deno with no `@/` alias and no
access to `src/`. `ageFromDob` cannot simply be imported — it has to be shared
via `functions/_shared/`, or reimplemented and pinned by a test that can
actually reach it. Deciding which is the real work; the arithmetic is five
lines.

This is family-facing advice logic in an Edge Function, so it is a **double
stop** under CLAUDE.md — `/adversary` plus the owner, and it cannot ride the
draft-flow grant.

### 2.2 P2 · Invite expiry renders the UTC day

`waypoint-app/supabase/functions/family-invite/index.ts:84`

```js
return `${m[d.getUTCMonth()]} ${d.getUTCDate()}`;
```

`expires_at` is a real timestamp, so reading it in UTC is at least
self-consistent — but the string lands in an email a family reads on their own
calendar. An invite expiring `2026-09-16T02:00Z` is shown as "September 16"
when, for a California recipient, the evening of 15 September is the last
usable one. Low stakes, family-facing copy, same file-class caveat as 2.1.

### 2.3 P3 · A stale assertion in `transitionHours.test.ts:61`

```js
expect(s.forecastCapDate).toBe(new Date(2026, 9, 2).toISOString().slice(0, 10));
```

The comment above it explains the workaround: a hard-coded `'2026-10-02'` used
to read as the prior UTC day east of Greenwich. That is **no longer true** —
#233 changed the implementation to `localDayISO(d)`
(`transitionHours.ts:65`), so the literal is now correct in every zone and the
workaround is obsolete.

It passes today only because the `logic` project runs at the machine's
timezone. Pin `logic` anywhere east of Greenwich and it fails. Replace the
right-hand side with the literal `'2026-10-02'` and delete the stale comment.
`transitionHours.tz.test.ts` (added by #233) already covers the real behaviour
in both directions.

### 2.4 Dead code, not a bug · `waypoint-app/waypoint-web.html`

Two pattern-A sites (`:1387`, `:1471`). The file is referenced **nowhere** in
the repo and appears in no workflow; `docs/` is the deployed Pages MVP. It is
an orphaned "Web MVP" prototype. The right move is archival under the
supersession convention, not a fix. Confirm with the owner before removing.

---

## 3. Deliberate — do not "fix" these

Three sites look exactly like pattern A and are correct on purpose. They form
**one cross-referenced contract**; changing any one in isolation breaks the
paywall.

| Site | Why |
|---|---|
| `src/lib/entitlements.ts:45` | `period_end` compares against the family's **local** day (Premium runs through their own midnight). `period_start` compares against the **later** of local and UTC, so an evening purchase is Premium immediately. Both resolve doubt in the family's favour. |
| `supabase/functions/stripe-webhook/index.ts:114,124` | Writes the UTC day on purpose; `resolveEntitlement` is built to accept it. |
| `supabase/functions/ai-proxy/index.ts:371–372` | Server has no idea of the family's zone, so it accepts any day an honest device could be on (UTC±1). Generous by at most a day at a boundary, never stricter than what the family's screen shows. |

All three carry comments saying "change one, change the other." They are the
one part of this bug class that was handled deliberately from the start.

---

## 4. Out of scope

- `waypoint-site/scripts/new-content.mjs:31` — stamps `today` into new content
  frontmatter on the author's own machine at authoring time. Harmless.
- `waypoint-site/scripts/refresh-due.mjs` — internally UTC-consistent
  (`Date.UTC` throughout, including `TODAY`). Correct by design.
- `Archive/Retired-Surfaces/gas-mvp/` — retired 7 September 2026; not to be
  fixed, updated, or ported.
- Test files asserting *about* the bug in prose comments (`dateOnly.tz.test.ts`,
  `deadlineStatus.tz.test.ts`, `requestClocks.tz.test.ts`). Those are
  documentation of the trap, and they are the reason it stays closed.

---

## 5. What would stop the recurrence

Ranked by cost, not enthusiasm — the first is nearly free and closes most of it:

1. **A lint rule.** `no-restricted-syntax` banning
   `toISOString().slice(0,10)` / `.split('T')[0]` in `waypoint-app/src/`, with
   an inline-disable for the three deliberate sites in §3. Turns a
   four-session rediscovery into a CI failure on the line that introduces it.
2. **Bring the Edge Functions into a typecheck.** They are the only place both
   remaining real bugs live, and the only code that ships to production with no
   gate at all. §2.1 is the second family-facing defect found there this week.
3. **Search before fixing a bug class that spans files.** Every conflict on
   8 September was two sessions fixing one bug. A one-line grep first would
   have found the other session's work.
