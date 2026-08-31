# 006 — Brand refresh

**Date:** 2026-08-31 · **Status:** Open — owner approved the compass direction + navy→teal→sage system (Aug 31 2026)
**Artifacts:** intent.md (this) → plan.md → PRs (one per surface cluster) · design canvas "Waypoint Brand System"
**Serves:** `ROADMAP.md` v2.0 (the "GPS for the journey" promise) — the product's *felt* quality. Extends `src/lib/theme.ts` (the token source of record). Owner trigger: "the Journey page is the only one with some color… we need to upgrade and level up the design," plus a chosen logo (compass) and palette (blues + green).

## Problem

The app has a design **system in the tokens** (`theme.ts`: navy, teal, sage, coral, a spacing/radii scale) but it is **used on one screen.** Journey has a navy hero, colored phase accents, and a card rhythm; every other main surface is flat white with ad-hoc spacing. There is no shared **page header**, no consistent **card language**, no **accent logic** (teal vs sage vs coral used by rule), and no real **logo** — the mark is a stock Ionicons compass beside plain `WAYPOINT` text. For a product stressed parents must *trust*, "half-finished" is a credibility cost, not just an aesthetic one.

## The one danger to design against

**A cosmetic re-skin that churns every file at once and breaks the things that matter.** Two specific failure modes:

1. **Regressions in load-bearing systems** — the `routeGraph`/`MainTabs` navigator, the 929-test suite (incl. the ui suite that catches unreachable controls), and the trilingual `L(en,es,vi)` copy. A rebrand must not touch navigation wiring, break a screen-reader path, or drop a locale.
2. **Touching tone, copy, or advice under cover of "styling."** The escalation-tone rule and the status-not-blame framing are **locked**; this initiative changes pixels, never words. No string that gives guidance, names an agency, or sets a tone may change in a brand PR — those remain owner-gated content, out of scope here.

And the design-craft danger: **slop.** No gratuitous gradients, no emoji-as-icon, no new colors invented outside the token set. The system is small and disciplined.

## The shape (what we're building)

Not a screen-by-screen repaint by hand. A **shared, token-driven kit** applied page by page:

- **Identity:** a real inline-SVG **compass mark** (navy ring · teal north-point · sage hub) as favicon, app icon, and an in-app `<Brandmark>` that replaces the stock compass everywhere.
- **Type:** a display + body pairing (Bricolage Grotesque / Public Sans) added as tokens, with metric-close fallbacks — the one genuinely new element, and the biggest "level-up."
- **Color:** the **existing** palette, formalized into roles — navy = structure, **teal = interactive**, **sage = progress/positive**, coral = urgent only — plus tint tokens (`tealTint`, `sageTint`) for card and header backgrounds. No color is removed or invented.
- **Components:** `<PageHeader>` (the navy→teal gradient band, currently Journey-only) and a unified `<BrandCard>` / section-label / progress-rail vocabulary, all reading from `theme.ts`.

Applied to Home, the Navigator/Ask surface, the Plan tab, RC Funding, Journey (for consistency), then the remaining stack screens.

Locked: **tokens are the source of truth** (`theme.ts`), every screen **extends** the kit rather than styling ad-hoc, **copy/tone/advice unchanged**, and the accent logic (teal/sage/coral) is applied by rule, not taste.

## Done when

- The compass mark is the favicon, app icon, and in-app brandmark; the stock Ionicons compass is gone.
- `theme.ts` carries the type pairing + tint tokens; a `<PageHeader>` and `<BrandCard>` kit exists with render tests.
- Every main surface (Home, Ask, Plan, RC Funding, Journey, then the rest) wears the shared header + card system, accent logic applied by rule.
- No navigation, test, locale, tone, or copy regression — the suite stays green and the ui suite proves no control was lost.
- Each PR ships green (`tsc`/`vitest`/`eslint`) with an `/adversary` memo and — being family-facing visual change — **waits for the owner** (no auto-ship).
