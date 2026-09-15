# 009 — The Adult Transition

**Date:** 2026-09-13 · **Status:** Open — plan for owner go, no code written
**Artifacts:** intent.md (this) → plan.md → PRs B1–B3
**Serves:** `ROADMAP.md` v2.0 · implements `Build-Plan-Items1-4-Sep2026.md`
workstream B, which implements `Product-Roadmap-Sep2026.md` item 1. Competitive
basis: `SpecialNeedsNavigator-Comparison-Sep2026.md` §6.

---

## Problem

**First, a correction to the document that proposed this.**
`Product-Roadmap-Sep2026.md` said the adulthood cluster is "mentioned everywhere
and owned nowhere," on a count of ~40 matches across eight files. Reading the
matches rather than counting them, that overstates it twice over:

- **Three** of those matches are a different sense entirely — the Lanterman
  eligibility criterion that a disability must *originate before age 18*. That
  is not the transition.
- The transition knowledge that does exist is **deliberate, not accidental**.
  `journeyActions.ts:185` already explains that SSI "at 18, is re-determined
  against adult criteria… avoids a gap in income and the Medi-Cal that can come
  with it." `:188` explains that conservatorship or supported decision-making
  "takes months to arrange, so families start well before the birthday" — and
  carries a comment recording that its matcher was *narrowed* from a broad
  `/18|adult|transition/` because that was over-matching adult neurology rows.
  Someone thought about this carefully.

So this is not a content vacuum. **It is knowledge with no spine and no clock.**
What is verified absent from `src/`:

1. **No age-keyed arc.** All seven journeys in `journeyMaps.ts` are
   diagnosis-shaped — Autism, PDA, ADHD, Intellectual Disability, SLD,
   Speech/Language, Cerebral Palsy. Transition guidance lives as narrative
   *inside* those stages ("include transition goals by age 16", "the legal
   questions… need attention"), so a family reads it only if they happen to be
   on that stage of that diagnosis.
2. **No clock, anywhere.** `requestClocks.ts` computes nothing for any
   adulthood date. The one age-aware module, `transitionHours.ts`, is about the
   SDP 099 forty-hour cap — an unrelated sense of the word.
3. **No registry-backed transition statute.** Not one of the obligations this
   arc would assert has an entry in `contentSources.ts`.
4. **No triage rung.** `homeTriage.ts`'s eight rungs have no age trigger, so
   nothing surfaces on Home as a birthday approaches.

**Why it matters.** Every family reaches this cliff, and the guidance is
time-shaped: a conservatorship alternative "takes months to arrange" and an SSI
redetermination arrives on a birthday. Guidance that is time-shaped and has no
clock is guidance a parent reads once, at the wrong moment.

**Why it is the right fight.** Adult transition is Special Needs Navigator's
centre of mass, and its architecture cannot do the one thing this needs — it has
no persistence, so it can explain the redetermination beautifully in a March
session and has no mechanism to raise it again in October. Undivided's dates are
decorative; its own two surfaces disagree by a day. Waypoint's entire engine is
dates that arrive. This is the one feature where the architecture *is* the
differentiator.

## Proposed outcome

An **age-keyed arc** — the first non-diagnosis journey in the app — that
sequences what already exists, attaches a verified statute to each obligation
that has one, and puts the two or three genuinely dated events on the same
clock machinery every other deadline in Waypoint runs on.

A parent of a 15-year-old opens Home and sees the transition item **without
searching for it**, with a citation they can tap.

## The shape

- **Consolidate before writing.** The `why` text in `journeyActions.ts` and the
  narrative in the seven journey stages is the first draft of this content. Lift
  and sequence it; do not re-author it. This materially lowers the content risk
  that made me size the feature at 4–6 weeks.
- **An age spine**, not a diagnosis spine — which is the one architectural
  decision in this initiative and the reason it clears the folder bar.
- **Clocks only where a date is real.** The SSI redetermination is a birthday.
  The IEP transition-plan requirement attaches to an age. Most of the rest is a
  *window* ("start months before"), and a window is not a deadline — rendering
  it as one would be the same false precision the repo already rejected when it
  fixed "a citation attached to a date the law never gave."
- **Registry first, prose second** (B2), because A2 is at this moment paying
  down exactly this debt and it must not be re-incurred in the same quarter.

## Constraints

- **No statute is asserted until it is in the registry.** This initiative names
  zero section numbers on purpose. I am not certain of the exact citations for
  the IEP transition-plan requirement, the SSA age-18 redetermination, or the
  DOR referral obligation, and inventing them is precisely the failure
  `statuteAudit.ts` was built last week to catch. Establishing them is B2, and
  `verifiedOn` needs a human.
- **Present the legal options; never give a legal opinion.** *(Owner decision,
  Sep 15 2026 — this supersedes the version of this bullet that said "supported
  decision-making is presented first," which was itself the kind of ranking the
  rule forbids.)*

  **Allowed:** naming every option that exists — conservatorship, limited
  conservatorship, supported decision-making, power of attorney,
  representative payee — describing factually what each one is, saying when the
  decision arrives and how long it takes, and routing to free credentialed help
  (OCRA is assigned to every Regional Center by statute).

  **Not allowed, in Waypoint's own voice:** ranking the options, calling one
  "lighter" or "most common," recommending an order to consider them in,
  describing how to file, or drafting an instrument for any of them.

  **The escape hatch is a citation, and the gate already enforces it.** If
  California law itself ranks the options — a court must consider less
  restrictive alternatives, say — then Waypoint may state that as a *fact about
  the law*, because it arrives with a registered authority behind it. What it
  may not do is assert the ranking unsourced. `statuteAudit.guard.test.ts`
  makes this mechanical: an uncited statute fails the build, so "we can say it
  if we can cite it" is enforced rather than remembered.
- **`request_type` is a `text … check (…)` constraint**
  (`037_family_requests.sql:15`). New clock types need a hand-applied migration
  — batch it with initiative C's (the Binder's) to spend one window, not two.
- **Schema + family-facing + tone-bearing** → `/adversary` on every PR, owner
  approval on every PR. The draft-flow standing grant does not reach here.

## Open questions — for the owner

1. ~~**Does this need a lawyer?**~~ **ANSWERED, Sep 15 2026.** The question was
   posed as a binary — get a credentialed read, or cut the legal-capacity
   content. The owner's answer is neither, and is better than both: *"It's OK to
   present the legal options, but NOT OK to give legal opinions."* The content
   stays and is constrained instead, per the rule in **Constraints** above.

   Applied immediately to the copy already shipped. Four lines were opinions in
   Waypoint's voice and are now neutral:

   | Was | Now |
   |---|---|
   | "Explore Supported Decision-Making **before defaulting to** conservatorship" | "Conservatorship and Supported Decision-Making are both options — compare them before 18" |
   | "Limited conservatorship **is most common for ID** — start 6–12 months before 18" | "Limited conservatorship and Supported Decision-Making are both options — allow 6–12 months before 18" |
   | "**Start conservatorship process** 6–12 months before age 18" | "Legal decision-making options take 6–12 months to arrange — start before 18" |
   | "Conservatorship — or **a lighter alternative like** supported decision-making — takes months" | "The options — conservatorship, limited conservatorship, supported decision-making, power of attorney — each take months" |

   Note what the second one was: an unsourced empirical claim ("most common for
   ID") that nudged families of children with intellectual disability toward the
   option that removes rights. That is the clearest case for the rule.

2. **How far past 18 does this go?** Conservatorship, SNTs, DOR and adult day
   programs each pull toward a much larger surface. I would cap v1 at **14–19**
   and treat everything after the school-exit date as out of scope.
3. **One arc or one per diagnosis?** I propose one shared arc. The transition
   obligations are set by age and system, not by diagnosis.

## Done when

- A family with a child aged 14–19 sees a transition item on Home they did not
  go looking for, and can tap its citation to see the authority and the date a
  human verified it.
- Every statute the arc asserts resolves in `contentSources.ts` — confirmed by
  the `statuteAudit.guard.test.ts` ratchet, whose `KNOWN_GAPS` list this
  initiative must not lengthen.
- The clocks that exist are real dates; the windows read as windows.
- `/adversary` memo in each PR, owner approval recorded.
