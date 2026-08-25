# Resource Stack & Visual Journey — Plan (Aug 25, 2026)

## Why now

Owner feedback (Aug 2026 rounds): "How the System Works" is static and users get
stuck; the Journey isn't actionable enough; SDP is elevated but families still
don't see **what they could be getting** or the order to get it in. Undivided —
the strongest content competitor — wins on exactly this: numbered step guides,
expert-tip callouts, per-step "what you get," and every article linking to a
goal the parent can act on. We already have better action machinery (letters,
tracker, clocks, citations); what's missing is **one visual mental model that
sequences it**.

That model is the **Resource Stack**: California benefits for a disabled child
are not a menu, they're a stack — each layer funds different things, each layer
unlocks or protects the next, and the legal "generic services first" rule
(spending plans can't buy what IHSS/Medi-Cal/school must provide, W&I §4685.8)
means **stack order is legal strategy, not preference**.

A second forcing function: DDS directive **D-2026-SelfDeterminationProgram-002**
(issued Mar 24, 2026, effective Apr 1, 2026) redefined SDP steps 1–2 — a
two-part SCDD-only orientation with certificates and a mandatory 4-item
service-coordinator hand-off. Older guides (including some of our copy) are now
out of date. Being the app that's current on this directive is a trust win.

## The Resource Stack (product concept)

Six canonical layers, in dependency order. Each layer carries: **status for this
family** (secured / in progress / unlockable / locked-by / later), **what it
gets you**, **statutory cite + reviewed date**, **the dependency that gates it**,
and **the lever** (letter template / tracker clock / journey step) that advances
it.

| # | Layer | Gets you | Cite | Gated by | Lever |
|---|-------|----------|------|----------|-------|
| 1 | School (IEP/504) | FAPE: therapies, aide, placement at no cost | IDEA, Ed Code §56321 | age 3–22 | assessment_request letter, 15-day clock |
| 2 | Regional Center (IPP) | Respite, behavior, family services — no income test | Lanterman, W&I §4512/§4646 | eligibility | intake letters, 60-day clock |
| 3 | Medi-Cal (institutional deeming) | Health coverage ignoring parent income; unlocks federal funding + IHSS | W&I §14182 / HCBS waiver | RC/waiver enrollment | deeming request via SC |
| 4 | IHSS | Paid caregiving hours (incl. protective supervision) | W&I §12300 | Medi-Cal | county application + SC letter |
| 5 | SDP individual budget | Family-directed budget for the **gaps** after 1–4 | W&I §4685.8 | RC active + steps 0–8 below | SDP journey (this plan) |
| 6 | SSI | Monthly cash ($994 FBR 2026 + CA supplement) | SSA COLA 2026 | household income until 18; **flips at 18** | age-based insight |

Two rules the stack view must teach without prose:
- **Order matters legally**: the SDP spending plan is built around what layers
  1–4 already cover — so do IHSS *before* certifying a budget.
- **Step 0 matters financially**: the SDP budget is based on the last 12 months
  of purchase-of-service spend (adjustable for "prior needs not addressed in the
  IPP") — fix the IPP **before** anyone calculates a budget.

## The SDP Journey — steps 0–8 (content model)

Verified sequence (D-2026-SDP-002 + DDS SDP page):

0. **Fix the IPP first** — get unmet needs written in and authorized; budget is
   derived from recent POS spend. *(New insight rule: rc=active + no SDP case →
   surface this before orientation.)*
1. **Orientation Part A + Part B** — two 2-hour sessions, SCDD is the sole
   statewide provider, virtual, 12 languages; parent/guardian attends for a
   minor; certificate after each part. *(Effective 4/1/2026.)*
2. **Hand both certificates to the service coordinator** — mandatory hand-off of
   four items: current IPP copy, SDP transition-supports info, FMS info, budget
   process steps. **Ask for all four in writing** → letter template.
3. **PCP + Independent Facilitator** (optional, RC-funded in transition) — 024
   ($1,000 PCP) + 099 (40h transition supports). *This is Waypoint's paid lane.*
4. **Choose the FMS** — the only required vendor; RC pays it **outside** the
   budget; three models (Bill Payer / Sole Employer / Co-Employer).
5. **IPP meeting sets the individual budget** — can't exceed traditional cost;
   appeal rights if the team disagrees.
6. **Write the spending plan; RC certifies** — family writes it; can't buy
   generic-available services; provider choice respected.
7. **Medi-Cal + SDP waiver enrollment** — runs in parallel (deeming path).
8. **Live in it** — non-vendored providers OK, monthly FMS reports, leave
   anytime.

### Required content updates to existing code (directive compliance)

- `sdpStages.ts` / `SDP_PIPELINE`: orientation stage becomes two-part
  (Part A → Part B → certificates) with SCDD-only note.
- `lettersCatalog.ts` `sdp_info_request.defaultRequest`: ask for SCDD two-part
  orientation registration info **and** the four hand-off items of step 2 —
  not the old "orientation referral."
- `processMap.ts` SDP fork copy + `sentNext.ts` expectations: cite
  D-2026-SDP-002; expectations mention Part A before Part B.

## The three concepts (mockups on the canvas)

**Concept A — "Your Resource Stack" (full-screen view).** The stack as a
literal foundation diagram: secured layers solid at the bottom, the active
pursuit highlighted, locked layers dashed with "unlocked by ↓" chips, dollar/
hour value framing per layer, "using 2 of 6 layers" summary. Best mental-model
teacher; becomes the evolved Journey tab. Tradeoff: a new top-level surface —
biggest build.

**Concept B — "SDP Journey" stepper (per-layer detail).** Steps 0–8 as a
vertical timeline with done/current/locked states, per-step "you get" line,
citation, and exactly one CTA on the current step wired to the matching letter/
tracker. The March-2026 directive changes render as first-class (Part A/B
sub-checks, 4-item hand-off checklist). Drops into the existing ProcessMap SDP
fork with least navigation change. Tradeoff: teaches the SDP path, not the
whole stack.

**Concept C — "Waypoint noticed" stack insight (Home).** Extends the shipped
InsightCard pattern: mini stack-bar visualization (2 of 6 filled), one
plain-language observation ("Medi-Cal through institutional deeming would
unlock IHSS paid care hours"), one CTA into A or B, plus an Undivided-style
expert-tip bottom sheet for the "fastest unlock." Smallest build, highest
reach (every open lands on Home). Tradeoff: a teaser, not the model itself.

**Recommendation: ship C + B first (one increment each), A as the Journey-tab
evolution right after.** C reuses the InsightCard seam; B reuses ProcessMap
navigation + letters; A then has two proven feeders.

## Data model impact

- Children already carry `rc_status`, `iep_status`. Add (migration 043):
  `medi_cal_status`, `ihss_status`, `ssi_status` (enum: none/applied/active/
  not_eligible/unknown) — self-reported in onboarding + editable from the stack.
- SDP journey position derives from `sdp_cases.stage` where a facilitation case
  exists; else from a new lightweight `children.sdp_step` (0–8, nullable) the
  family self-reports by tapping "I'm here" on the stepper.
- Pure modules first, UI second: `resourceStack.ts` (deriveStack → layers with
  status/dependency/lever) and `sdpJourney.ts` (STEPS 0–8, deriveJourney) —
  trilingual via the `L(en, es, vi)` pattern, structural parity enforced in
  `localeParity.test.ts`, action keys registered in `actionKeys.ts`.

## Build phases (each auto-ships per CLAUDE.md when gates pass)

1. **Content + compliance** — `sdpJourney.ts`, `resourceStack.ts`, directive
   updates to sdpStages/letters/processMap/sentNext, tests. *(no UI risk)*
2. **Concept B** — JourneyStepper screen replacing the SDP fork detail;
   step-CTAs wired to letters + tracker; migration 043 + onboarding fields.
3. **Concept C** — stack insight on Home + expert-tip sheet.
4. **Concept A** — Resource Stack view as the Journey tab's new top level;
   entity rows map to layers.

## Editorial patterns to adopt from Undivided (and where we beat them)

Adopt: numbered steps with a one-line "why this matters"; expert-tip callouts;
per-step "what you could get"; every article/step ends in an action. Ours to
keep (they don't have these): statutory citations with reviewed-on dates on
every claim; the action is a **generated letter with a tracked legal clock**,
not a link; trilingual by construction; the AI insight that notices the missing
layer without being asked.
