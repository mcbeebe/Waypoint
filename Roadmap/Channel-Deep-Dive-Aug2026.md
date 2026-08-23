# Channel Deep Dive — Monetizing Beyond the Regional Center System

**23 August 2026.** Four-channel analysis for the ~850k non-RC IEP families and the payer map overall, with a build/don't-build assessment of district-facing IEP software. Companion to `Market-Sizing-CA-Aug2026.md` and `Assumptions-Audit-Aug2026.md`. All figures primary-sourced via research passes on 22–23 Aug 2026; proxy-blocked exact values flagged in the underlying notes.

---

## 1. District channel — the deep dive

### 1.1 Market structure (verified)

- ~936–1,019 districts, but **the buying unit is the SELPA: 136 of them** control IEP-system adoption for ~1,000 districts. 883,862 students with IEPs (2025-26).
- **SEIS (San Joaquin County Office of Education) is a near-monopoly**: 100+ SELPAs, ~700,000 SpEd students (~75–80% of state volume), priced around **~$9.50/SpEd student/yr** (SFUSD FY26-27: $106,922 for 11,255 students). A government entity selling to government entities via inter-agency agreements — effectively no RFP wedge, and impossible to undercut on price.
- #2 is SIRAS (16 SELPAs, ~190 districts) — **acquired Sept 2025 by MBT** to bundle IEP + CALPADS + Medi-Cal billing. Nationals (Frontline, PowerSchool, Embrace, SpedTrack) are thin in CA; Everway rolled up Embrace + SpedTrack within 12 months. The category is consolidating.
- **The state is about to commoditize authoring further**: AB 121 funds CCEE to ship a **free, public-facing digitized statewide IEP template by June 30, 2026**, translations integrated, maintained through 2028.

### 1.2 Verdict on "IEP compliance software" as a product: DON'T BUILD the core system

Competing with SEIS means displacing a ~$10/student/yr government incumbent across 136 consensus-driven public buyers while the state ships a free template. There is no version of that fight a bootstrapped company wins.

### 1.3 What IS open: the three layers SEIS doesn't touch

1. **SB 445 translation workflow.** SB 445 (Ch. 906/2024, operative Jan 2025) creates translation rights for IEP documents — draft IEPs, final IEPs, assessments — within ~30 calendar days in the LEA's top languages, by a *qualified translator*. Pre-law, translations took 3–12 months. No CA incumbent sells compliant translation (SIRAS does auto-Spanish only); districts buy from generic language vendors. An **AI-drafted + certified-human-reviewed IEP translation service** is a real product with a legal driver. Caveats to verify before pitching: the final chaptered text routes some of the 30-day clock through CDE *guidance* rather than hard mandate (pull §56341.5), and the bill's sponsors explicitly flagged accuracy/privacy concerns with raw machine translation — human-in-the-loop is the compliance requirement, not a nice-to-have.
2. **The parent portal / plain-language layer — confirmed whitespace.** SEIS has no parent portal, no parent-facing document access, no plain-language rendering. Frontline's "Collaboration Portal" is explicitly not a parent portal. The only true parent portal in the category (PCG's EDPlan Connect) has negligible CA presence. Meanwhile the state is pushing transparency (SB 445, the free public template, parent-input monitoring). **This is the product closest to what Waypoint has already built** — IEP analysis, plain-language explanation, deadline clocks, translation ambitions — flipped to be *offered through* the district instead of against it.
3. **AI copilots for the staffing crisis.** 51% of new CA Education Specialists hold emergency-style permits; ~60% of SpEd teachers already use ungoverned generative AI to draft IEPs. MagicSchool ($65M raised, 6M educators) owns the horizontal; a governed, CA-compliant vertical tool is possible but is the most contested of the three layers.

### 1.4 Why districts would pay (the budget exists)

- **Dispute economics**: ~4,500 CA due-process filings/yr (OAH); district legal fees ~$10.5k/hearing, settlements ~$24k average, parent-attorney fee reimbursements ~$19k, real CA litigated cases widely cited at $50k–300k+ all-in; 46% of districts settle even when they expect to win. National state complaints +46% in one year.
- **Earmarked money**: every SELPA gets annual IDEA-funded ADR (dispute-prevention) grants, on top of a $100M one-time state dispute-prevention investment; software is an allowable IDEA Part B administrative expense. **Districts are literally funded to buy conflict-prevention tooling** — which is what a parent-communication/translation layer is.
- **Sales reality**: 6–18-month cycles via RFP, 4–8 weeks via cooperative/sole-source; budget window Oct–Mar for July starts; the signer is the SELPA director/governing council (or SpEd director under purchasing thresholds for add-ons).

### 1.5 Recommended shape: "Waypoint for Schools" as a communication product, not an advocacy product

- **Product**: parent-facing IEP transparency layer sold to SELPAs/districts — document delivery, plain-language + translated IEP summaries (SB 445 workflow with certified human review), progress and deadline visibility, meeting prep for *both* sides. Sits on top of SEIS via export/import (SEIS record transfer exists); does not replace it.
- **Positioning**: dispute *prevention* and SB 445 compliance — "informed parents file fewer complaints" — funded from ADR/IDEA money. Never marketed as advocacy tooling.
- **Brand handling**: the dual-agent tension (parents' advocate paid by districts) is real. Run it as a distinct product line/brand with a hard data wall (district product data never feeds the consumer advocacy product without parent consent), and be transparent in both directions. If the tension proves commercially untenable, license the translation/plain-language engine to an incumbent instead of selling direct.
- **Sizing (estimate)**: at $3–5/SpEd student/yr (priced against SEIS's ~$9.50 anchor) — 10% of state volume ≈ **$270–440k ARR**; 30% ≈ **$0.8–1.3M ARR**. SELPA-level deals mean ~14 wins could reach 10%. Realistic: pilot 2027, $0.5–1.5M ARR by year 3 if the wedge lands. Software margins, real moat (CA-specific compliance + translation corpus), and it feeds the consumer funnel legally (districts distributing Waypoint to every IEP family).
- **First step (cheap)**: one friendly SELPA pilot in the Oct 2026–Mar 2027 budget window — SB 445 translation + parent summaries only, priced per-document or per-student, using tech Waypoint already has (IEP analysis, plain-language, i18n). Watch who wins the CCEE digitization contract; that vendor becomes either the platform to ride or the competitor to avoid.

---

## 2. CalAIM / Medi-Cal managed care (the medical-facing channel)

- **Real and open**: children's ECM populations launched July 2023; non-clinical CBOs are explicitly eligible ECM providers (no licensure for Lead Care Managers; clinical-supervision protocols required). One published rate example: **~$350/enrolled member/month + $150 engagement + incentives** (rates are plan-negotiated; no state schedule). The CCS child population is ~4% penetrated (~3,400 enrolled vs ~95,000 eligible); child ECM enrollment doubled YoY (~38,000 in Q1 2025).
- **Precedent**: Pair Team (venture-backed, tech-enabled) built a 1,294-child pediatric ECM book — a new company can do this.
- **Frictions**: children with I/DD are not their own ECM category (must qualify via CCS/behavioral-health/homelessness/child-welfare); plan-by-plan contracting takes 6–12+ months each; CHCF's provider interviews report ECM revenue alone often isn't sustainable; PATH start-up subsidies sunset 2025-27; DHCS is "refining" ECM/CS for the 2026 waiver renewal.
- **Adjacent**: CHW benefit (~$63/hr, ~6 hrs/member/yr cap ≈ $380/member/yr — supplement only); dyadic services require licensed clinicians; respite is an optional Community Support some plans elect.
- **Verdict: the scalable payer for the Medi-Cal majority, entered *after* outcomes data exists (Phase 3/4), ideally via a community-care-hub aggregator first.** ECM PMPM at ~$350 × even 300 enrolled children ≈ $1.26M/yr — comparable to the entire SDP channel — but 12–24 months away and rate-risk-laden.

## 3. Employers

- **Category consolidating, not growing**: Joshin → RethinkFirst (Aug 2025), Grayce wound down (Nov 2025), Cleo unraised in 4 years. RethinkCare is the consolidated special-needs incumbent (550+ enterprise clients). Sales are consultant-gated (Aon/Mercer/WTW), 12–18-month cycles.
- **Verdict: do not build a direct employer product.** The one fit for a small team: **white-label specialty-layer partnerships** — Waypoint as the California disability-system escalation layer that Cleo/Wellthy/Cariloop/EAP care guides hand CA cases to, priced per-case/per-engaged-family. The acquisition wave (platforms buying depth) validates exactly this. Effort: partnership BD, not a product build. Ceiling: modest ($100–500k/yr), margin high, and it imports non-California demand later.

## 4. Consumer premium tier

- **Surviving price bands**: $5–25/mo software (Highlighter — the closest comp, an AI IEP assistant — is $5/mo/$50/yr); $25–60/mo group coaching; $90–150/mo with a human attached; $24–400 one-time courses. Families demonstrably spend $1,500–2,250 per advocate engagement at $100–300/hr.
- **Benchmarks**: median freemium conversion 2.1% (RevenueCat 2026, N≈115k apps); ~72% of annual subscribers don't renew at month 12. Undivided's七-year path (≈$42/mo → $19/mo → $149/yr → free human-led Kickstart as lead-gen, ~$5M total raised, no Series A) is the category's cautionary tale — and they now steer families to Regional Center funding.
- **Verdict: reinstate a modest annual tier (~$99–149/yr) in Phase 2+, aimed at the ~35% non-low-income slice** (~300k CA households). At 2–3% of an engaged base: **$0.3–1M/yr, front-loaded, churny**. A real secondary line; never the engine. No take-rate advocate marketplace has ever worked in this category — skip that model.

---

## 5. The consolidated payer map (revenue potential vs. effort)

| Channel | Who pays | Realistic 3-yr revenue | Time to first $ | Sales cycle | Fit with existing build | Risk |
|---|---|---|---|---|---|---|
| SDP facilitation (Phase 1) | Family's budget via FMS / RC (transition) | ~$0.3–1M (capped channel) | **Weeks** | Consumer-speed | High | Price unverified; statutory COI separation |
| RC-funded services (Phase 3) | Regional Centers | Unknown until DDS answers code question | 9–15 mo (vendorization) | Relationship | Medium | **Wrong-code finding; remote unsupported** |
| CalAIM ECM | Medi-Cal managed care plans | ~$0.5–1.5M | 12–24 mo | 6–12 mo/plan | Medium (needs care-mgmt ops) | Rates/sustainability; PoF eligibility gap |
| **District parent-layer + SB 445 translation** | Districts/SELPAs (IDEA + ADR funds) | ~$0.5–1.5M ARR (software margin) | 9–15 mo (2027 cycle) | 6–18 mo; 136 buyers | **High — reuses IEP analysis, plain-language, i18n** | Dual-agent brand tension; CCEE free template |
| Employer specialty layer | Cleo/Wellthy/EAPs (white-label) | ~$0.1–0.5M | 6–12 mo | Partnership BD | High | Partner dependence |
| Consumer premium | Affluent minority of families | ~$0.3–1M | 3–6 mo | None | High | Churn; conversion ~2–3% |
| Platform licensing (L3) | Other facilitators/vendors | ~$0.3–1M early | 12–18 mo | Direct SMB | High (needs tenancy) | Market education |

**Stack read: no single channel replaces the broken code-108 engine — but four mid-size channels ($0.5–1.5M each) on one platform do**, and they de-risk each other. The plausible year-3–5 composite: SDP (~$0.5–1M) + district layer (~$0.5–1.5M) + CalAIM (~$0.5–1.5M) + consumer/employer/platform (~$0.5–1M) ≈ **$2–5M with software-weighted margins** — same revenue as the original plan's base case, better margin quality, no 21-person payroll, and no single-payer concentration.

## 6. Sequencing

1. **Now–Q4 2026**: Phase 1 as planned (funnel + SDP + tenancy). Send DDS question #0. Line up one friendly SELPA for a translation/parent-summary pilot (budget window opens October). Open 1–2 white-label conversations (Cleo/Wellthy/EAPs).
2. **2027**: SELPA pilot live; consumer annual tier ships behind the funnel; CalAIM groundwork (NPI, PAVE enrollment, hub conversations) once outcome baselines exist; decide Phase 3 at gate G3 with DDS's code answer in hand.
3. **2028**: scale whichever two of the four mid-channels showed real pull; platform licensing to external facilitators if the SDP tooling proved itself; revisit direct ECM contracts with outcomes data.
