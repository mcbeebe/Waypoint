# 001 — SDLC uplevel

**Date:** 2026-08-29 · **Status:** Open
**Artifacts:** intent.md (this) → this PR → one PR per remaining item

## Problem

Three standing rules in this repo were not true:

1. `CLAUDE.md`'s ship-it rule names three gates — `tsc`, `vitest`, `eslint` —
   but `ci.yml` ran only the first two. The third existed only as a sentence.
2. `prompt-regression.yml` exits **0** when its secrets are unset. Those
   secrets have never been configured (the QA account is still an open ops
   item in `ROADMAP.md`), so every green tick this suite has shown was the
   skip path. It reports success while executing nothing.
3. `pages.yml`'s automatic trigger is `push: branches: [dev]`, and no `dev`
   branch exists — so a workflow that looks automatic has only ever run by
   hand.

Two more, structural:

4. `ci.yml` filters both triggers on `paths: ['waypoint-app/**']`. The moment
   branch protection requires `check`, any PR that touches only docs,
   `Roadmap/`, or `supabase/` deadlocks forever on a check that never runs.
5. `CLAUDE.md`'s repository map drifted five months out of date — naming two
   directories that no longer exist, omitting six that do, and twice
   instructing sessions to delete a nested `.git` removed in March.

## Proposed outcome

Checkable when all of these are true:

- `npm run lint` runs as a blocking CI step.
- A `check` run exists on **every** PR, whatever it touches.
- The prompt-regression suite cannot report success without having run.
- No workflow's trigger references a branch that does not exist.
- `CLAUDE.md` contains no statement that is false, and names the traps a
  fresh session cannot infer: hand-applied migrations, untested Edge
  Functions, the duplicated classifier prompt, `gas-mvp`'s manual deploy.
- Initiatives above the materiality threshold have a folder and a registry
  row.

## Affected parties / surfaces

- **Surfaces:** the four workflows. No application code changes in this PR.
- **Users:** none directly.
- **Future sessions:** the main beneficiary.

## Constraints

- **No gate may be red on arrival.** eslint was verified locally first — 0
  errors, 50 warnings, so it can be blocking today. A Deno typecheck for the
  Edge Functions was deliberately *not* added for the same reason inverted:
  it could not be validated here, and those functions have never been
  typechecked, so it would likely fail on arrival. That is initiative 002.
- **`pages.yml` must not start auto-publishing.** Repointing `dev` → `main`
  would begin automatically deploying a directory that has never
  auto-deployed. The dead trigger was removed instead; repointing is the
  owner's decision.
- **Auto-ship stays**, but with a written boundary (see `CLAUDE.md`): it does
  not extend to user-facing behavior, money, schema, Edge Functions, or
  anything leaving the desk.

## Open questions

- **gas-mvp: clasp or frozen-legacy?** Recorded in the registry. *Owner's call.*
- **`pages.yml`: manual or repointed at `main`?** *Owner's call.*
- **Branch protection:** required context is the check-run name `check`,
  satisfied by either `ci.yml` or `ci-guard.yml`. Turn it on only after this
  PR merges.
- **The duplicated classifier prompt** (`src/lib/ai.ts` ↔
  `scripts/prompt-regression.mjs`) still has no mechanical guard. One source
  of truth, or a parity test? Not in this PR.
- **Migration drift** has no guard either. A startup assertion that the
  highest applied migration meets what the code requires would have caught
  `e0bdcdd`. Not in this PR.
