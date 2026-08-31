# 005 — Build plan

**Date:** 2026-08-31 · **Status:** adopted (owner go, Aug 31 2026)
**Supersedes:** — · **Superseded-by:** —

Four PRs, smallest-blast-radius first. Each is family-facing / legal-framing, so
each runs `/adversary`, posts the memo in the PR, and **waits for the owner** —
no auto-ship (the draft-flow scoped grant does not cover this initiative).

## The reusable data shape

A support in this tier is more than a `Reimbursable` (name/code/description/
cost/note). It carries an **advocacy layer** so a screen can render "how do I get
THIS one":

- `key` — stable id (e.g. `sibling_support`)
- `whatItIs` — plain-language, trilingual
- `theCatch` — why it isn't automatic (identified need in the IPP)
- `howToAsk` — 3 collaborative steps, trilingual
- `script` — a sample IPP-meeting ask, first-person, collaborative tone
- `ippNeedHook` — the need language to get written into the plan
- `citation` — W&I §4646.5 / §4648(a) (+ reviewed-on)

This models the pattern once; every family support reuses it. Sibling support is
the first fully-authored instance.

## PR A — Content & catalog

- Add the advocacy-layer type and the **sibling support** instance (fully
  authored, trilingual). Seed respite / camp&recreation / parent training as the
  same shape (they already exist as `Reimbursable` rows — enrich, don't
  duplicate).
- New **sibling-support Learn article** (derived, cited, action-ending); widen
  `rc_money` search `terms` so "sibling / Sibshop / respite" find it.
- Tests: content shape, trilingual parity, citation coverage, search finds
  sibling terms.
- **Gate:** `/adversary` on content accuracy vs W&I §4646.5 / §4648(a) and tone.

## PR B — The destination screen

- `AskForSupportsScreen` (the list) + `SupportDetailScreen` (what / catch / how /
  draft). Register both in `routeGraph.ts`; pin reachability with `resolvesFrom`
  tests (the dead-tap fence).
- The detail's primary CTA is "Draft this request for the IPP" (wired in PR D);
  until then it routes to the existing `ipp_review_request` letter so it is never
  a dead tap.
- **Gate:** `/adversary` on tone + dead-tap fence.

## PR C — The two doors

- Give the RC layer a real `unlockGuideFor` guide (today returns `null`) →
  `AskForSupports`. Add the "See what to ask for →" affordance on the RC layer
  card in `ResourceStackScreen`.
- Make Your Result's "family services" reachable: an in-card link on the RC card
  in `EligibilityResultScreen` → `AskForSupports`. Does not disturb the footer
  CTA.
- Tests: both routes resolve from their stacks.
- **Gate:** `/adversary` on reachability from both stacks.

## PR D — The lever

- A support-specific **"add [support] to the IPP as an identified need"** letter
  — a collaborative variant of `ipp_review_request`, seeded from the support's
  `ippNeedHook` + `script`.
- Hand off to the **Request tracker** so the ask gets a follow-up clock (mirror
  the Medi-Cal deeming path).
- Tests: letter tone ladder (collaborative-first), tracker handoff shape.
- **Gate:** `/adversary` on letter tone ladder.

## Sequencing note

A–D are independent enough to review in order but B routes to A's content and D
replaces B's placeholder CTA, so ship A→B→C→D. Each waits for the owner; a later
PR does not start until the prior is merged (keeps the diff legible and the
adversary memo scoped).
