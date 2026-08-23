# Waypoint — Critical Review of the Payer-Funded Pivot Proposal

**Prepared 22 August 2026 · Reviews:** `WaypointProductProposal.docx` (v1.0, 16 Aug 2026), `WaypointProductRequirements.xlsx` (62-requirement backlog), `WaypointPrototypeScreens.pdf` / `WaypointPrototype.html` (10 screens) — against the repository as of commit `7044ff2` (PR #67).

---

## 1. Executive verdict

**The strategic core of the proposal is correct and should be adopted. The engineering plan underneath it is stale and must be rebased. And the proposal quietly changes what kind of company Waypoint is — that decision deserves to be made explicitly, and there is a hybrid structure that preserves more upside than the proposal offers.**

Three sentences of substance:

1. **The arithmetic kills the consumer subscription.** $1M of consumer revenue at ~$12 blended ARPU needs ~126,000 registered California families — a third to a half of the addressable market — while ~75% of Medicaid-covered special-needs families have zero out-of-pocket health spending. A consumer-pay Waypoint structurally excludes the families the mission points at. This critique survives every stress test I applied; adopt it.
2. **"Free to the family, paid by whoever the system already pays" is the proven playbook** (Undivided invoices the FMS; the SDP facilitation channel needs no vendorization and is sellable this quarter). But as written, the proposal turns Waypoint into a **services company** — 21 people, 5.7% gross margin on the volume channel, payroll ahead of slow Regional Center receivables — with software as an internal tool. That's a good small business (~$500k/yr owner earnings at base case) and a poor equity story (~1× revenue valuation).
3. **The missing move is tenancy.** The staff-side product the proposal specifies — authorization tracking, billable session capture, structured notes, countersignature, utilisation, RC billing — is exactly the operating system that *every existing vendored provider and independent facilitator in California* lacks. Built multi-tenant from day one (one added table, near-zero marginal cost now, prohibitive to retrofit later), the same code becomes a licensable vertical-SaaS platform (the CentralReach/Rethink playbook for the Lanterman world), which is the only branch of this decision tree with venture-class valuation attached.

**Recommendation in one line:** adopt the pivot's Phase 0–2 (free family tier, eligibility-first funnel, SDP facilitation revenue, vendorization readiness) on a rebased plan; make Phase 3 (hiring W-2 coaches for code 108) a separate, evidence-gated go/no-go; and architect the staff side as a multi-tenant platform so the B2B licensing option stays open whether or not you ever staff up.

---

## 2. What the analysis gets right (the good)

These conclusions were checked and hold:

- **The subscription math.** Not a marketing problem — arithmetic. The current Port Sprint Plan builds the entire consumer app before earning a dollar; the proposal's inversion (revenue in Phase 1, funded by an invoice, not an app store) is correct.
- **The channel correction.** POS codes 371/331 are SDP codes that cannot be vendorized (only FMS codes 315–317 can); the current business plan's reimbursement path genuinely does not work. The two corrected channels — FMS-invoiced SDP facilitation (codes 024/099 + annual facilitation, 63–84% GM, no vendorization) and vendorized code 108 Parenting Support Services (~$58.68/hr 1:1, reaches the full ~525k caseload) — are the right two, in the right order.
- **The honesty of the economics.** The proposal states its own bad news: code 108 is a labor rate (5.7% GM at 65% utilisation, negative below ~63%), the conservative case *loses money*, SDP is capped (~$13.6M statewide), and runway — not profitability — is the binding constraint. An analysis that argues against its own rosy case earns trust.
- **The requirements workbook is genuinely excellent.** The ADD/EXTEND/REWORK/REPLACE/CONFLICT classification (43 of 62 requirements additive), the 14 named conflicts with recommendations, and the reuse map (~60% of the built surface re-points rather than rewrites) is the best-structured planning artifact in this repository. Conflict recommendations C-1 (role-forked routing, one auth), C-3 (separate `service_events` from `appointments`), C-4 (one session row + participants table with RLS on the child table), C-5 (progress notes as retained work product, not family-deletable documents), C-6 (separate schema, reuse the Expenses *components*), C-9 (countersignature data model without workflow), C-10 (3-minute eligibility flow; baseline administered at start of service) and C-12 (planGenerator rules-table refactor as the prerequisite for both jurisdiction and Spanish) are all the right calls — accept them as written.
- **The prototype screens are the strongest design work in the project.** Answer-first eligibility with provenance on every claim; "Who pays for this?" as a first-class conversion section with a real decline path; billability resolved at the moment of logging with the authorization named; per-field AI provenance on notes ("drafted · edited by you"); the equity guardrail that blocks mixed-language cohorts without an interpreter; break-even drawn on the utilisation metric. These encode the business model into the interface — keep them as the design spec for the staff side.
- **Most of the cut list.** Forum (Cochrane 2021: all seven outcomes null; Understood.org shut theirs; run community on Facebook), dead embeddings pipeline, root-prototype archiving, and cutting the three-language *claim* while keeping the goal — all correct.

---

## 3. Where it's wrong or stale (the bad)

### 3.1 The documents review a codebase that no longer exists

The proposal is dated 16 August; the repo has moved (PRs #56–#67 since). Verified against `main` today:

| Claim in the documents | Current reality |
|---|---|
| "ai-proxy accepts the system prompt verbatim from the client" (C-14, REQ-1205) | **Already fixed.** `ai-proxy/index.ts` builds the Navigator system prompt server-side from DB-derived context ("Wave 1 hardening"), including tone handling. C-14's recommended option (b) has shipped. |
| "Offline queue tells users 'saved offline' on any failure and discards data" (C-7) | **Partially fixed.** `useActions.ts` now ships the "honest failure" fix; the true offline replay queue remains roadmap item 7.2 — which matches REQ-505's scope, but the harm claim is out of date. |
| "MyChart OAuth has no PKCE and no state" (cut-list rationale) | **Fixed in PR #67.** |
| "No account deletion, no AI consent" (REQ-000) | **Migration 015 (`ai_consent_usage_deletion`) and a `delete-account` edge function exist.** |
| "trackEvent has zero callers, Insights can never populate" | **Stale.** `trackEvent` now has callers (`useChat`, `CheckInCard`); migration 023 adds insights aggregation. |
| Proposed new migrations numbered **014–022** | **Collide with existing 014–034.** The repo already has migrations through `034_action_notes.sql`, including repair (014) and core-RLS enablement (016). The pivot's data model must be renumbered **035+** and re-diffed against what 014–034 already created. |
| "12 migrations, 18 of 23 screens unreachable" | Repo has 34 migrations, ~30 main screens, an active 8-phase roadmap (`ROADMAP.md` v1.1) with stack navigation and wiring work underway. |

**Consequence:** Phase 0 ("Repair, ~3 weeks") is partly done, some of it differently than the proposal assumed. Before adopting the backlog, run a one-day *re-audit* — re-verify each REQ-000 item and each cut-list rationale against `main`, mark what's shipped, renumber the data model. Building from the workbook as-written would recreate work and collide with live migrations.

### 3.2 The two roadmaps contradict each other and both are "locked"

`ROADMAP.md` (v1.1, "Locked August 16, 2026") sequences a *consumer* build: Navigation Core → Documents/IEP → Communication → Adaptive → Money/Insurance → Community → Language → App Store. The proposal (same date) sequences a *payer* build and cuts or defers several of ROADMAP.md's phases (community, FHIR, paywall, multi-language claims). Two locked plans of the same vintage pointing in different directions is the most dangerous state a solo-founder project can be in — whichever file Claude Code or a contributor reads first wins. **One of them must be superseded explicitly, in-repo, this week.** (Section 8 proposes the merged plan.) Note the overlap is real: ROADMAP.md Phases 0–2 (wiring, RC data layer, Documents/IEP) serve *both* strategies and should proceed regardless.

### 3.3 Specific analytical weaknesses

- **The funnel conversion number is invented.** The whole acquisition thesis hangs on ~3%+ free→booked conversion, presented with no evidence and no CAC fallback if it fails other than "acquisition has to be bought." The kill-criterion is right; the plan should also include the *cheap test*: run the eligibility screener + booking flow as a $0 landing page against the existing GAS MVP user base and 2–3 partner referral sources *before* Phase 1 completes.
- **Facilitator productivity is asserted, not derived.** The caseload screen assumes ~58 families per facilitator. SDP facilitation is high-touch (orientation → PCP → budget certification → spending plan → renewal); NeuroNav-style practices run materially smaller caseloads at steady state. If sustainable caseload is 35, SDP revenue per facilitator drops ~40% and the Phase 1 economics change. Sensitivity-test this in the operating model before hiring facilitator #2.
- **SDP is a market Waypoint must *create*, not harvest.** 7,459 enrolled of 525,000 (~1.7%) is framed as opportunity; it is equally evidence that enrolment is hard — orientation requirements, RC friction, family hesitancy. Facilitation revenue arrives only after a family completes enrollment steps Waypoint doesn't control. Expect a long, education-heavy sales cycle and model it (the current model appears to book facilitation revenue on sign-up cadence, not enrollment cadence).
- **Free-tier costs are unfunded.** The consumer app "stops being the revenue line" but keeps generating AI inference cost (streaming chat on an Opus-class model, per the GAS lineage). At funnel scale this is real money against no revenue line. Set a per-free-user cost ceiling, serve the free Navigator on a cheaper model tier with escalation, and meter it — the moat must not have an uncapped burn rate.
- **Competitor response is unexamined.** Undivided already invoices FMSes, has raised venture capital, runs ~60 co-branded referral pages, and could vendor for 108 with the same open window the proposal celebrates. The durable moats here are not the free app; they are (a) the provenance-dated California knowledge layer, (b) the outcomes dataset (E8), and (c) RC relationships/QIP standing. The proposal has the right assets but misattributes the moat.

---

## 4. The ugly — the hard truths to accept before committing

1. **This is a decision to run a services company.** 21 people at base case; supervision ratios; credentialing; Live Scan background checks; workers' comp; payroll every two weeks against Net-30-to-90 Regional Center receivables; audit exposure. The founder currently has a day job. The proposal's own numbers say the *software-only* version of this pivot does not exist — humans are billable, software is not. If that operating life is not wanted, Phase 3 should never start — and (Section 6) there is a version of this plan where that's fine.
2. **The volume engine barely clears zero.** 5.7% GM at 65% utilisation means one bad quarter of scheduling, one denied billing month, or one coach at 51% utilisation erases the margin. The prototype's utilisation screen is honest about this; the risk register understates how thin the room for error is at 3–5 coaches (small-N variance is brutal — one resignation is a 20–33% capacity shock).
3. **The conflict of interest is structural, not cosmetic.** Waypoint as *independent* facilitator writing Waypoint-as-provider into the family's spending plan is exactly the arrangement SDP's independence rules exist to prevent. The prototype's "us" tag is good disclosure; disclosure may not be enough for RCs, advocates, or the families themselves (the proposal's own kill-criterion #3). Mitigation to adopt: default to *not* placing Waypoint services on plans Waypoint facilitates; treat the two channels as separate books of families until proven acceptable.
4. **Concentration on one state's one program's one budget.** ~39% of base revenue from SDP lines against a ~8,200-family channel with a proposed $45M cut in 2026–27; the rest from a rate schedule DDS resets. A single DDS directive (e.g., remote-delivery exclusion for 108 — the proposal's own #1 risk) can invalidate the model. The four DDS questions are correctly the first 90 days' most important work; nothing irreversible should be built before the remote-delivery answer is in writing.
5. **The valuation story shrinks even as the revenue story becomes real** (Section 7). Anyone imagining a venture path should read that section before celebrating $2.7M.

---

## 5. What's missing from the analysis

Items absent or under-scoped in all four documents:

1. **HIPAA / privacy posture.** Structured progress notes on named children's clinical-adjacent goals, countersigned and retained for a payer, likely make Waypoint a HIPAA covered entity or business associate in at least some configurations (and certainly once health-plan or CalAIM work starts). Needs: BAA with Supabase (available on paid tiers) and Anthropic (available), encryption/retention policy, staff training, breach process. Budget 2–3 weeks of work and ~$5–15k/yr of tooling; it is also a *sales asset* with RCs. Nothing in the backlog covers it — add an epic.
2. **E-signature validity.** Countersignature (REQ-703) and family consent (REQ-102) carry legal weight in audits. Decide the mechanism (typed attestation + audit log vs. UETA/ESIGN-compliant flow) before the first billable note, not after.
3. **Employment & insurance ops.** W-2 vs 1099 for coaches (in California post-AB5, W-2, full stop), professional and general liability insurance, mandated-reporter obligations for staff entering family homes, incident reporting. These gate vendorization program design (the proposal's DDS question #2) and belong in Phase 2, owned, with a cost line.
4. **The tenancy decision** (Section 6). The single highest-leverage architectural omission: the proposed `staff` table has no `organization_id`. One column plus one table now; a rewrite later.
5. **The sales motion for code 108.** Vendorization gets you *permission*, not customers. Each family needs a POS authorization written by an RC service coordinator; that is a relationship sale to coordinators, not app virality. The plan needs an RC-relations workstream (who, which catchments, what collateral, QIP positioning) — currently nowhere in 62 requirements.
6. **Payer diversification beyond DDS.** Deferred wholesale to Phase 4, but two adjacent channels deserve a line in the plan now because they change architecture decisions: **CalAIM** (Enhanced Care Management / Community Supports through Medi-Cal managed-care plans — the "medical-facing" version of this product, with health plans as payer) and **school-district-adjacent** services. Both consume the same service-event/notes/outcomes engine. Tagging the payer on every service event (one enum column) keeps these open.
7. **Funding diversification.** The plan bets on one NIH STTR (14.8% success rate, Jan 2027 deadline, university partner required). Add: DDS *service access and equity* grants (directly fund the Spanish-first work the cut list defers), foundation grants (WITH, Lucile Packard, local family foundations), and CalOSBA. None require giving up equity; several fund the exact equity work (REQ-1106) currently pushed to Phase 4.
8. **A costed free tier** (per §3.3): model tiering, caps, and a monthly ceiling.
9. **Churn/lifecycle of the funded family.** SDP facilitation renews annually — what's year-2 retention? Code 108 authorizations end — what's the re-authorization motion? The LTV side of the model is silent.

---

## 6. The layered-product answer (B2C / B2B / medical-facing)

The user's instinct — "different views or layers or versions of the app" — is exactly right, and it resolves the proposal's biggest strategic weakness. **One codebase, one data platform, four layers, three of them monetizable:**

| Layer | Audience | Money | Status |
|---|---|---|---|
| **L1 · Family (B2C, free)** | Parents | $0 — acquisition + moat | ~85% built today; add eligibility-first onboarding, funded-offer, booking (REQ-1101–1103) |
| **L2 · Waypoint Staff (internal B2B)** | Own facilitators & coaches | SDP facilitation now; code 108 after vendorization | The pivot's Phases 1–3; ~0% built |
| **L3 · Partner Platform (external B2B SaaS)** | *Other* vendored providers, independent facilitators, FMSes, advocates | Per-seat/per-org license (~$100–300/provider/mo, market-typical for care-ops verticals) | Same code as L2 **if** multi-tenant from day one |
| **L4 · Payer/medical view** | RCs (QIP/outcomes), later health plans (CalAIM) | Outcomes reporting; future contracts | Phase 4+; enabled by E8 + payer tagging |

Why L3 matters even if it's never sold: it's the option that changes the company's ceiling. California's Lanterman ecosystem contains thousands of small vendored providers and independent facilitators running on paper, spreadsheets, and generic EHRs that don't know what a POS authorization or a 40-hour 099 cap is. The staff product specified in the workbook — authorization enforcement, billability-at-entry, structured goal-linked notes, countersignature, utilisation, RC-format billing — is *their* missing operating system too. Vertical care-ops SaaS (CentralReach, Rethink in the ABA world) demonstrates the category supports real companies at real multiples. Waypoint running its own services first is the *right* sequence — it forces the product to be true (you bill with it yourself) and generates the outcomes dataset — but only tenancy keeps the second act available.

**Cost of keeping the option:** one `organizations` table; `organization_id` on `staff`, `family_assignments`, `service_events`, `rc_vendors`, `service_rates`, `authorizations`, `invoices`; RLS helper scoped by org. Roughly +2 days on Phase 1 if done now; a multi-month migration if done at Phase 4. **Do it now regardless of whether L3 is ever pursued.**

**Do not** build a medical/clinician-facing app now (the proposal is right to defer FHIR/provider portal); do add the two cheap seams — payer enum on service events, org tenancy — that make L3/L4 additive later.

---

## 7. Value proposition and valuation

### 7.1 Value proposition, by constituency

- **Family (customer):** "Find out in three minutes what your child is entitled to and what it's worth — with the statute and the date we checked it — then get a real person to secure it, free to you, paid by the system that owes it to you, without touching your child's budget." That is a categorically stronger consumer promise than "$12/mo for AI answers," and it's the only version a Medi-Cal family can accept.
- **Facilitator/coach (user):** a caseload that triages itself, statutory clocks that forecast instead of report, notes drafted in the car and signed in a minute, and never delivering an hour that can't be billed.
- **Regional Center / payer:** a vendor whose every billed hour traces to a signed, goal-linked, countersigned record; QIP compliance visible; the first provider in the category with consented outcomes data (also 10% of the rate).
- **The business:** ~$1,200/family/yr SDP facilitation at 84% GM funding a volume channel at ~$3,051/family/yr; free-tier CAC ≈ $0 if the funnel converts; an outcomes dataset nobody else has.

### 7.2 Valuation scenarios (estimates; ranges are honest, not precise)

| Scenario | Year-5 shape | Realistic valuation lens | Range |
|---|---|---|---|
| **A · Status quo** (consumer subscription) | Model's own math: can't reach $1M in CA | Asset/acqui-hire value of code + KB | **< $1M** |
| **B · Pivot as proposed** (services co.) | Base: $2.7M rev, $383k EBITDA, 21 ppl; Stretch: $5.45M / $1.36M | Small healthcare-services business: ~3–5× EBITDA or ~0.7–1.2× revenue; buyer = regional provider roll-up or competitor | **Base ~$1.5–3M; Stretch ~$5–8M** — but owner earnings of ~$500k/yr (base) is the real return |
| **C · Hybrid** (B + multi-tenant platform licensed to other providers/facilitators) | B's services revenue **plus** platform ARR (illustrative: 300–600 provider seats × $150–250/mo ≈ $0.5–1.8M ARR) | Services at services multiples + platform at vertical-SaaS multiples (5–8× ARR for growing, retentive vertical SaaS) + outcomes dataset as strategic premium | **Plausibly $8–20M if platform ARR materializes; venture-optional rather than venture-dependent** |

Read: **B is a livelihood; C is a company.** B's ~$500k/yr owner earnings, bootstrapped, mission-aligned, is a genuinely good outcome and requires no one's permission. C costs almost nothing extra *now* (tenancy + not signing exclusives) and is the only path where the software itself — rather than the labor it schedules — carries the valuation. The proposal's "Series A territory" jab at the old plan cuts both ways: as written, the pivot isn't Series A territory either, and doesn't need to be; but don't close the door for free.

---

## 8. The merged roadmap — what to adopt, change, and reject

### 8.1 Decisions

**ADOPT as written:**
- Kill the consumer paywall for v1; ship the family tier free (nothing paywall-related is built yet — this cut is free today and removes App Store IAP review risk).
- Eligibility-first onboarding, funded-offer surface, facilitator booking (REQ-1101–1103) — the funnel.
- Phase 1 SDP facilitation + FMS invoicing as first revenue; the week-12 "one paid FMS invoice" exit test.
- The staff role model and conflict recommendations C-1(b), C-2(b), C-3(b), C-4(b), C-5(b), C-6(b), C-8(b), C-9(a-with-b's-data-model), C-10(b), C-11(b), C-12(b), C-13(b).
- The cut list: forum off, embeddings pipeline deleted, root prototypes archived, three-language claim reduced to what's true.
- E8 outcomes engine in Phase 2 (it's the moat, the QIP lever, and the grant/STTR aim).
- The four DDS questions, in writing, before any Phase-3 commitment; the four kill-criteria as stated.

**ADOPT with modification:**
- **Rebase the entire backlog against `main`:** re-audit REQ-000 (much has shipped: server-side prompts, PKCE, consent/deletion, honest offline errors), renumber the data model to migrations 035+, re-diff against migrations 014–034, and update the cut-list rationales that are stale (Insights/analytics now has callers).
- **Add tenancy to the Phase-1 schema** (`organizations` + `organization_id` throughout; §6). ~2 days now.
- **Add a payer enum to `service_events`** so CalAIM/school channels are additive later. ~1 hour.
- **Pull Spanish forward from Phase 4 for the *funnel only*:** the eligibility screener, offer, and booking screens (3–4 screens, not 25) in Spanish in Phase 1. The proposal's own equity evidence (4.5× service gap) and the fact that Spanish-speaking families are over-represented in the underserved population make the funnel's highest-conversion segment Spanish-speaking. Full Spanish-first stays Phase 4 behind the C-12 refactor; the funnel can't wait for it. Seek a DDS equity grant to fund the rest.
- **Do the C-12 planGenerator rules-table refactor in Phase 1, not Phase 4.** One week, unlocks jurisdiction + localisation + kills the English-title coupling; every week of new content written into the old 957-line if-chain increases the eventual cost.
- **Keep ROADMAP.md Phases 0/0.5/1/2 running** (wiring, UX kit, RC data layer, Documents/IEP) — they serve both the family tier and the coach workflows (document evidence, IEP→IPP goals). Supersede ROADMAP.md Phases 3–8 with this plan; mark it in the file.
- **Gate Phase 3 (code 108 staffing) as a separate company decision**, taken only when ALL of: written DDS remote-delivery answer; vendorization program-design requirements known and meetable; ≥10 paid SDP families with ≥3% free→booked conversion; facilitator caseload economics validated at real (not assumed) productivity; founder ready to run a payroll services org (or a hired ops lead is). If any fail → stay an SDP facilitation + platform business (still profitable per the model's own margin structure).

**REJECT / push back:**
- **"The consumer app is the moat."** Restate: the *knowledge layer with provenance* and the *outcomes dataset* are the moat; the app is the funnel. This matters because it changes where quality investment goes (REQ-1001–1003 content provenance is P0-critical; polishing consumer UX beyond funnel needs is not).
- **Uncosted free tier.** Add model tiering + per-user cost caps to Phase 1 scope.
- **Facilitator-as-provider on the same plan by default.** Default to separation; treat the "us on the plan" case as exception-with-disclosure, pending the 10-family acceptability test.
- **Single-funding-source plan (STTR only).** Add the grant stack from §5.7.

### 8.2 Sequenced plan (supersedes both prior plans)

- **Phase 0 · Re-audit & foundations (1–2 wks).** One-day backlog re-audit vs `main`; finish remaining true P0s (RLS verification queries, ftsConfidence rank-gating REQ-1206, medical boundary REQ-1205 — verify current prompt state first); archive root prototypes; supersede ROADMAP.md 3–8 in-repo; incorporate (C-corp/benefit election), UEI/SAM/eRA registrations; send the four DDS questions.
- **Phase 1 · Funnel + SDP revenue (8–10 wks).** Staff roles/consent/RLS (C-1/C-2, with **org tenancy**); service-event capture (C-3); SDP screener, PCP builder, 099 cap tracker, budget + spending-plan builder (C-6); FMS vendor pack + invoicing; eligibility-first onboarding + offer + booking (EN+ES); planGenerator rules-table refactor (C-12); free-tier cost caps. **Exit:** one family orientation→approved plan in-app; one *paid* FMS invoice; funnel conversion measured.
- **Phase 2 · Vendorization readiness + evidence (6–8 wks, overlapping).** Vendor/rate registry, authorization tracking + alerts; credentialing; audit log; outcomes baseline + instruments (licensing checked) + research consent; content provenance + staleness (C-11); HIPAA posture + BAAs + e-signature decision; QIP/Provider Directory profile; STTR submission (Jan 5); grant applications. **Exit:** vendorization application submitted; every served family baselined; HIPAA checklist green.
- **Gate G3 — the staffing decision** (criteria above). Explicit go/no-go, written down.
- **Phase 3a (if GO) · Code 108 delivery (10–12 wks).** Billable capture w/ authorization enforcement (C-8), offline-first provisional capture (REQ-505 replaces the old queue), cohorts + per-participant rosters (C-4), notes + countersignature (C-5/C-9), monthly RC billing + denial tracking, utilisation dashboard, Coach Copilot, prompt-regression CI. **Exit:** first RC month billed *and paid*; utilisation >63%.
- **Phase 3b (if NO-GO or in parallel at small scale) · Platform pilot.** Offer L2 to 2–3 friendly external facilitators/vendors under a simple license; validate willingness-to-pay; this is also the hedge that keeps revenue growing if 108 staffing stalls.
- **Phase 4 · Scale.** Second RC (config, not code); Spanish-first everywhere; CalAIM exploration; multi-state only behind jurisdiction tagging; revisit deferred consumer monetization only if funded channels underperform.

---

## 9. Trade-offs being accepted (state them, don't discover them)

**Technical:** the RLS rewrite (C-2) is the one large, dangerous migration — write the policy-coverage test first; group sessions (C-4) are the one place a privacy failure exposes one child's diagnosis to another family — RLS test before feature; offline provisional states (C-8) add a permanent reconciliation queue to ops; tenancy adds a column to every query's mental model; two calendars (appointments vs service events) require the reconciliation view or they will drift; the app becomes web-first for staff (per the prototypes — desktop caseload/billing) while remaining mobile-first for families and coaches — one design system, two form factors.

**Business:** forgo ~11% of modeled revenue (consumer subs) and all App Store revenue mechanics; accept ~39% revenue concentration in a capped, politically exposed SDP channel during the transition; accept services-company operating burden at Phase 3 (or explicitly decline it at G3); accept that free-tier inference is a cost center defended only by conversion; accept slower "growth" optics than a consumer story (no user-count vanity) in exchange for revenue that arrives in months, not years; accept the COI constraint of not selling Waypoint services onto plans Waypoint facilitates by default.

---

## 10. The one-paragraph recommendation

Adopt the pivot's strategy — free to the family, paid by the system's existing payers, SDP facilitation first — because its arithmetic is right and its first invoice needs no one's permission. Rebase its engineering plan onto the current repo before building anything (the workbook is three months of drift stale in places, and its migrations collide). Build the staff side multi-tenant from day one so the same software that runs Waypoint's own facilitators can later be licensed to the hundreds of providers who lack it — that single cheap decision is the difference between buying a ~$500k/yr livelihood and keeping a shot at an $8–20M company. Make the code-108 staffing decision a real gate with written DDS answers and a paid-invoice proof behind it, not a phase boundary that arrives by momentum. And spend the first two weeks on the only things that can invalidate everything: the four DDS questions, ten SDP-family conversations about the conflict of interest, and one Spanish-capable eligibility funnel in front of real families.
