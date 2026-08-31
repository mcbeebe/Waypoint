# 006 — Brand refresh · build plan

**Date:** 2026-08-31 · **Status:** adopted (owner approved compass + navy→teal→sage, Aug 31 2026)
**Supersedes:** — · **Superseded-by:** —
**Design canvas:** "Waypoint Brand System" (compass mark, tokens, applied to Home / RC Funding / Journey / Plan / Ask).

The kit is built and tested **before** any screen is repainted, so each apply-PR is a
small, low-risk swap to a proven component. Copy, tone, advice, navigation wiring,
and locales are untouched throughout — this initiative moves pixels, never words.

## Locked decisions (warm direction — owner-approved after the audience critique)

- **Mark:** the **Waypoint marker** — an ink location-marker (`#22303A`) with a pine-teal center (`#0F766E`) and a sage next-point (`#0E9E6E`) on a short route. Inline SVG; no raster. (Compass rejected — reads generic and "you're lost.")
- **Type:** display **Newsreader** (warm serif), body **Hanken Grotesk** (Google Fonts via `@expo-google-fonts`), each with a metric-close fallback stack.
- **Color — WARM, AA-gated** (`brand` tokens in `theme.ts`): paper ground `#F5F1E9` · ink `#22303A` for all text · pine-teal `#0F766E` interactive · sage `#0E9E6E` progress (`sageInk #047857` when sage is text) · urgent `#C2410C` only. Navy is ink, never chrome. Existing legacy `colors` are left intact; `brand` is additive so screens migrate one at a time.
- **Header:** a **light, warm** header (paper→cream, ink title + marker) becomes the shared `<PageHeader>` — replacing both the old cold `#F8FAFC` flatness and Journey's bespoke navy hero. No dark portal band.

## Phases (one PR each unless noted)

### Phase 1 — Identity + tokens (foundational, low-risk) — split into three
Split because the marker needs a new dependency (`react-native-svg`) that the
app doesn't yet carry; the tokens don't, so they ship first, dependency-free.

- **1a — warm tokens (SHIPPED first):** add the `brand` palette + `brandType`
  to `theme.ts`, **additive** (no existing token changed → zero visual change),
  guarded by `theme.test.ts` (roles present + WCAG-AA contrast pinned). This is
  the foundation every later PR reads from.
- **1b — the marker:** add `react-native-svg` (via `npx expo install`), build
  `<Brandmark size>` (the Waypoint marker ± wordmark), wire it through the ui
  test setup, and swap the stock `Ionicons name="compass"` in the Home header.
- **1c — app icon + web favicon:** generate the marker PNGs from the SVG with
  the repo's image tooling and point `app.json` (icon/adaptiveIcon/web.favicon)
  at them.
- Fonts (`@expo-google-fonts/newsreader` + `.../hanken-grotesk`, loaded at
  root) come with Phase 2's kit, which is the first thing to render them.

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
