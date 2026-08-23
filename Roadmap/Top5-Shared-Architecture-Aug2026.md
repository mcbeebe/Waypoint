# Top 5 Options — Shared Technical & Operational Architecture

**23 August 2026.** Breakdown of the five ranked options (SDP facilitation · consumer premium · employer white-label · district parent-layer/SB 445 · platform licensing) into their shared technical underpinnings, UX patterns, and operational machinery — and the places where reuse honestly breaks. Companion to `Options-Stack-Rank-Aug2026.md`.

## 0. The thesis

The five channels differ almost entirely in **who pays and how the family arrives** — not in what the software does. Roughly 70–80% of the build is one shared platform; each channel adds a thin door. This is why the portfolio strategy is affordable for a solo founder: you are not building five products.

## 1. The seven shared platform components

| # | Component | SDP (1) | Consumer (2) | Employer (3) | District (4) | Platform (5) |
|---|---|---|---|---|---|---|
| A | **CA knowledge engine w/ provenance** (KB, entity matrix, rates, statutes, staleness) | Core | Core | Core | Core | Licensed core |
| B | **Document intelligence** (IEP/IPP parse, OCR, analysis, plain-language) | Core (PCP, plans) | Core (premium feature) | Core (case prep) | **The product** (IEP → summary) | Licensed |
| C | **Translation layer** (AI draft + certified human review + audit trail) | High (ES families) | High (ES funnel) | Med | **The product** (SB 445) | Licensed |
| D | **Service-event & billing spine** (events, authorizations, invoices, AR) | **The product** (FMS invoicing) | — | Per-case billing | — (PO invoicing only) | **The product** (licensed) |
| E | **Roles, consent, tenancy, RLS** | Core (staff paths) | Core (family-only) | Partner role | District role + **data wall** | **The product** (org tenancy) |
| F | **AI assistant w/ guardrails** (server prompts, confidence gating, regression CI) | Coach copilot | Navigator | Navigator | Parent Q&A (stricter posture) | Licensed |
| G | **Outcomes/evidence engine** | QIP + sales | Value proof | Retention ROI | Dispute-reduction proof | Customers' QIP |

**Read the columns:** channel 2 (consumer) is components A+B+C+F plus a paywall. Channel 4 (district) is B+C at full strength plus one integration. Channel 5 is D+E productized. Nothing requires a second codebase.

## 2. The user's intuition, made precise: one parent surface, five doors

Selling direct to parents and selling to parents via SELPAs (or employers, or facilitators) is **the same parent-facing app** — answer-first eligibility, plain language, provenance on every claim, deadline clocks, Spanish-first. What changes per door is a thin **entitlement + theming + CTA layer**:

| Door | Who paid | Branding | Entitlement | The CTA that differs | Guardrail posture |
|---|---|---|---|---|---|
| Direct (2) | Family (or free) | Waypoint | Free vs premium flag | "Upgrade" / "Book a navigator" | Full advocacy voice |
| Via facilitator (1) | FMS from SDP budget | Waypoint | Served-family | "Message your facilitator" | Full advocacy + service records |
| Via employer (3) | Employer through partner | Co-branded (Cleo/Wellthy) | Partner-entitled | "Talk to your care guide" | Full advocacy, partner SLA |
| Via SELPA (4) | District (IDEA/ADR funds) | District-cobranded, separate product line | District roster | "Ask your IEP team" / "Request translation" | **Neutral-explainer voice — no litigation coaching in district context**; hard data wall |
| Via licensed org (5) | The licensee's payer | Licensee-branded | Licensee roster | Licensee's workflows | Licensee-configured |

Engineering translation: one `families` record, one app, plus `acquisition_source`, an entitlement table (who sponsors this family, what features), a theming config per sponsor, and a per-sponsor guardrail profile in the server-authored system prompt. This is days of work per door — *if* tenancy and consent exist from Phase 1.

## 3. One expert console, four tenants

The staff surface (caseload table with explainable "why now" ranking → case detail with statutory clocks → evidence-grade records) serves:
- Waypoint facilitators (1) — SDP pipeline clocks, hour caps, spending plans
- Licensed facilitators/vendors (5) — identical screens, different org_id
- Partner care guides (3) — read-only case status for families they referred
- District SpEd staff (4) — delivery/compliance status only (translation delivered, documents accessed), **never** family advocacy content

Same components, different role-scoped queries. The prototype's Caseload/Case Detail screens are the design spec for all four.

## 4. The universal interaction pattern: "AI drafts, the human authors, the record is audit-grade"

One pattern, five uses — build the machinery once (per-field AI provenance, human sign-off, immutable audit trail, versioning):
- Progress notes drafted → coach signs → supervisor countersigns (1)
- IEP translated by AI → certified translator reviews and signs → delivery receipt timestamped (4 — the SB 445 compliance artifact *is* the audit trail)
- Letters/appeals drafted → parent edits and sends (2)
- Case summaries drafted → navigator reviews before partner handoff (3)
- All of the above, licensed (5)

Same for the **statutory-clock engine** (15-day/60-day IEP clocks, SDP pipeline dates, authorization expiries, SB 445's ~30-day translation window) — one deadline engine (`useDeadlines` already exists), many clock types.

## 5. Shared operational machinery

- **Credentialed-human network ops**: facilitators (1), certified translators (4), escalation navigators (3) are the same operational shape — recruit, credential (`staff_credentials`), assign, QA/countersign, pay. One ops playbook.
- **Receivables/invoicing ops**: FMS invoices (1), district POs (4), partner per-case invoices (3), licensee subscriptions (5) — one AR view, different payer types (the `invoices.payer_type` enum already designed).
- **Sales collateral from the outcomes engine (G)**: every channel's pitch is a different cut of the same data — days-to-service and $ secured (1, 2), retention/absence (3), disputes avoided and translation SLA hit-rate (4), utilisation/QIP (5).

## 6. Where reuse honestly breaks (budget for these)

1. **Compliance regimes differ**: services side (1, 3) is HIPAA-adjacent (BAAs, clinical-adjacent records); district side (4) is **FERPA + California student-privacy** (SOPIPA, AB 1584-style data-privacy agreements, likely the statewide CSDPA template). Different contracts, different data-handling rules, different DPAs. Don't blur them.
2. **SEIS interop (4)** is a unique integration: ingest IEP documents/exports from a system with no public API — realistically starts as PDF/export ingestion (which the existing OCR/analyze pipeline handles) before any formal integration.
3. **The data wall (4)**: district deployments must be architecturally incapable of leaking family advocacy activity to districts — separate schema scopes and a published data policy. The tenancy/consent framework enables it, but the wall itself is deliberate extra work, and the separate brand is an ops/marketing cost.
4. **Partner SLAs (3)**: white-label means someone else's brand depends on your response time — a support/on-call posture the consumer app doesn't need.
5. **Billing spine (D)** is genuinely unneeded by 2 and 4 — don't let the services schema leak payer concepts into the family or district surfaces (conflict C-3's lesson, generalized).

## 7. Build-order consequence

Phase 1 as already planned (funnel + SDP + tenancy + consent + doc intelligence + guardrails) **is** the platform core: components A, B, D, E, F at first strength. The marginal cost of each additional door, once that lands:
- Consumer premium (2): ~2–3 weeks (entitlements + payments)
- Employer door (3): ~2–4 weeks (co-brand theming, partner role, case-status view) + BD
- District pilot (4): ~6–10 weeks (translation certification workflow, delivery receipts, FERPA DPA pack, district role + data wall, export ingestion) — the largest increment, and why it's ranked behind 2 and 3 despite bigger upside
- Platform (5): ~2 days now (tenancy columns), then packaging/support when first licensee signs

The strategic conclusion: **every dollar of Phase-1 engineering is a platform dollar.** The five channels are not competing bets to choose between — they are five monetizations of one build, sequenced by sales-cycle length.
