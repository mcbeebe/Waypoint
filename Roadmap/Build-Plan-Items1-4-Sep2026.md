# Build Plan — Roadmap items 1–4

**Date:** Sep 13, 2026 · **Status:** draft — phases 2+ need the owner's go
**Supersedes:** nothing. **Implements:** `Product-Roadmap-Sep2026.md` items 1–4
**Superseded-by:** —

*The roadmap said what to build and why. This says in what order, in which
files, behind which gate, and how each phase proves itself. Item 5 (the Outcomes
Readout) is deliberately excluded — it leaves the desk and is gated on HIPAA and
consent work that is not engineering time.*

---

## How to read the gates

Per `CLAUDE.md`, each phase is one of:

| Gate | Meaning |
|---|---|
| **AUTO** | Pure logic or dev tooling. Gates green → ships. |
| **OWNER** | Family-facing, tone-bearing, schema, or edge function. `/adversary` memo in the PR, then wait. |
| **OPS** | Not code. A migration applied by hand, a packet submitted, a decision recorded. |

The draft-flow standing grant does **not** extend to any of this. Nothing below
merges to `main` on my own judgement except the AUTO phases.

---

## Phase 0 · The operational unblock — OPS, and it is not mine

Stated once so the plan is honest: migrations 043+ applied, RLS verification
queries run, Stripe Payment Links + webhook secret created, 099 packet
submitted, initiative 003 Lane B deployed. **Every phase below lands into a
product that does not fully run until this is done.**

---

## Workstream A · Grounded answers *(roadmap item 2)*

Sequenced first because items 1 and 4 each multiply the volume of cited content
in the product. Building them before the gate exists means scaling a risk that
currently cannot be measured.

### A1 · The statute audit module — **AUTO** · ~1 day

The one piece that needs no permission: a pure module, no UI, no network, no
schema.

**The problem it solves.** `contentSources.test.ts` already guards *structured*
citation fields — it enumerates what content modules emit and fails on orphans.
It cannot see a statute asserted **in prose**. A scan of `src/lib` and `src/data`
finds statute-shaped strings in running text that have no registry entry, among
them `W&I §4642`, `W&I §4648`, `Health & Safety Code §1374.73` and the
`W&I Code §4731` spelling variant.

**Why a regex over `covers` is not enough.** The registry stores *exact display
strings* (`'W&I §4646 · §4646.5(b)'`). Prose says the same law a dozen ways:
`W&I §4646.5`, `W&I Code §4731`, `Welfare and Institutions Code section 4643`.
So both sides normalise to a **citation atom** — code + section + optional
subsection — and comparison happens there.

- New: `src/lib/statuteAudit.ts`, `src/lib/statuteAudit.test.ts`
- Handles: the `·`-separated continuation form, where a bare `§56501` inherits
  the preceding code and an explicit `34 CFR` switches it; subsection→section
  fallback, so `§4646.5` resolves against an entry covering `§4646.5(b)`.
- **Exit:** module green under `npm test`; a one-off report of what the repo's
  prose currently asserts without a registry entry. **Report only — no existing
  test starts failing.**

### A2 · Close the prose gaps — **OWNER** (registry content is a legal claim) · ~1 day

Take A1's report and either register each authority (title, URL, `verifiedOn`,
claim) or correct the prose. Only once the list is empty does the audit become a
gate rather than a report.

- Touches: `src/data/contentSources.ts`, plus the prose sites it names.
- **Exit:** the audit reports zero uncovered atoms; the check is promoted to a
  failing test in the `logic` project.

### A3 · Ground the answer, then gate it — **OWNER** (edge function + family-facing) · ~2 wks

Two halves, one PR each.

**A3a — structural grounding.** Pass KB articles to the model as `document`
content blocks with citations enabled, so the response carries the cited span and
a character range in the source rather than a statute the model composed. Feed
that span into the `Citation.tsx` that already ships. Note the constraint:
citations are incompatible with structured output formats, so the chat path uses
citations and the JSON paths use structured outputs.

**A3b — the answer gate.** Extend `scripts/prompt-regression.mjs` with a second
pass over the full Navigator path, scored two ways: A1's hard check against the
registry, and an LLM judge over the 78 `expectedBehavior` rubrics that are
already written and currently read by nothing. **Report-only for two weeks** so
the real baseline is known before it blocks anything.

- Touches: `supabase/functions/ai-proxy/index.ts`, `scripts/prompt-regression.mjs`,
  `.github/workflows/prompt-regression.yml`.
- Fix in the same PR: the classifier prompt is duplicated between `src/lib/ai.ts`
  and the regression script, held together by a "must mirror" comment. Move it
  server-side beside the Navigator prompt.
- **Exit:** a published pass rate, and a statute cannot reach a parent without a
  registry entry behind it.

---

## Workstream B · The Adult Transition *(roadmap item 1)*

### B1 · The arc, on paper — **OWNER** · ~3 days

Per the owner preference, a new user-facing flow gets a short plan plus
design-canvas mockups before code. The arc is age-keyed, which makes it the first
non-diagnosis journey in `journeyMaps.ts` — a small architectural decision worth
taking deliberately rather than discovering.

Content scope: the SSI age-18 redetermination, the IEP transition plan (by 16 in
California), DOR referral, school exit, and the conservatorship-alternatives
decision window. **Supported decision-making is presented first and
conservatorship is never a default recommendation** — the escalation-tone rule at
full force. This needs a credentialed read, not just `/adversary`.

- Deliverable: `Roadmap/initiatives/009-adult-transition/` (intent, plan) +
  mockups. It clears the initiative bar on every axis.

### B2 · Registry first, then content — **OWNER** · ~1 wk

Every statute the arc asserts gets a registry entry **before** the prose exists.
A2 will have just finished paying down exactly this debt; do not re-incur it in
the same quarter.

### B3 · The clocks and the rung — **OWNER** (schema) · ~2–3 wks

Age-triggered clocks in `requestClocks.ts`, a triage rung in `homeTriage.ts` so
the cliff surfaces on Home unprompted, letters in `lettersCatalog.ts` (DOR
referral, transition-assessment request, records request).

**The honest cost:** `request_type` is a `text ... check (...)` constraint
(`037_family_requests.sql:15`), so new clock types need a hand-applied migration
— Phase 0's problem, recurring. Batch this migration with C2's.

- **Exit:** a family with a 15-year-old sees a transition item on Home without
  searching, and the item cites a statute they can tap.

---

## Workstream C · The Binder *(roadmap item 3)*

### C1 · The portrait, on paper — **OWNER** · ~2 days

Mockups for the one-page "all about me" and the sectioned binder. The prompts are
lifted verbatim from `src/screens/staff/PCPBuilderScreen.tsx`, where they are
already written and pointed at facilitators.

**Two traps, both already known.** Do **not** write to `sdp_cases.pcp_draft` —
`pcp_completed_at` unlocks a code-024 invoice line, and a family self-completing
there creates a billable line with no facilitator time behind it. And
`entitlements.ts:105` currently lists `'Document binder + export'` under Premium,
which would gate a family's portrait of their own child; that line is a bug, and
fixing it is part of this workstream, not a follow-up.

### C2 · Fields and migration — **OWNER** (schema) · ~1 wk

`children.vision`, `children.strengths`, `children.supports`. Resolve the
`providers` / `family_contacts` duplication first or the printed Care Team lists
the service coordinator twice. Batch with B3's migration.

### C3 · The export — **OWNER** · ~1–2 wks

Two documents off the `requestDossier.ts` pipeline pattern, **kept separate from
the request dossier**: the provenance machinery is right for a hearing officer
and wrong for a first appointment with a new OT. Offer it from the triage
deadline rung ("Print Teddy's one-pager for Thursday"). Attach the cited $1,000
facilitator lever from `sdpJourney.ts:166`.

- **Exit:** a family prints a one-pager before a meeting they never told Waypoint
  about.

---

## Workstream D · The Learn engine *(roadmap item 4)*

Initiative 004 exists with intent and plan written, awaiting the owner's go. Not
re-planned here; sequenced.

### D1 · Approve the scope — **OWNER** · hours

~40 articles, each derived from a module that already exists, each carrying a
citation and a reviewed-on date, each ending in an action the app performs.
Approve that, **not** phase 8's original "dozens, then hundreds" — the single
most dangerous line in the roadmap for a solo owner.

### D2 · The derivation pass — **AUTO** once scope is approved · ~3–4 wks

Generate through the **Batch API at half the standard cost**; nothing
family-facing is waiting on the result. Every article is generated *after* A3's
gate exists, so the citation guarantee is enforced rather than hoped for. **This
dependency is the entire argument for ordering workstream A first.**

### D3 · Reader and SEO — **OWNER** · ~2 wks

`ArticleScreen.tsx` and `Citation.tsx` already exist. The marketing surface is
`waypoint-site/`, which has its own gates and a `content-review` label that never
auto-merges.

---

## The critical path

```
Phase 0 (OPS) ──────────────────────────────────────────────┐
                                                            ▼
A1 ─→ A2 ─→ A3a ─→ A3b ═══════════════════════════════════╗ │
  (AUTO) (OWNER)   (OWNER)                                 ║ │
                                                           ║ │
        B1 ─→ B2 ─→ B3 ┐                                   ║ │
                        ├── shared migration window        ║ │
        C1 ─→ C2 ─→ C3 ┘                                   ║ │
                                                           ▼ ▼
                                    D1 ─→ D2 ─→ D3  (needs A3b)
```

**A1 is the only phase that needs nothing from anyone.** It starts now.

---

## What this plan does not promise

- **No date estimates survive the owner-review queue.** Every phase but A1 and D2
  is `[owner]`-gated. The plan's duration is dominated by review latency, not by
  engineering, and pretending otherwise would make the schedule fiction.
- **B3 and C2 both need hand-applied migrations.** At 61 and counting, that is
  the standing operational risk named in the level-up plan, and this plan adds
  two more rather than reducing it.
- **The conservatorship content may need a lawyer, not an agent.** If a
  credentialed read is not available, B1's scope should shrink to the benefit and
  education dates and leave the legal-capacity question out entirely rather than
  guess at it.
