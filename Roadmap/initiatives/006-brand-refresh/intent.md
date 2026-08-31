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

- **Identity:** a real inline-SVG **Waypoint marker** (an ink location-marker with a pine-teal center, a sage next-point on a short route) as favicon, app icon, and an in-app `<Brandmark>` that replaces the stock Ionicons compass everywhere. (The compass was reconsidered — see the critique note below.)
- **Type:** a warm display + body pairing (**Newsreader** serif / **Hanken Grotesk** sans) added as tokens, with metric-close fallbacks — a warmer, more timeless "level-up" than the trendy/bureaucratic first pass.
- **Color — a WARM system.** After a hard audience critique (see below) the navy/teal-first palette was reworked: a **paper** ground (`#F5F1E9`), **ink** for all text (navy used as ink only, not wall-to-wall chrome), a deep **pine-teal** for anything interactive, **sage** for progress, coral for true urgency only — plus tint tokens. Contrast is a hard gate: every text/button role clears WCAG AA (pinned in `theme.test.ts`).

**Why the direction changed (a documented critique):** the first pass (navy→teal, compass) was pressure-tested against the actual user — a stressed 45-yo caregiver on her phone at 11pm. The critique was blunt and largely right: navy+teal reads like the insurance/benefits portals she's *fighting* (a bounce risk in the first second); the compass is a generic trope that subtly implies *she's* lost (she's not — she's being stonewalled); type ran too small with real AA contrast failures. The owner chose to warm the palette and adopt the "Waypoint marker" mark. That critique is why the system is what it is.
- **Components:** `<PageHeader>` (the navy→teal gradient band, currently Journey-only) and a unified `<BrandCard>` / section-label / progress-rail vocabulary, all reading from `theme.ts`.

Applied to Home, the Navigator/Ask surface, the Plan tab, RC Funding, Journey (for consistency), then the remaining stack screens.

Locked: **tokens are the source of truth** (`theme.ts`), every screen **extends** the kit rather than styling ad-hoc, **copy/tone/advice unchanged**, and the accent logic (teal/sage/coral) is applied by rule, not taste.

## Done when

- The Waypoint marker is the favicon, app icon, and in-app brandmark; the stock Ionicons compass is gone.
- `theme.ts` carries the warm `brand` tokens (AA-gated) + the type pairing; a `<PageHeader>` and `<BrandCard>` kit exists with render tests.
- Every main surface (Home, Ask, Plan, RC Funding, Journey, then the rest) wears the shared header + card system, accent logic applied by rule.
- No navigation, test, locale, tone, or copy regression — the suite stays green and the ui suite proves no control was lost.
- Each PR ships green (`tsc`/`vitest`/`eslint`) with an `/adversary` memo and — being family-facing visual change — **waits for the owner** (no auto-ship).
