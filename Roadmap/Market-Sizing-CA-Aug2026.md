# California Market Sizing — Children with Disabilities, by Layer

**22 August 2026.** Primary-source market pyramid for Waypoint: how many families exist at each layer, who they are, and who can pay. Companion to `Payer-Funded-Pivot-Review-Aug2026.md` and `Assumptions-Audit-Aug2026.md`. Sources: CDE CalEdFacts/DataQuest, LAO DDS budget reports, DDS Autism Report (Apr 2026), DDS POS disparity data, NSCH/DHCS, Public Counsel. Some exact table values sit in proxy-blocked workbooks and are flagged; estimates are labeled.

## The pyramid (California, latest available year)

| Layer | Families/children | Share of CA's ~8.6M children | Who pays Waypoint here |
|---|---|---|---|
| Children with special health care needs (NSCH 2022) | **~1.36M** (15.8%) | 16% | Nobody yet (free tier; future CalAIM/health plans) |
| Students with IEPs (2025-26: 883,862 ages 3-22; 850,822 TK-12) | **~850–884k** | ~15% of students | No direct payer (districts are the counterparty); free tier, grants, future B2B |
| 504-only students (est. from national CRDC ~4%) | **~200–230k (estimate)** | ~4% | Same as IEP layer |
| DDS/Regional Center consumers, all ages (FY 25-26 revised) | **489,254** (526,848 projected 26-27) | — | RC-purchased services *if the right code exists* |
| DDS consumers ages 0-21 (derived: 66,186 Early Start + 11,992 provisional + 3-21 share of 386,987 Lanterman) | **~250–270k (estimate — exact count in data.ca.gov age dataset, blocked)** | ~3% | The serviceable payer-funded market |
| — of which autism | ~164k under 22 (78.7% of ~209k ASD caseload; ASD = 54% of Lanterman caseload, +162% in 10 yrs) | — | Fastest-growing segment |
| SDP participants (31 Jul 2025) | **7,459** | 0.09% | FMS-invoiced facilitation (today's Phase 1) |

**Read: SDP is ~0.9% of the IEP market and ~3% of the DDS child market. It is a beachhead, not a market.** Even tripling SDP enrollment (~22k) leaves it a niche. The durable markets are the ~250-270k DDS children (payer-funded services — pending the service-code answer) and the ~850k+ IEP families (free tier / equity-grant / future B2B2C).

## Income & demographics by layer

**Special education (IEP) students:**
- ~64% economically disadvantaged (PPIC)
- ~58% Hispanic/Latino (2020, SPP-TAP; overall K-12 ~55%); Black students overrepresented
- ~188k (23-25%) dually identified English learners (Sept 2024)
- Autism: 169,430 IEP students (19.9% of SpEd, 2023-24), share doubled since 2011; SpEd grew ~20% over a decade while total enrollment fell ~8%

**DDS/Regional Center consumers:**
- Hispanic = largest group, ~40% of caseload (2021 snapshot; largest share gain 2010-2020)
- Spanish primary language: ~19% of consumers (~70k, 2021)
- **Medi-Cal: 79% of all consumers; 71% of child consumers** (LAO)
- POS spending disparity: Latino consumers receive ~$0.41 per $1.00 spent on White consumers (latest reported ratio); FY15-16: White $22,140/yr vs Hispanic $11,238; the 10 RCs serving majority Black/Latino caseloads authorize ~$3,887 less per client than the 11 majority-White/Asian RCs; the state's $66M disparity-reduction spend judged "largely ineffective" (Public Counsel 2025)

**CSHCN (NSCH/DHCS):**
- ~40% of CA CSHCN households under 200% FPL; 37% on public insurance (2016-19 vintage; 2022-23 updates exist at childhealthdata.org — pull for exact current splits)

**Target-catchment caseloads (FY 2024-25 performance reports):** RCEB ~27,550 · NLACRC ~37,990 · SCLARC ~22,350 · Harbor ~19,030 · SGPRC ~17,350 · ELARC ~15,820 · Lanterman ~14,100 · Westside ~11,910 → **LA County's 7 RCs ≈ 138,500 (~30% of state)**. Highest ASD shares: Lanterman/Harbor/NLACRC (63%).

## What the numbers say strategically

1. **The demographics prove the free-tier thesis three times over.** Majority low-income (64% SED / 71% of DDS kids on Medi-Cal), majority Latino (~58% of SpEd), heavily Spanish-speaking. A $12/mo consumer product excludes most of this market; a free, Spanish-capable one is the only product shape that reaches it.
2. **SDP-only is not a company.** 7,459 families statewide (~0.9% of IEP families). Phase 1 is a beachhead and a revenue bootstrap — the model's growth must come from a layer with six figures of families.
3. **The DDS child layer (~250-270k) is the serviceable payer-funded market** — 71% on Medi-Cal, autism-driven, growing fast. Whether Waypoint can sell into it hinges entirely on DDS question #0 (the correct service code for parent-directed training/coaching).
4. **The disparity data is a business case, not just a mission statement.** DDS is under public pressure (Public Counsel 2022/2025) for a Latino-White spending gap its $66M program didn't fix. A provider whose model is "we get underserved (largely Latino, Spanish-speaking) families to services, and we can prove it with outcomes data" is selling RCs the exact thing they're being criticized for lacking — and is a strong candidate for DDS service-access-and-equity grant funding.
5. **The IEP layer (~850k, +504s) is where the free app wins users but no one pays today.** Districts are the adversary, parents are low-income. Monetization there is indirect: funnel into RC-funded services, grants, outcomes-driven B2B later. It's also 100x the SDP pond — which is why the funnel, not the facilitation practice, is the long-term asset.
6. **Catchment pick:** RCEB (~27.5k) is a solid home catchment; LA County (~138.5k across 7 RCs, three of them 63% ASD) is the scale market one vendorization can reach as a "utilizing RC" seller — subject to each RC choosing to purchase.

## Will Regional Centers pay for the app itself?

Almost certainly not as software. The DDS payment architecture (verified in `Assumptions-Audit-Aug2026.md`) buys *human service hours* against per-family POS authorizations at wage-built rates; there is no service code for a software subscription, and no consumer app appears on any RC vendor list found. **Three narrow exceptions, none of which is "250k app licenses":**

- **Human-wrapped service:** an RC pays for a *navigator/coach service* (delivered efficiently because of the app) per family — this is the plan's actual model, pending the service-code answer (DDS question #0).
- **RC staff tooling:** RCs' own service coordinators carry brutal caseloads (~1:66+ vs. statutory targets). Selling Waypoint's caseload/triage tooling to the 21 RCs *for their coordinators* is a legitimate small B2B channel (21 buyers, operations budgets) — worth one slide, not a business plan.
- **Equity pilots:** DDS disparity/service-access grants fund navigation pilots — real money, but that's the grant channel already correctly discounted as neither sustainable nor scalable.

## Flagged for manual pull (proxy-blocked exact values)
- Exact DDS 0-21 count: data.ca.gov "Consumers Served by Age Group and Gender" (updated Apr 2026)
- FY 2023-24 POS workbooks: current ethnicity %, language %, per-capita $ by ethnicity (new methodology)
- NSCH 2022-23 CA CSHCN income/insurance splits (childhealthdata.org)
- 2024-25/2025-26 SpEd disability-category and race breakdowns (DataQuest)
- CA-specific 504 count (CRDC query)
