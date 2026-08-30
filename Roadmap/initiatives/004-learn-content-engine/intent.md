# 004 — The Learn content engine (Home rebuild phase 8)

**Date:** 2026-08-30 · **Status:** Open — plan for owner go (no code until then)
**Artifacts:** intent.md (this) → plan.md → PRs per slice
**Serves:** `ROADMAP.md` v2.0; `Roadmap/Home-Rebuild-Plan.md` phase 8;
`Roadmap/Undivided-Comparison-Aug2026.md` items 6, 16–20. Fulfils the
`Roadmap/Learn-Content-Plan.md` the audit named as a prerequisite.

## Problem

Learn is where *"Waypoint knows things"* becomes visible, and the SEO surface
for the whole product. Today it is a **shell**: `src/lib/learnLibrary.ts` holds
**4 paths, 4 articles, 6 glossary terms** — roughly 500 English words of real
prose. An article is just a 2–3 sentence `summary`; there is **no body**, **no
reader screen** (tapping an article jumps straight to a tool), and the web
build is a single client-rendered `index.html` with **no per-article URL, no
sitemap, no meta** — i.e. no SEO at all. Meanwhile the AI's knowledge (the
`knowledge_embeddings` FTS store, seeded from the Entity Navigation Matrix) is a
**separate, disconnected** corpus that Learn neither reads nor feeds.

So the most content-differentiating surface in the product is empty, and the
one place we already own deep content (the Matrix, ~86k words across 14 sheets)
doesn't reach families as readable, cited articles.

## The one danger to design against

The roadmap's original phase 8 — *"dozens, then hundreds of articles"* — is,
in the audit's words, **"the single most dangerous line in the roadmap for a
solo owner."** An art-directed editorial feed is one editor-year minimum and a
funded competitor (Undivided) wins that race by default. **This initiative is
the rescope, not the race.**

## The shape (what we're actually building)

Not a magazine. A **derivation engine**: ~40 articles, each **generated from a
module that already exists** — an `escalationLadder` rung, a `processMap`
stage, a `resourceStack` layer, a registry claim — so the content is a
by-product of structure we've already built and verified, not net-new prose to
maintain by hand. Every article carries a **citation and a reviewed-on date**
(the `contentSources` registry + `Citation` component already exist and a test
already bans un-sourced claims), and **ends in an action the app performs**.
Then a **reader screen** so an article can actually be read, and **static
public web pages** (generated from the same pure module at build time) so Learn
becomes the SEO surface — without adopting expo-router or racing a content team.

Locked: **California only** (no per-state fork). **No fifth tab** — Learn stays
in the Ask panel; the tab slot is reserved until pin-rate evidence earns it
(audit item 18).

## Done when

- ~40 derived, cited, action-ending articles exist in the pure library,
  trilingual, every citation covered by the provenance test.
- A reader screen renders an article's body + tappable citation + end-action.
- `build:web` emits a static, crawlable page per article (meta + JSON-LD +
  sitemap) from the same content, and the in-app Learn panel reads it too.
- The authoring pipeline (Matrix → AI draft → human review → provenance gate)
  is documented and repeatable, so growing from 40 is cheap and safe.
- Each slice ships green (`tsc`/`vitest`/`eslint`) with an `/adversary` memo;
  every family-facing slice waits for the owner.
