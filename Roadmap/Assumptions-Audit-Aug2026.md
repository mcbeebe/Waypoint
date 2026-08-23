# Waypoint — Assumptions Audit of the Payer-Funded Pivot

**22 August 2026.** Every load-bearing assumption in `WaypointProductProposal.docx` / `WaypointProductRequirements.xlsx` validated against primary sources (DDS directives and rate models, W&I Code, Title 17 CCR, LAO/budget documents, KFF/Cochrane/SSA, and the competitors' own sites) plus independent re-derivation of the operating-model arithmetic. Companion to `Payer-Funded-Pivot-Review-Aug2026.md`.

**Method.** Four parallel research passes (SDP mechanics · code 108/rates/QIP/remote · vendorization/budget · market stats), primary-source-first; plus a from-scratch reconstruction of the coach economics in Python. Caveat: the sandbox proxy blocked direct fetches of several primary domains (dds.ca.gov, leginfo, KFF, NIH RePORTER), so some quotes come via search-index extracts of the named primary documents — each flagged below. Before any user-facing copy or contract relies on a flagged item, pull the cited PDF directly.

**Scoreboard: 24 claims checked → 13 confirmed · 6 partly true · 3 could-not-verify · 2 contradicted — and both contradictions hit the code-108 volume engine.**

---

## 1. The two findings that change the plan

### 1.1 Code 108 is the wrong service code for Waypoint's customers — CONTRADICTED

DDS Service Code Descriptions (January 2026): a Parenting Support Services vendor serves **"consumers … who are parents or who anticipate becoming parents"** — i.e., the Regional Center consumer is an **adult with I/DD who is raising (or expecting) children**. Waypoint's customers are the opposite case: parents *of* children with disabilities, where the **child** is the consumer and the parent is not.
Source: `dds.ca.gov/wp-content/uploads/2026/02/ServiceCodeDescriptions_January2026.pdf` (via search extract — pull directly to confirm).

**Consequences if confirmed:**
- The proposal's entire Channel 2 — "reaches the full ~525,000 caseload," $3,051/family/yr, the coach staffing model, the $58.68 rate — is attached to a code that funds a small subpopulation (I/DD adults who are parents), not Waypoint's market.
- The rates themselves are real (see §3), but they price the wrong service.
- **Action (new DDS question #0):** identify the correct vehicle(s) for RC-funded training/coaching of a consumer's *parents* — candidates to investigate with the vendoring RC include parent/family training codes attached to behavior services, social-recreation/camp family services, respite-adjacent supports, and the Family Support Services framework. Each has its own rate model, requirements, and possibly professional-licensure implications (a BCBA-adjacent parent-training code changes the staffing model entirely). Until the correct code and rate are confirmed in writing, the volume-channel economics are unknown — not merely thin.

### 1.2 Remote delivery of code 108 is unsupported — the proposal's own #1 risk, now substantiated

- The operative remote-services directive (D-2025-CommunityServicesDivision-003, 6 Mar 2025) authorizes remote delivery **only** for day programs, look-a-like day programs, independent living services, behavioral therapy, and Lanterman eligibility assessments — **through 31 Dec 2026**. Code 108 is not on it.
- The "extended to 2028" claim is right in substance, wrong in instrument: **SB 163 (2026-27 trailer bill, signed July 2026)** authorizes remote delivery of *specified* services through 31 Dec 2028 — but DDS's definitive remote-eligible list, billing subcodes, and guidance are **not due until 1 July 2027**.
- Supporting negatives: 108's rate-reform subcodes are only staffing ratios (100/200/300 = 1:1/1:2/1:3) with no remote subcode; the new eBilling remote-days field (G-2026-RegionalCenterOperations-001, eff. June 2026) applies to day-program/ILS/behavioral-therapy vendors — Parenting Support is absent; and 108's own service description specifies delivery "in the consumer's home and/or in the community."

**Consequence:** a remote-first volume channel cannot be assumed before mid-2027 at the earliest. Plan for in-person delivery economics (travel time in the utilisation denominator, geographic caseload density, mileage) or wait for the July 2027 list.

### 1.3 The SDP conflict-of-interest is a statutory bar, not a disclosure problem — CONTRADICTED (prototype design)

W&I Code §4685.8 *defines* an Independent Facilitator as a person "**not otherwise providing services to the participant pursuant to their IPP and … not employed by a person providing services to the participant**" (restated in the DDS IF directive of 21 Dec 2018 and the DDS SDP FAQ). A person providing other paid services to the family simply does not qualify as that family's IF.

**Consequences:** the prototype's Spending Plan Builder screen — Waypoint tagged "us" as a provider on a plan Waypoint facilitates — models an arrangement the statute precludes. The review's mitigation ("default to not doing it") must harden to **structural separation: a family is either a facilitation client or a services client, never both**, enforced in the product (block adding the operating entity as a provider on any plan where it is the IF). Secondary sources also indicate a parent/spouse cannot serve as the *paid* IF for their own family member. The ten-family acceptability interviews are still worth doing — but the design question they were meant to settle is already settled by statute.

---

## 2. SDP channel — verdicts

| # | Claim | Verdict | What the source actually says |
|---|---|---|---|
| S1 | IFs need no vendorization; DDS bars vendorizing SDP providers except FMS (codes 315–317) | **CONFIRMED** | DDS vendorization page + W&I §4685.8: IF cost "paid by the participant out of the participant's individual budget." Nuance: IFs must meet DDS standards/certification requirements (≠ vendorization); AB 143 directs standardized SDP procedures by Mar 2027. |
| S2 | Code 024 = initial person-centred plan, up to $1,000 | **CONFIRMED** | DDS PCP funding directives (2019 → Dec 2023 → July 2024). **Nuance that changes the pitch: 024 is purchase *reimbursement* paid by the Regional Center — it does not flow through the FMS.** Cap is directive-based, not statutory. |
| S3 | Code 099 = pre-enrolment transition supports, 40-hour cap | **CONFIRMED** (directive-based; current) | July 2024 guidance is operative; extra hours case-by-case. **Nuance: 099 is delivered by RC-*vendored* providers — DDS publishes a 099 vendor packet checklist. "No vendorization at all" is only true post-enrolment; most working IFs hold a 099 vendorization for the transition phase.** Watch: Nov 2025 SDP directives (D-2025-SDP-002/-003) added spending-plan certification/oversight; AB 143's "cost-effectiveness" directive was due 1 Aug 2026 and is reportedly late. |
| S4 | Undivided invoices the FMS (~$1,200/family/yr); NeuroNav paid from SDP budgets | **PARTLY TRUE** | Mechanisms confirmed, including NeuroNav's exact quote. **Price not confirmed: Undivided's advertised pricing today is $19/mo–$149/yr**; $1,200 resembles a retired tier. NeuroNav nuance: during *transition* the RC does pay (024 + 099); "budget pays, not RC" is true only post-enrolment. |
| S5 | SDP enrolment 7,459 (31 Jul 2025) · ~525k caseload · 21 RCs · $18.7B | **CONFIRMED**, mixed vintages | 7,459 per DDS's Sept 2025 SSDAC presentation. $18.7B is *revised 2025-26*; 2026-27 proposed $21.1B (enacted ~$21.6B per DRC); 525k is the 2026-27 projection (2025-26 ≈ 490k). Don't pair across years. |
| S6 | Typical certified budget $12k–$24k | **COULD NOT VERIFY — likely low** | No published average. ~$480M SDP spend ÷ 7,459 ≈ **~$64k/participant** implied average. The $12–24k range may fit school-age children (low POS history); as a program-wide "typical" it is not defensible. Segment it. |
| S7 | IF rates / caps | **CONFIRMED** (~$25–75+/hr; no rate cap) | No DDS dollar cap post-enrolment, but: budgets are *not increased* to fund the IF (zero-sum against services), transition compensation is capped (024+099), and the new certification regime gives RCs a lever on high rates. |
| S8 | IF-as-provider conflict | **CONTRADICTED as designed** — statutory bar, see §1.3 | W&I §4685.8 definitional exclusion. |

**Channel-ceiling implication:** the ~$13.6M statewide ceiling reconstructs arithmetically (7,459 × $1,200 + ~1,500 new/yr × ~$3,100) but now rests on an unverified $1,200/yr price anchor (the competitor charges $149/yr for its self-serve tier; full-service facilitation practices charge more — the range is wide and unpublished). Reprice from ten real facilitator quotes before the model's SDP lines are trusted.

---

## 3. Code 108 & rate system — verdicts

| # | Claim | Verdict | Notes |
|---|---|---|---|
| R1 | 108 = "Parenting Support Services," vendorizable | **CONFIRMED — but wrong population** (§1.1) | Consumer-as-parent, not parent-of-consumer. |
| R2 | 2026 rates: $58.68 (WRC/ELARC 1:1), $59.52 (SDRC 1:1), $24.24–24.59 per participant 1:3 | **CONFIRMED for ELARC $58.68 and SDRC $59.52** (Feb 10, 2026 rate-model PDFs); WRC and the 1:3 figures plausible but unverified — read the PDFs | Rates effective 1 Jan 2026; files re-issued 27 Apr 2026. Stray conflicting numbers circulate in secondary sources — trust only the DDS PDFs. |
| R3 | Rate build: $30.97 wage + 16.12% benefits + 4.83% workers' comp + 12% admin | **CONFIRMED** (LA/SD models) | Burns & Associates (HMA) rate-study products; wages are regionally adjusted — Bay Area models differ; models also include program support, mileage, premium components. |
| R4 | QIP: 10% of rate at stake; new vendors 100% for 45 days then drop to 90% | **PARTLY TRUE — mechanic is backwards** | Statute (from 1 Jan 2025): base rate = 90%, quality incentive = 10%. **A newly vendored provider starts at 90% and earns the 10% up** (register + validate in Provider Directory within 45 days of invitation; miss it and QIP waits for the next July cycle; 90-day failure suspends billing). FY2026-27 QIP adds surveys, EVV, HCBS Final Rule, audit items. **Model cash flow at 90% of rate for the first months, not 100%.** |
| R5 | Remote directive to 12/31/2028; 108 enumerated? | **PARTLY TRUE / UNSUPPORTED for 108** (§1.2) | Directive runs to 12/31/2026; SB 163 statute to 12/31/2028; DDS eligible list due 7/1/2027; 108 nowhere on any remote list found. |
| R6 | Rate reform complete, ~$3.5B/yr | **CONFIRMED** | LAO 2026-27: ~$3.5B total funds (~$2.1B GF). |
| R7 | RCs pay slowly (8% working-capital reserve) | **CONFIRMED in substance — actually faster than feared** | Monthly billing in arrears via DDS eBilling against POS authorizations; typical cycle: serve month M → invoice by ~day 5–8 of M+1 → paid mid-to-late M+1 (e.g., Alta: invoice by the 8th, paid by the 15th). No statewide Net-30 term; late submissions slip a cycle; claims must land within one year. The model's 8% receivables reserve looks conservative for RC billing (FMS timing varies). |

---

## 4. Vendorization & budget — verdicts

| # | Claim | Verdict | Notes |
|---|---|---|---|
| V1 | No vendorization moratorium | **CONFIRMED** (none found) | Open pipeline; transition wrinkles (codes 024/065/400 initially outside the digital process). |
| V2 | Can't deny vendorization for "lack of need" | **CONFIRMED** — Title 17 §54320/§54322 | Key nuance: **vendorization never obligates an RC to purchase**. |
| V3 | Statewide digital application since Mar 2026 | **CONFIRMED** | Live Dec 3, 2025; **mandatory 1 Mar 2026** (Provider Directory phase 2; D-2025-RegionalCenterOperations-004REV). SDP providers (except FMS) excluded. |
| V4 | One vendorization = statewide reach | **PARTLY TRUE** | Vendored by the RC where you're located; any other RC *may* purchase as a "utilizing RC" under the same vendor ID without re-vendorization — but none must. At some RCs "courtesy vendorization" means a *new* vendorization, the opposite of the claim's implication. |
| V5 | Physical-office requirement sunsets 1/1/2027 | **CONFIRMED** | SB 163 (Ch. 80, Stats. 2026, signed 13 Jul 2026) repeals the in-catchment physical-location requirement eff. 1/1/2027 unless the service needs a site. |
| V6 | No direct Lanterman cuts; ~$45M SDP reduction proposed for 2026-27 | **PARTLY TRUE** | DRC on the enacted 2026-27 budget: no direct Lanterman cuts; DDS grew $18.7B → $21.6B. The SDP reduction ($22.5M in 2025-26 → **$45.5M ongoing** via budget "guardrails") was **enacted in 2025** and continues — not a new 2026-27 proposal. 2026-27 also added: grievance process (Feb 2027), RC board reforms, remote-services statute, vendorization changes. |
| V7 | Federal shocks (IDEA→HHS; OCR→DOJ; ~$1T Medicaid; +46% state complaints) | **3 CONFIRMED, 1 PARTLY** | IDEA day-to-day administration delegated to HHS (June 2026, contested; statute stays with ED). OCR investigation work shifted to DOJ (partial). Medicaid: ~$1T of cuts **over 10 years** enacted July 2025 — only early provisions in effect; big levers hit Dec 2026–2028 ("began" overstates). Complaints +46% confirmed (CEC/NASDSE, 31 states: 7,907 → 11,523). |
| V8 | LLC fee $6,000 at $1–5M vs corporation | **CONFIRMED** | R&TC §17942 tiers ($900/$2,500/$6,000/$11,790) + $800; fee is on gross "total income," cliff tiers. Corporations: 8.84% on net income, $800 min — the comparison favors the corporation only at low margins, which is Waypoint's case. |
| V9 | Benefit corp $100+$25+$800 vs B Corp ~$2,100/yr, V2 pass/fail | **CONFIRMED** | New B Lab standards (Apr 2025, in force 2026): pass/fail across seven topics, score retired; audit pass-through costs new for 2026. Benefit-corp status and B Corp certification are orthogonal. |

---

## 5. Market & evidence stats — verdicts

| # | Claim | Verdict | Notes |
|---|---|---|---|
| M1 | 75% of Medicaid CSHCN families $0 OOP; >4-in-10 CSHCN on Medicaid | **PARTLY TRUE** | Coverage confirmed (~47%, KFF/MACPAC). **The 75%/$0 figure could not be sourced** — citable substitutes: 78% of Medicaid-only CSHCN parents call OOP costs "always reasonable"; only 6–16% incur $1,000+; federal law bars cost-sharing for Medicaid children. The strategic point (consumer-pay excludes Medi-Cal families) survives on the substitutes. |
| M2 | <1% of denials appealed; ~⅓ overturned | **CONFIRMED** | KFF 2024 Marketplace data (66% upheld). Marketplace-only scope. |
| M3 | >80% of HCBS waitlist already qualify for state-plan services | **CONFIRMED** | KFF 2016–2025 analysis; state-plan services are typically less intensive. |
| M4 | 4.5× therapy gap, Latino LEP families | **PARTLY TRUE** | Study real (Zuckerman 2017, *Pediatrics*, n=352, 3 cities): direction confirmed; the 4.5× multiplier is in paywalled tables and it is **not** a California/RC-specific study. Verify before user-facing use. |
| M5 | Advocates $150–300/hr | **CONFIRMED** (mid-to-upper range; $50–125 entry; attorneys $500+) | Industry surveys, not peer-reviewed. |
| M6 | Cochrane 2021: 22 studies, 2,404 participants, null on 7 outcomes | **CONFIRMED** with framing caveat | "No evidence of either benefit or harm," low/very-low certainty — "no evidence of effect," not "proven no effect." Parents *perceive* peer support as valuable. Forum cut still justified. |
| M7 | Understood.org shut community → Facebook; Undivided community is a Facebook group | **CONFIRMED** | Wunder community discontinued Aug 2024. |
| M8 | Undivided R41 $252,262; NICHD STTR 14.8%; next deadline Jan 5 2027; STTR PI at university | **MIXED** | PI rule **confirmed** (STTR PI may sit at the research institution, ≥10% effort). **Deadline claim wrong: next standard NIH deadline is 5 Sep 2026 (obs. 8 Sep), then 5 Jan 2027.** Grant amount and 14.8% plausible but unverified (RePORTER blocked) — check reporter.nih.gov. |
| M9 | SSI 2026 FBR $994/mo + CA supplement | **CONFIRMED** | SSA 2026 COLA (2.8%): $967 → $994; CA SSP ~$240 (varies by living arrangement). |
| M10 | Undivided's $63k value claim, no methodology | **CONFIRMED** | "$63,000 per year in benefits and services" on their pricing page; internal survey; no public methodology. Soften to "no *publicly disclosed* methodology." |

---

## 6. Internal arithmetic — independently re-derived (all reproduce)

Reconstructed from scratch; the model is internally consistent and its hidden assumptions are now explicit:

| Quantity | Claimed | Re-derived | Hidden assumption exposed |
|---|---|---|---|
| Loaded coach payroll | $77,913 | $77,913 ✓ | $30.97 × 2,080 × (1 + 16.12% + 4.83%), burdens additive on wage only |
| Coach revenue @65% util | $82,582 | $82,584 ✓ | **1,976 paid hrs/yr** and **40% of hours at the 1:3 rate** ($72.72) |
| Gross margin | 5.7% | 5.7% ✓ | Zero admin cost counted; the rate's 12% admin allowance is already consumed by sub-model utilisation |
| Break-even utilisation | 67% (1:1) / 54% (1:3) / "~63%" blended | 67.2 / 54.2 ✓ / 61.3% at 40% mix | The "63%" headline corresponds to a ~30% group mix |
| Value of +1pt utilisation | ~$1,200/coach/yr | $1,270 ✓ | — |
| GM at 72% util | ~15% | 14.8% ✓ | — |
| 108 per family/yr | $3,051 | $3,051 ✓ | 52 wks × 1 hr × $58.68 |
| Families for $1M | 833 SDP / 330 code-108 | 833 / 328 ✓ | — |
| Consumer kill-math | 7,540 payers / 126k registered | $1M÷$144 = 6,944 payers | Implies $11.05 ARPU (minor inconsistency) and a **generous 6% free→paid conversion — at a typical 3%, ~250k registered needed. Their case is understated.** |
| SDP ceiling | ~$13.6M | $8.95M ongoing + $4.6M transition ✓ | Rests on the **unverified $1,200/yr price** and ~1,500 new enrolments/yr |
| Conservative case | −$218k | −$218k ✓ | $1.21M × 30.3% − $585k |

**Exposures the arithmetic reveals:** (1) margin assumes coaches are paid exactly the rate-model wage — a market wage above $30.97 turns the channel negative immediately; (2) the 40% group mix is an operational achievement assumed as an input; (3) QIP correction (§3 R4) means first-months revenue is 90% of all these figures; (4) the facilitator-side assumptions (58-family caseloads, 63–84% SDP margins) sit in `Waypoint-Bootstrap-Operating-Model.xlsx`, which was not provided — unauditable until shared.

---

## 7. What the audit changes in the recommendation

1. **The strategic direction survives; Channel 2 as specified does not.** "Free to family, paid by the payer" and the Phase-1 SDP sequence remain sound. But the code-108 volume engine is attached to the wrong beneficiary population *and* lacks remote authorization. **New first question for DDS/the vendoring RC (before the four in the proposal): which service code(s) actually fund training/coaching for the *parents of* a consumer, at what rate, with what staff qualifications?** Until answered, treat all Phase-3 economics as unknown.
2. **Rewrite the transition-revenue mechanics.** 024 is RC-reimbursed and 099 requires a 099 vendorization — "no vendorization, invoice the FMS" describes only ongoing post-enrolment facilitation. Phase 1 scope should include the 099 vendor packet, and the FMS-invoicing epic (E7) needs an RC-reimbursement path added.
3. **Hard-code the IF separation.** The statute, not policy, prevents Waypoint from being IF and provider to the same family. Product change: block the operating entity as a provider line on any plan it facilitates; run facilitation and services as separate books of families.
4. **Re-price the SDP model** from real facilitator quotes (the $1,200 anchor is unverified; the competitor's advertised price is $149/yr for self-serve) and re-segment budget assumptions (child budgets ≪ the ~$64k implied program average).
5. **Model QIP at 90% of rate for a new vendor's first months** (upside on validation, not downside from 100%).
6. **Cash-flow relief:** RC eBilling actually pays ~2–6 weeks after month-end — the 8% receivables reserve is likely conservative for the RC channel; FMS timing still needs validation.
7. **Fix small factual errors before anything is user-facing or grant-bound:** next NIH STTR deadline is 5 Sep 2026 (then 5 Jan 2027); the "$45M SDP cut" is an enacted-2025 ongoing reduction, not a pending proposal; "$18.7B" is 2025-26 (enacted 2026-27 ≈ $21.6B); the 75%-zero-OOP and 4.5× figures need sourcing or substitution; the Cochrane result is "no evidence of effect," not "proven null."
8. **Unchanged by the audit:** the consumer-subscription kill-math (if anything stronger), the vendorization window (confirmed open: no moratorium, no lack-of-need denial, digital statewide application, physical-office repeal 1/1/2027), the entity choice (corporation over LLC confirmed), the forum cut, and the free-family-tier funnel.
