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

## How everything else stays reachable under A (owner question, Aug 29)

Concept A changes what Home **leads** with — it deletes nothing from
navigation. Three access speeds, matched to how often families need things:

1. **Zero taps, always on screen:** the One Thing card (deep-links into
   today's job — a reply opens its case file, a deadline opens the letter);
   the tell-Waypoint row (live search over all 20 tools + crisis vocabulary
   + Ask-AI fallthrough — the "nothing found" dead end dies); and the
   **five-tab bar** (Home · Ask AI · Actions · Calendar · Learn — see the
   decisions below; Profile moved under the avatar) — every stack behind
   those tabs is untouched.
2. **One tap — the Everything-else layer:** This week (→ Calendar), Waiting
   (open requests vs their clocks → case files), Later (every set-aside
   item with its return date and Undo — better than today's invisible
   snoozes), Contacts (RC tap-to-call / write), and the **hybrid-v2 Tools
   area verbatim** — the three action rows with live badges plus the four
   doors. The layer remembers being open, so a browsing-minded parent can
   pin it expanded and Home reads like today's Tools page with one smart
   card on top.
3. **Search-first for the monthly-or-rarer tools:** typing (or voice, in
   es/vi) was always faster than hunting a grid; unmatched text goes to
   the Navigator with the exact words.

Every current Home surface is accounted for in the access map on the
canvas (the "nothing is lost" inventory): reply/deadline/noticed cards →
the One Thing slot; Today card → This week; RC card → Contacts; financial
snapshot → Money door; Journey/Process Map → Understand door; progress
ring → Actions tab; the cut cards (empathy, tutorial, mood check-in,
profile nudge) die per the audit, with their one useful function (the
"I'm stuck" wizard) moving into the composer.

**The daily flow** (four boards on the canvas): the normal morning is a
45-second check — since-line → One Thing → do it or "Not today" → earned
calm state → close the app guilt-free, because event-driven push makes
patrolling unnecessary. Reply days start from the push and end on the
case file. Heavy days triage by skipping (each skip lands in Later with
Undo), with the Waiting ledger and the unchanged Actions/Calendar tabs
for density. "I need something now" is type-or-talk. The honest trade:
incidental discovery drops one tap; the card's question/opportunity
classes and the layer's true-count summary line carry that load.

## Decisions taken on the prototype (owner, Aug 29)

- **Everything-else splits in two:** *Dates & clocks* (this week · waiting on
  an agency · later-with-undo · full calendar) and *Tools*.
- **Pinned tools:** a 3-across tile grid at the top of Tools, ☆ to pin from
  any row, Edit to remove, cap 6, seeded with the three action tools. **One
  shared set per family**, not per child. Waypoint **offers one pin** after a
  tool is opened repeatedly — in place inside Your tools, once per tool,
  declinable, never a popup.
- **Learn takes the fifth tab.** Profile leaves the tab bar and becomes
  **Settings under the avatar** (top right) as a dropdown: child, family,
  settings, language, sharing, plan, sign out.
- **The One Thing card is shorter and collapsible** — collapsed keeps the
  kicker, the title and the action, and drops the reasoning (318px → 165px),
  so the whole of Home fits one screen without scrolling.

## Learn as the content engine (product direction, not mockup scope)

Learn is not just an IA tidy-up: it is where "Waypoint knows things" becomes
visible, and the SEO surface for the whole product. The prototype ships a
shell — five situation-first guides, four sample articles, a plain-English
glossary. The real build-out is a library of **dozens, then hundreds** of
articles, and it should be sourced from what we already own rather than
written from scratch:

- The **Entity Navigation Matrix** (49 deep-dive KB articles) is the seed
  corpus; each entity already carries citations and next steps.
- Every article needs the same provenance discipline as the app: a statute
  or source per claim, a "last reviewed" date, and the collaborative-first
  tone rule in any letter it recommends.
- Each article should end in an action that exists — a letter template, a
  tracked request, a case file — so reading converts to doing.
- Public routes for SEO, with the in-app Learn tab reading the same content;
  ES/VI follow the funnel's translation gate.

Sizing, publishing workflow, and whether articles are authored, AI-drafted
then human-reviewed, or both, are open — worth their own short plan before
any of it is built.

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
