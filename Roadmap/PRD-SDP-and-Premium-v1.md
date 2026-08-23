# PRD — SDP Facilitation + Consumer Premium (Options 1 & 2)

**Version 1.0 · 23 August 2026 · Status: Draft for founder review**
Builds on: `waypoint-app` @ `main` (34 migrations, ~30 screens), the Aug-16 requirements workbook (REQ IDs carried where valid), and the corrections in `Assumptions-Audit-Aug2026.md`. Supersedes the workbook's Phase-1 scope where they conflict.

---

## 1. What we are building, in one paragraph

Waypoint's family app becomes a free, eligibility-first funnel that converts California families into (a) **SDP facilitation clients** — Waypoint's first revenue, invoiced to the family's FMS post-enrollment and to the Regional Center during transition (codes 024/099, which requires a 099 vendorization) — and (b) **Premium subscribers** ($99–149/yr) for families who want the full toolkit without a facilitator. One codebase, one parent surface, two doors, with org tenancy and the consent framework underneath so every later channel (district, employer, platform) is additive.

**Corrections from the audit baked into this PRD (non-negotiable):**
- Waypoint **never appears as a provider on a spending plan it facilitates** (W&I §4685.8 statutory bar). The product blocks it; the pitch discloses it as a trust feature ("our only loyalty is to you").
- Transition-phase money (024 up to $1,000; 099 up to 40 hrs) is **Regional-Center-paid**; 099 requires a **099 vendorization** — a Phase-1a operational task, not an afterthought. Ongoing facilitation is FMS-invoiced from the family's budget.
- **Price is discovered, not assumed**: facilitation pricing is a per-family agreement captured in-product; the model's $1,200/yr is a hypothesis to test against 10 real families.
- No code-108 claims anywhere in family-facing content.

## 2. Goals & non-goals

**Goals (success = all four):**
1. One family taken from SDP orientation → RC-approved spending plan entirely in-product, and **one paid invoice** (FMS or RC) — the existence proof.
2. Funnel instrumented end-to-end: registered → eligibility result → offer viewed → booked ≥ **3%**, measured, with Spanish parity on the funnel screens.
3. Premium tier live (web checkout), converting ≥ **2%** of engaged free users at $99–149/yr.
4. Facilitator hours-per-family measured (validates the 35-vs-58 caseload question) and every served family has a dated outcome baseline.

**Non-goals (this PRD):** code-108/RC-funded services delivery (gated on DDS answers); district product; employer integrations; CalAIM; native IAP (web checkout first); multi-state; forum/community.

## 3. Users & personas

- **P1 · Maria — parent, new to the system** (Spanish-preferred, Medi-Cal, child 4, autism). Free user → SDP candidate. Needs: what is my child owed, in my language, in 3 minutes.
- **P2 · Devon — parent, IEP veteran** (commercially insured, child 9, SLD+ADHD). Free → Premium. Needs: IEP analysis, letters, deadline defense, records. Will pay ~$100/yr; will not pay $12/mo forever.
- **P3 · The facilitator** (founder initially, then hire #1). Needs: caseload triage, statutory clocks, artifact generation, billable-time capture without admin drag.
- **P4 · The owner** (founder). Needs: pipeline, receivables, funnel conversion, hours-per-family — on one screen.

## 4. Epics, user stories, acceptance criteria

### EPIC W-A · Foundations: roles, consent, tenancy *(carries REQ-101/102/103 + tenancy)*

- **A1.** As the owner, I can create staff accounts (facilitator, supervisor, admin) so staff sign in to a caseload, not a family dashboard.
  *AC:* role resolved from a `profiles`/`staff` table at login (conflict C-1(b)); a staff login never creates a `families` row; role change takes effect next request.
- **A2.** As a parent, I explicitly consent before any staff member can see my family, and I can revoke at any time.
  *AC:* revocation returns zero rows at the RLS layer for that staff member, immediately; consent record is dated and versioned.
- **A3.** As the platform owner, every staff-bearing table carries `organization_id` so a second org onboards with data, not code.
  *AC:* `organizations` table exists; all new tables FK to it; RLS helper `accessible_family_ids()` (SECURITY DEFINER, empty search_path — conflict C-2(b)) scopes owned + assigned + org.
- **A4.** As compliance owner, every staff read/write of family data is logged append-only.
  *AC:* actor, family, entity, action, timestamp; no app role can update/delete log rows.

### EPIC W-B · Eligibility-first funnel *(REQ-1101/1102/1103/1105, corrected)*

- **B1.** As Maria, within 3 minutes of onboarding I see what my child likely qualifies for, what it's worth, and the source of every claim.
  *AC:* output is an eligibility result (SDP, Regional Center services, SSI, CalABLE, IHSS — **no code-108 card**); each card carries statute + last-reviewed date; "likely eligible" vs "needs review" never a false binary; reading level ≈ 7th grade; renders fully in Spanish.
- **B2.** As Maria, when I'm SDP-eligible I see a plain-English funded offer: who pays, that it doesn't reduce my child's budget, that Waypoint never sells services onto my plan, and that I can decline and keep the free app.
  *AC:* "Who pays for this?" is a first-class section; conflict-of-interest independence statement present; decline path is a real button; free-forever promise adjacent to CTA.
- **B3.** As Maria, I book a first conversation in-app with a named facilitator, with language shown.
  *AC:* slot-pick (no calendar widget), confirmation + reminder; no email round-trip; `acquisition_source` captured silently.
- **B4.** As the owner, I can see the funnel: registered → result viewed → offer viewed → booked → became client, by source and language.
  *AC:* events fire on each step; a weekly funnel view exists; 3% booked threshold visible against actuals.

### EPIC W-C · SDP facilitation workspace *(REQ-201–207, 301–303, corrected)*

- **C1.** As the facilitator, I see one caseload view that tells me who needs attention today and why.
  *AC:* explainable ranking (deadline proximity, 099 burn, days since contact); "see how this is ranked" affordance; row states the reason; usable at 60 families in <1 minute.
- **C2.** As the facilitator, one screen per family shows SDP stage, statutory clocks, money, and next action.
  *AC:* 5-stage pipeline header; 099 hours as burn-rate forecast ("hits the cap ~Oct 3"), not just % used; 024 delivered-vs-$1,000; blocked actions visible and greyed with reason.
- **C3.** As the facilitator, I build the person-centered plan in-product and export it in the format the RC accepts *(code 024)*.
  *AC:* guided capture (strengths, preferences, goals, supports); resumable drafts; export accepted by RCEB in the pilot; facilitator time on it captured.
- **C4.** As the facilitator, I track 099 transition hours against the 40-hour cap with a hard stop and an extension-request path.
  *AC:* hour 41 cannot be logged without an approved extension record; warning at 80%; cap sourced from the July-2024 DDS guidance with provenance.
- **C5.** As the facilitator, I build a spending plan that validates against the certified budget and the live rate context, and **cannot add Waypoint (or the operating org) as a provider**.
  *AC:* money-denominated errors ("over by $2,140" + one-click remedy); categories sum to certified budget; adding the operating entity as a provider line is blocked with the statutory explanation; plan exports in RC-accepted format.
- **C6.** As the facilitator, I log time in under 60 seconds against a family and an activity type; the price for ongoing facilitation is the family's agreed price, recorded per family.
  *AC:* one canonical `service_events` model (conflict C-3(b): separate from appointments, linked); honest failure on error (no fake offline success); per-family `agreed_annual_price` drives invoices; hours-per-family per stage reportable.
- **C7.** As a served family, my facilitator captures my baseline at the start of service (not during onboarding).
  *AC:* services in place, unmet needs, coordination hours/wk, caregiver strain; dated; re-measure scheduled at 6/12 months (conflict C-10(b)).

### EPIC W-D · Getting paid *(REQ-302/303/304, corrected to dual payer path)*

- **D1.** As the owner, I generate the 099 vendorization packet and track its status — a Phase-1a gating task.
  *AC:* packet assembled from the company record per the DDS 099 checklist; status (draft → submitted → vendored) visible; blocking banner on 099 billing until vendored.
- **D2.** As the owner, I produce a compliant invoice to the right payer for each revenue type: RC (024 reimbursement, 099 hours) or FMS (ongoing facilitation at the family's agreed price).
  *AC:* `invoices.payer_type ∈ {regional_center, fms}`; every line traces to logged service events; FMS vendor-information form generated per FMS; aged receivables (30/60/90) on the same screen.
- **D3.** As the owner, annual facilitation re-invoices generate on the anniversary without manual work; failures alert.
  *AC:* first scheduled job in the codebase (Supabase cron); no silent lapse.
- **D4.** As the owner, one dashboard answers: pipeline value, invoiced vs paid, hours-per-family vs the model, funnel conversion.
  *AC:* the four Phase-1 kill-criteria metrics are first-class numbers with targets shown.

### EPIC W-E · Premium tier *(new; replaces the cut paywall with a corrected, web-first version)*

- **E1.** As Devon, I can see exactly what free includes forever and what Premium adds, and buy Premium on the web in under 2 minutes.
  *AC:* pricing page with feature table; Stripe (web/PWA) checkout — no native IAP in v1; $99/yr launch, $14.99/mo secondary (test to $149/yr); 30-day money-back; receipts and cancellation self-serve.
- **E2.** As any family, my entitlement is sponsor-aware: Premium features are free when a sponsor covers me (facilitation client now; district/employer/licensee doors later).
  *AC:* `entitlements` table (family, tier, sponsor_type, source, period); facilitation clients auto-entitled; UI shows "Included with your facilitation — you pay $0."
- **E3.** As Devon, Premium unlocks: unlimited Navigator, IEP document analysis + goal tracking, letter generation with sending history, document binder + export, expense/tax reports, multi-child.
  *AC:* free tier retains eligibility results, KB, journey map, starter action plan, deadlines, capped Navigator (N messages/mo on a cost-efficient model tier); gates render as value explanations, never dead ends; all gated features already exist in the codebase — this epic is entitlement wiring, not feature building.
- **E4.** As the owner, free-tier AI cost is capped and observable.
  *AC:* per-user monthly token budget; free tier served by a cheaper model tier with escalation; cost per free user on the owner dashboard.

### EPIC W-F · Safety, content & i18n hardening *(carries REQ-1205/1206/1001–1003 forward; verify-first)*

- **F1.** Verify-then-fix the remaining audit P0s against `main`: confidence gating on ts_rank (REQ-1206), medical boundary + crisis protocol in the server-authored prompt (REQ-1205), RLS verification queries clean.
- **F2.** Content provenance schema + single source of truth for dollar figures (REQ-1001/1003) — prerequisite for eligibility cards' statute + date display.
- **F3.** Funnel screens (eligibility, offer, booking, pricing) ship EN + ES at parity; planGenerator rules-table refactor (conflict C-12(b)) lands in this phase to unlock generated-content localization.
- **F4.** Prompt-regression suite in CI (ports QATests.csv) before Premium raises Navigator usage.

### EPIC W-G · Process Navigator — rights, steps, and clocks *(new, free tier; added 23 Aug after the money-map work)*

The system's core failure is informational: families sit on Path A for years without knowing the clocks they control, the levers they hold, or that Path B exists (1.5% SDP enrollment against near-universal eligibility). Making the process itself legible is therefore a **core free-tier feature** — it is the funnel's substance, the origin of the funded-offer conversion, and the data asset (days-to-service by RC) nobody else has.

- **G1.** As a parent, I see a personalized "you are here" map of the Regional Center process — intake → assessment → IPP → services, on my current path — with the statutory clock on my current step and what happens next.
  *AC:* renders from the family's profile + logged events; every step cites its statute (provenance schema); clocks show date math ("assessment due by Oct 14 — 120 days from your Sept 16 intake"); EN+ES. *Reuses:* JourneyScreen/journeyMaps (extend from diagnosis journeys to process journeys), content provenance (F2).
- **G2.** As a parent, I get a "which path fits us?" decision aid for traditional POS vs. SDP.
  *AC:* short questionnaire (authorization history, unmet needs documented in IPP, appetite for admin, current-provider satisfaction) → plain-language recommendation with the trade-offs stated honestly (budget anchored to authorizations; all-in; admin; facilitation from budget) and a prep checklist ("get these needs into your IPP *before* converting"); never overstates SDP; hands off to the funded offer (B2) when SDP fits. *Reuses:* planGenerator rules table (C-12), eligibility screener (B1).
- **G3.** As a parent, I can pull the exact lever for my situation, pre-drafted.
  *AC:* one-tap generation of the working letters: IPP review meeting request (30-day clock, §4646.5(b)), Notice of Action demand, assessment-clock follow-up (§4643), generic-resources denial request, SDP information request — each citing its statute, in the family's language, with sending history. *Reuses:* LettersScreen + draft templates + letter engine (exists), useDeadlines.
- **G4.** As a parent, I track every request, authorization, and reimbursement I have in flight — and the app watches the clocks for me.
  *AC:* a `family_requests` record per ask (service, date requested, channel, statutory clock if any, status: requested → assessed → authorized/denied → started → reimbursed); deadline engine computes due dates and nudges; an overdue item offers the matching G3 letter as the next action; denials prompt the NOA/appeal path; authorization end-dates feed renewal reminders. *Reuses:* actions table + deadlines engine + notifications (wired in W-A/W-B); new table in migration 041.
- **G5.** As the owner, aggregated (consented, de-identified) request outcomes build the accountability dataset: median days-to-service by service type and RC, denial rates, appeal outcomes.
  *AC:* feeds the outcomes engine (E8-equivalent); no number surfaces without n; this is the evidence base for equity grants, RC conversations, and the eventual payer pitch. *Depends on:* research consent (Phase 2).

**Strategic note:** G4 is the flywheel — a family tracking its Path-A pain in Waypoint is simultaneously assembling the documented-unmet-needs record that becomes their SDP budget case (catch #1), which is the moment the funded offer converts. Free-tier tracking → documented needs → facilitation client.

## 5. How it builds on the current product (file-level map)

| Exists today (main) | Becomes | Change |
|---|---|---|
| `OnboardingFlow.tsx` + `planGenerator.ts` | Eligibility-first onboarding (B1) | Reframe output profile → eligibility result; rules-table refactor (C-12) |
| `NavigatorScreen` + `ai-proxy` (server-authored prompts ✓) | Free (capped) + Premium (unlimited) Navigator; facilitator context mode | Add entitlement checks, per-user budget, staff context |
| `ExpensesScreen` / `TaxReportScreen` components | Spending-plan builder UI (C5) | Reuse components, **new** `spending_plan_lines` schema (C-6(b)) |
| `IEPHubScreen`, `analyze-iep`, `useIEPGoals` | Premium IEP analysis (E3); PCP goal patterns (C3) | Entitlement gate; extend goal source enum |
| `CalendarScreen`, `appointments`, `useDeadlines` | Booking (B3); statutory clocks (C2/C4) | Add facilitator availability; new clock types |
| `LettersScreen` + draft templates | Premium letters (E3) | Entitlement gate only |
| `useNotifications` (orphaned) | Deadline/booking reminders | Wire it — first real consumer |
| `analytics.ts` (has callers ✓) | Funnel events (B4) | Add event taxonomy + weekly view |
| `flags.ts` | Entitlement-aware feature gating | Extend to sponsor-aware entitlements |
| Migrations 001–034 | Baseline | **New migrations start at 035**: 035 organizations+staff+profiles · 036 family_assignments+consent+access_log · 037 service_events(+participants) · 038 sdp_cases+spending_plan_lines · 039 invoices+invoice_lines+vendor_packets · 040 entitlements+subscriptions · 041 outcomes+baselines · 042 content_sources |
| GAS MVP (retiring at parity) | Unchanged by this PRD | — |

## 6. Roadmap & phases

| Phase | Weeks | Ships | Gate (exit test) |
|---|---|---|---|
| **W0 · Rebase & foundations** | 1–2 | Audit-P0 verify/fix (F1) · migrations 035–036 (A1–A4, tenancy) · 099 vendorization packet started (D1) · funnel event taxonomy | RLS verification clean; staff login lands on empty caseload; packet submitted |
| **W1a · Funnel** | 3–6 | Eligibility result + offer + booking, EN+ES (B1–B4) · provenance schema (F2) · C-12 refactor (F3) · **Process Navigator: you-are-here map, path decision aid, lever letters (G1–G3)** | 3-min onboarding→result; funnel events flowing; ES parity on 4 screens; a family can generate an IPP-meeting-request letter in-app |
| **W1b · Facilitation workspace** | 5–10 (overlaps) | Caseload, case detail, PCP builder, 099 tracker, spending plan, time capture, baselines (C1–C7) · invoicing both payer paths (D2–D4) · **request/authorization tracker with clocks (G4)** | **One family orientation→approved plan in-app; one PAID invoice; hours-per-family measured**; ≥1 real family tracking live requests |
| **W2 · Premium** | 11–14 | Pricing page + Stripe web checkout (E1) · entitlements incl. sponsored (E2) · gates on existing features (E3) · AI cost caps (E4) · prompt CI (F4) | First 10 paying subscribers; conversion instrumented; free-tier cost/user visible |
| **W3 · Evidence & decision** | 15–18 | 10-family price/caseload readout · outcome baselines complete · funnel ≥/< 3% verdict · G3 pre-read with DDS answers | Go/no-go memo: scale facilitation, adjust price, and whether door #3/#4 opens next |

Parallel, non-engineering: DDS question #0 letter (week 1); 10 SDP-family price interviews (weeks 2–6); SELPA pilot conversation (from October); STTR (Sept 5) if pursued.

## 7. Metrics & kill criteria

- Funnel: registered → booked ≥3% (kill: <3% after 500 eligibility results → funnel thesis fails, revisit acquisition).
- Facilitation: 1 paid invoice by week 12; agreed price ≥ $800/yr median across 10 families (kill: families won't pay >$500 → SDP line shrinks, weight shifts to Premium/district).
- Hours-per-family ≤ 8 hrs to approved plan (else caseload model reprices).
- Premium: ≥2% of engaged free users; month-3 retention ≥70% of cohort.
- Cost: free-tier AI ≤ $0.50/registered user/month.

## 8. Risks specific to this build

1. **099 vendorization latency** gates transition billing — start the packet in week 1; ongoing FMS invoicing does not depend on it.
2. **Web checkout vs App Store**: selling Premium on the web keeps 97% margin and avoids IAP review, but the iOS app must not link to external purchase in ways that violate guidelines at submission time — ship PWA-first (consistent with the locked web-first decision), revisit IAP at TestFlight.
3. **Two-door confusion**: a facilitation client seeing an "upgrade" prompt is a trust failure — entitlement checks must precede every gate render.
4. **Founder capacity**: W1b is the founder acting as facilitator; the tooling must reduce their hours, not add ceremony — every C-epic screen is judged by "faster than the spreadsheet it replaces."
