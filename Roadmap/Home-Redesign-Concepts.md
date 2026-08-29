# Home Redesign — Three Concepts from the 20-Persona Audit

**Date:** Aug 29, 2026 · **Status:** Proposal — awaiting owner pick before any build
**Inputs:** 20-caregiver persona audit of the full Home page (68 agents; 10 confirmed
themes + emergent critique), then a 5-way concept competition judged by a 3-judge
panel on: resolves-the-findings, serves-the-3am-parent, distinctness, feasibility.

## What the audit proved (the bar every concept must clear)

Ten confirmed failures, in persona-count order: dead $0 Financial Snapshot (20);
inert RC phone number (19 — **already fixed**, now tap-to-call); blocking
English-only tutorial (19); canned empathy card (14); duplicate contradictory
"WAYPOINT NOTICED" cards (11); permanent ✕ dismissal with no undo (11);
"Everything / Waypoint only" jargon pills (10); false letter-history profile
nudge (9); confident wrong eligibility claims (8 — Early Start clock **already
fixed**); silent shared snoozes (8). The critic added: a 15-section scroll with
7 competing CTAs, dead scaffolding at minute zero, no offline/loading states, no
return-visit loop, and no single job for the page.

All three concepts below resolve **all ten** confirmed themes — they differ in
what Home fundamentally *is*.

---

## Option A — The Next Right Thing *(unanimous #1 across all three judges)*

**Home stops being a dashboard and becomes a decision.** A deterministic,
auditable triage engine ranks everything Waypoint knows and renders exactly
**one card**: one honest kicker with provenance ("DEADLINE — due Thu, Sep 4",
never "WAYPOINT NOTICED"), one concrete action (a call action IS a tel: link;
a reply action is *read first*, draft inside), one "why this is first" sentence
citing its source, and one quiet deferral ("Not today — shows the next thing;
this one returns tomorrow"). Priority ladder: resume interrupted work → crisis →
overdue clock → unanswered reply → due today → clock inside window → one
question → one verified opportunity → an **earned calm state** ("Nothing has a
clock on it today. You can close the app."). Below the card: one
tell-Waypoint input (search + crisis vocabulary + Ask-AI fallthrough — the
"nothing found" dead end dies), and one collapsed "Everything else" layer
(this week / waiting / set-aside-with-undo / contacts / the hybrid-v2 Tools
area kept verbatim, one tap down).

- **Strongest at:** the overwhelmed 45-second parent; structural honesty (one
  slot = contradictions unrepresentable); accessibility (one card = TTS-linear).
- **Costs:** veterans lose glance density (they live in Actions/Calendar);
  heavy days mean serial card-cycling; push notifications become load-bearing
  ("we'll tell you" must be true); demos look "small."
- **Feasibility:** highest of the three — insights/gapRules/agenda/replyInbox/
  requestClocks all feed the ladder as-is; the engine is a pure, testable module.

## Option B — Front Desk *(judge #2/#3 pick — "the app talks")*

**Home becomes the first two turns of a conversation.** Waypoint speaks first
with exactly one true, dated, child-named sentence — or one honest question when
it doesn't know enough to assert anything. The parent answers by chip (44px,
plain words, three constants: "Something happened today" crisis entry · "What
should I do next?" · "Show me everything"), by voice, or by typing in their own
language. Cards exist only as artifacts a conversation produced and the parent
chose to **pin** to the Desk ("Pinned from your chat · Aug 12") — a watched
clock, a draft awaiting send, My Day. The hybrid-v2 Tools shelf stays for the
parent who won't talk to an AI. Openers/chips/templates compose locally (zero
API calls); only free text hits Claude.

- **Strongest at:** trilingual by construction (the whole surface is
  sentences); lowest literacy barrier; crisis entry always one tap; Home and
  Ask AI become one muscle-memory thread.
- **Costs:** discovery slows to dialogue pace (IHSS surfaces weeks later than a
  billboard would); veterans must assemble their own board by pinning; free-text
  latency on rural LTE; exposes every unlocalized destination screen as
  bait-and-switch (forces finishing es/vi app-wide).
- **Feasibility:** the brain exists (Navigator engine + agenda + clocks), but
  the arbitration queue's assert-vs-ask honesty gate is new and must be
  enforced as code, and pinning is new state.

## Option C — Caseboard *(judge #2's runner-up — "the app shows the true state")*

**Home becomes an instrument board of dated facts.** One fixed-geometry row per
live obligation, sorted NEW REPLY → PAST DUE → DUE TODAY → WAITING ON YOU →
WAITING ON THEM → STALLED, every row carrying its child, source tag, and a
text state label (never color-only). A sensor line is the provenance contract
("Gmail checked 6:32 AM · Private to your family — nothing sends unless you
press Send"). Everything *derived* is quarantined in a labeled **Findings**
drawer — question-framed hypotheses with disclosed inputs ("Based only on:
diagnosis, insurance") that can be corrected. Delta strip on open ("Since Tue:
1 reply · school-eval clock reached day 9"). Zero pep, zero pitch, zero demo
data. Contacts pair every phone number with a written path (collaborative-first
letter), and Tools stays nearly intact.

- **Strongest at:** the burned veteran operator (the audit's Danielle/Aisha/
  Rosa unanimously asked for exactly this); trust-as-product; the
  fact/hypothesis split kills confident-wrong claims structurally.
- **Costs:** newcomers with nothing tracked see a sparse cool page (onboarding
  must carry warmth); the discovery engine sits one tap down; most
  infrastructure-hungry (event log, synced ledgers, push scheduling).
- **Feasibility:** medium — board rows map to existing request/reply/agenda
  data, but the event log and account-synced dismissal ledger are real backend
  work.

---

## Judge scores (sum of 4 criteria, 40 max)

| Concept | J1 | J2 | J3 | Consensus |
|---|---|---|---|---|
| The Next Right Thing | 35 | top-1 | top-1 | **Unanimous #1** |
| Front Desk | 32 | top-3 | top-2 | Top-3 all judges |
| Caseboard | 31 | top-2 | top-3 | Top-3 all judges |
| The Ledger | 30 | — | — | Cut (same engine as TNRT, weaker execution) |
| Four Editions | 29 | — | — | Cut (feasibility) |

## Recommendation

**Build The Next Right Thing, borrowing the two best organs from the others:**
Caseboard's *sensor line* (the provenance contract) as the calm state's
credibility, and Front Desk's *tell-Waypoint composer* (already in TNRT's spec
as the crisis/search/AI row). The triage engine is a pure module
(`lib/homeTriage.ts`) we can ship behind the existing Home shell in phases:

1. **Engine + card + calm state** (pure module, fully tested, replaces the
   insight/reply/deadline card cluster) — the ten findings die here.
2. **Everything-else layer** (ledger + set-aside-with-undo + contacts; Tools
   kept verbatim one level down).
3. **Tell-Waypoint row** (crisis vocabulary + Ask-AI fallthrough) and the
   push loop that makes "we'll tell you" true.

Caseboard remains the natural *veteran mode* if telemetry later shows density
demand — its board is a second renderer over the same engine, not a rework.

**Decision needed:** pick A, B, C, or the recommended A+organs. Mockups:
`Roadmap/mockups/home-redesign/` (published as a design canvas).
