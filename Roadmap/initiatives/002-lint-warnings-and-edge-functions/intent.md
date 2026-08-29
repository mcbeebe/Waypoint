# 002 — Edge Function typechecking, and lint warnings to zero

**Date:** 2026-08-29 · **Status:** Open

## Problem

**The five production Edge Functions have never been typechecked.**
`waypoint-app/tsconfig.json` excludes `supabase/functions`, they have no
tests, and `deploy-edge-functions.yml` ships all five — `ai-proxy`, `gmail`,
`google-auth`, `delete-account`, `stripe-webhook` — to the production Supabase
project on merge to `main`. Two of those handle money and account deletion.
Nothing mechanical stands between a typo and production.

A Deno check was deliberately left out of initiative 001 rather than added
unverified: Deno was not available in that session, and code that has never
been typechecked usually does not typecheck on the first attempt. Shipping a
required check that is red on arrival is its own failure.

**Separately,** `npm run lint` reports 0 errors but **50 warnings** — mostly
`no-unused-vars` on non-`_`-prefixed names and `react-hooks/exhaustive-deps`.
Lint is now a blocking CI step, so errors cannot grow; warnings still can.

## Proposed outcome

- `deno check` (or `deno lint`) runs over `supabase/functions/**` in CI as a
  blocking step, and passes.
- At least smoke-level tests for `stripe-webhook` and `delete-account` — the
  two whose failure modes are financial and destructive.
- `npm run lint` reaches zero warnings, after which CI adds
  `--max-warnings 0`.

## Affected parties / surfaces

The Edge Functions are live production surfaces serving real families. Any fix
that changes their behavior — as opposed to their types — needs the boundary
treatment in `CLAUDE.md`: `/adversary` memo plus owner review, never
auto-ship.

## Constraints

- `stripe-webhook` is `verify_jwt = false` **on purpose**; `supabase/config.toml`
  documents why. A typecheck fix must not "correct" that.
- Deno's standard-library imports are URL-based; the check needs a lockfile or
  a pinned import map, or CI becomes non-deterministic — which is exactly the
  unpinned-dependency failure mode to avoid.
- Behavior-preserving only. Type annotations, not refactors.

## Open questions

- How many type errors are actually there? Unknown — nobody has run it. Find
  out first; that number decides whether this is one PR or several.
- Is `deno check` enough, or is `deno lint` wanted too?
- Should the Edge Functions get their own vitest-equivalent suite, or is a
  typecheck plus two smoke tests the right stopping point for now?
