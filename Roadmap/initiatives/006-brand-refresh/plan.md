# 006 — Brand refresh · build plan

**Date:** 2026-08-31 · **Status:** adopted (owner approved compass + navy→teal→sage, Aug 31 2026)
**Supersedes:** — · **Superseded-by:** —
**Design canvas:** "Waypoint Brand System" (compass mark, tokens, applied to Home / RC Funding / Journey / Plan / Ask).

The kit is built and tested **before** any screen is repainted, so each apply-PR is a
small, low-risk swap to a proven component. Copy, tone, advice, navigation wiring,
and locales are untouched throughout — this initiative moves pixels, never words.

## Locked decisions (from the approved canvas)

- **Mark:** compass — navy ring (`#1B2A4A`), teal north-point (`#0891B2`), sage hub (`#10B981`). Inline SVG; no raster.
- **Type:** display **Bricolage Grotesque**, body **Public Sans** (Google Fonts via `expo-font`/`@expo-google-fonts`), each with a metric-close fallback stack.
- **Color roles:** navy = structure/headers · teal = interactive · sage = progress/positive · coral = urgent only. Existing token hexes unchanged; add `tealTint`/`sageTint` for surfaces.
- **Header:** the navy→teal gradient band (today Journey-only) becomes the shared `<PageHeader>`.

## Phases (one PR each unless noted)

### Phase 1 — Identity + tokens (foundational, low-risk)
- Inline-SVG **compass** as web **favicon** + **app icon** (`app.json` icon/adaptiveIcon/web.favicon; generate the PNGs from the SVG).
- `<Brandmark size>` component (the compass ± wordmark) replacing the stock `Ionicons name="compass"` in the Home header (and anywhere else the brand mark appears).
- Extend `theme.ts`: `fonts.family` (display/body + fallbacks), `colors.tealTint`/`colors.sageTint`. **No existing token changed.**
- Load the fonts at app root; render tests that the Brandmark renders and the fonts register.
- Ships alone so identity lands even before the header/card swaps.

### Phase 2 — The shared kit (components + tests, no screen swaps)
- `<PageHeader title subtitle right>` — the gradient band + Brandmark, one component.
- `<BrandCard>` + `<SectionLabel>` + `<ProgressRail>` — the card vocabulary from the canvas, reading from `theme.ts`.
- ui-suite render tests for each (renders, accessible, honors `useTextScale`). No screen imports them yet — this PR only adds the kit.

### Phase 3 — Apply, surface by surface (one PR per cluster)
Each PR swaps one cluster to `<PageHeader>` + `<BrandCard>` + the accent rules, with an `/adversary` pass that checks: no control lost (ui suite), no copy/tone change, no navigation change, text-scale intact, trilingual intact.
1. **Home** (the front door — highest impact).
2. **Ask / Navigator** (the ask bar is already teal; unify the header + surrounds).
3. **Plan tab** (`PlanScreen`) + Tracker.
4. **RC Funding** (`ReimbursablesScreen`) — already has the teal ask bar; add the header + card unification.
5. **Journey** — re-fit to the shared `<PageHeader>` so it stops being bespoke.
6. **The rest** — Resource Stack, Eligibility Result, Letters, Agencies, Process Map, Supports, staff shell — grouped into 1–2 PRs.

### Phase 4 — Close-out
- Every main surface on the kit; stock compass gone; `theme.ts` is the single source.
- Flip status here and in the registry row; note any screen deliberately left bespoke.

## Guardrails per PR

- Gates green: `npx tsc --noEmit`, `npx vitest run`, `npx eslint . --ext .ts,.tsx --quiet`.
- `/adversary` memo in the PR; **family-facing visual → waits for the owner** (no auto-ship).
- Diff scope: styling + the kit only. A brand PR that also changes a string, a route, or a hook is out of scope — split it.
- ui suite must still prove every control the screen had is reachable after the swap.

## Risks

- **Font loading fl[a]sh / metrics** — mitigate with metric-close fallbacks and loading fonts at root before first paint.
- **App-icon regen** — the icon PNGs are generated from the SVG; regenerate with the repo's tooling, never hand-drawn, and check the adaptive/rounded crops.
- **Bespoke Journey drift** — Journey already has custom header code; Phase 3.5 replaces it with `<PageHeader>` rather than leaving two header systems.
