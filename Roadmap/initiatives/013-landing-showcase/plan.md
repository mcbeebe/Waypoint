# 013 — Plan

**Date:** 2026-10-08 · **Status:** adopted (owner go 2026-10-08)

## PR 1 — IEP goal check (`feat/iep-goal-check`)

- `waypoint-site/src/lib/iepGoalCheck.ts` — pure rules: five checks
  (timeframe, conditions, observable skill, criterion, measurement), a
  rating (strong 5 / adequate 3–4 / needs work 0–2), and a friendly ask
  naming what is missing. Unit tests over strong, vague and partial goals,
  including the false positives a regex check invites.
- Guard test: the module and the page script contain no `fetch`,
  `XMLHttpRequest`, `sendBeacon`, `localStorage`/`sessionStorage`/`indexedDB`
  (Attune's ToolShell rule). Analytics events carry only `tool_id`,
  `locale`, and the rating — never the goal text.
- `/tools/iep-goal-check/` page following the SSI calculator's shape;
  Sources block for its citations (Ed Code §56345, §56343.5 — reusing the site's verified entries; no new orphan chips); indexable,
  in the sitemap and footer from merge (owner decision 2026-10-08).
- Registered in `axe-scan.mjs`, `keyboard-pass.mjs` (with an Enter-runs-it
  check). `tool-result` CTA reused — no taxonomy change.

## PR 2 — homepage showcase (`feat/landing-showcase`, stacked on PR 1)

- New hero + headline with a code-built phone showing the Home heads-up.
- Inline goal-check embed (same module) linking to the full tool.
- "See it work" tablist (WAI-ARIA, arrow keys) — Navigator, Draft, IEP
  analysis, Plan, Benefits stack — fictional child "Maya", tagged Free or
  Premium from `entitlements.ts`.
- "Waypoint speaks first" timeline in neutral, status-first wording.
- Free-help grid adds the goal check; existing pillars kept.

## PRs 3, 4 and 6 — tools hub, /product/ tour, guide CTA screens

Owner go on the mockups 2026-10-09 ("Looks great. Please proceed"). Design
canvas: https://claude.ai/artifact/AqXtMuoLSdJxeg6xqTYHau; source files on
`design/landing-showcase-mockup` under `Roadmap/mockups/landing-showcase/next3/`.

- **PR 3 (`feat/tools-hub`)**: `/tools/` lists every free tool; header "Free
  Tools", the footer and the homepage's free-tools card open it.
  `toolsHub.test.ts` fails if any route under `src/pages/tools/` lacks a card.
  The hub does not claim the app reads a tool's result: a tool link's
  `wp_ctx` is stored only as attribution (`waypoint-app/src/lib/attribution.ts`).
- **PR 6 (`feat/cta-screens`)**: `HandoffCTA` gains a small sample screen
  matched to the page's pillar or page type, using only cards the app can
  produce. Component change only; hidden below 720 px.
- **PR 4 (`feat/product-tour`)**: `/product/` features sit beside sample
  screens; corrects the live "15/60/45-day clock … alert" claim.

## Verification

`npm run gates` from `waypoint-site/` on each PR; screenshots at 390 and
1280; `/adversary` memo in each PR; owner merges.
