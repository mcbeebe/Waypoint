# 012 — The Adult Transition · build plan

**Date:** 2026-09-13 · **Status:** Open — for owner go
**Intent:** [`intent.md`](intent.md) · **Parent plan:** `Roadmap/Build-Plan-Items1-4-Sep2026.md` workstream B

Three PRs. Every one is `[owner]`: family-facing, tone-bearing, and — for B3 —
schema. `/adversary` memo in each.

**Both scope questions are answered (owner, Sep 15 2026).** Legal-capacity
content **stays**, under the rule *present the options, never give a legal
opinion* — see the intent's Constraints. The arc runs **ages 14 → school exit**,
and the upper bound is an event, not an age. B1 may start.

---

## B1 · The arc, on paper — ~3 days

**Deliverable:** the sequence and the mockups, no code.

1. **Harvest, don't author.** Pull every transition sentence that already
   exists — the two `why` rules at `journeyActions.ts:185` and `:188`, the
   narrative in the seven `journeyMaps.ts` stages ("include transition goals by
   age 16", "the legal questions… need attention before", the DOR and
   transition-coordinator lines). Put them in one table with their source, and
   mark each as *keep · rewrite · drop*. This is the content budget, and it is
   mostly already spent.
2. **Sequence by age**, 14 → school exit (owner, Sep 15: "stop at school exit").
   The upper bound is an EVENT, not an age — a student may exit at 18 with a
   diploma or stay to 22 on a certificate track, so the arc reads the exit date
   and never assumes the birthday. For each stage name the trigger (an age, a
   date, or a window), the obligation, who owes it, and what Waypoint can do
   about it in-app.
3. **Separate dates from windows.** A birthday is a date. "Start months before"
   is a window. The split decides what B3 builds and what it must *not* build —
   rendering a window as a deadline is the false precision `requestClocks.ts`
   already has a comment about rejecting.
4. **Mockups** in `Roadmap/mockups/` per the owner preference: the Home triage
   card at its calm and its urgent state, the arc screen, and the citation
   sheet reusing `Citation.tsx`.

**Exit:** owner approves the stage list, the date/window split, and the scope
question. Nothing merges before that.

---

## B2 · Registry before prose — ~1 week, gated on a human

**Deliverable:** `contentSources.ts` entries for every obligation B1 named.

The intent asserts **zero section numbers** on purpose. This is where they get
established, and the same rule that governs phase A2 governs here:
`verifiedOn` means a human opened the source and confirmed it says what we say
it says. An agent can draft the entry, propose the URL, and write the claim
line; it cannot sign it.

Use the same worksheet shape as
`Roadmap/Statute-Registry-Worksheet-Sep2026.md` — proposed citation, proposed
URL marked UNVERIFIED, and the exact sentence the app intends to rest on it — so
one sitting closes the whole set.

**The obligations needing a citation** (names, not numbers — numbers are B2's
output, not its input):

- the IEP transition-plan requirement and the age it attaches to;
- the SSA age-18 redetermination for SSI, and its Medi-Cal consequence;
- the Disabled Adult Child benefit and what it turns on;
- Department of Rehabilitation referral;
- the legal-capacity content, which **stays in scope** under the owner's rule.
  Note what it needs a citation *for*: naming the options needs none — those are
  facts about what exists. A citation is needed only if the arc ever wants to say
  California law RANKS them (a court must consider less restrictive alternatives,
  say). Without that citation the arc names the options and stops, which is a
  complete answer, not a degraded one.

**Exit:** every entry registered with a real `verifiedOn`; `KNOWN_GAPS` in
`statuteAudit.guard.test.ts` is not one line longer than it was.

---

## B3 · The clocks, the rung, the letters — ~2–3 weeks

**Deliverable:** the feature.

1. **Clocks** in `requestClocks.ts`, only for the real dates from B1. New
   `request_type` values need a **hand-applied migration** — the `text … check`
   constraint at `037_family_requests.sql:15`. **Batch this migration with
   initiative C (the Binder)** so the pending-migration queue grows by one
   window, not two. Coordinate before either PR opens.
2. **The age-keyed arc** in `journeyMaps.ts` — the first non-diagnosis journey.
   Expect the types to push back; that is the architectural decision from the
   intent surfacing as a compile error, which is the right place for it.
3. **A triage rung** in `homeTriage.ts`. The `TRIAGE_LADDER` array *is* the
   contract and its order is published, so inserting a rung is a deliberate
   change to a published algorithm — say where it sits and why in the PR.
   Pinned by `homeTriage.test.ts`, which also enforces the tone rule: Home
   states the status of an answer, never an actor who failed.
4. **Letters** in `lettersCatalog.ts`: DOR referral, transition-assessment
   request, records request. Ten of the existing 22 templates carry a
   pre-written `defaultRequest`; match that bar.
5. **Trilingual.** `localeParity.test.ts` enforces that es/vi differ from en in
   prose only — same keys, same citations, same lever refs. Budget for it in
   this PR rather than discovering it in CI.

**Exit:** a family with a child aged 14 up to school exit sees the item on Home unprompted, with
a tappable citation; every gate green; `/adversary` memo and owner approval on
the PR.

---

## What this plan will not do

- **Assert a statute it has not registered.** B2 gates B3. If the citations are
  not verified, the arc ships without the claim, not with an unverified one.
- **Turn a window into a deadline.** Most transition guidance is "start early,"
  and a countdown to an invented date is worse than a sentence.
- **Extend past the school-exit date.** Adult day programs, SNTs and the SDP
  adult pathway each deserve their own initiative.
- **Give a legal opinion.** The options get named and described; they never get
  ranked, recommended, or ordered in Waypoint's voice. The only way to say
  California law prefers one is to cite the law that says so — and the statute
  gate fails the build if that citation is not registered.
