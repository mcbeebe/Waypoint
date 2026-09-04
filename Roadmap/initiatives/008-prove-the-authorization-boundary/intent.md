# 008 — Prove the authorization boundary

**Date:** 2026-09-04 · **Status:** Draft — scoping for owner go
**Artifacts:** intent.md (this) → plan.md → PRs A–D
**Serves:** `ROADMAP.md` v2.0; the Operations vendorization packet (a payer or
district security review asks for exactly this evidence); and every migration
that has ever written a policy.

## Problem

**Row-level security IS Waypoint's authorization model.** The client talks to
Postgres directly through PostgREST carrying the user's own JWT
(`src/lib/supabase.ts`); application code performs no authorization at all. A
`.eq('family_id', …)` in a hook is a *filter*, not a boundary — the database
policies are the only thing standing between one family's file and another's.

That boundary is described by **59 hand-written migrations, applied by hand,
with zero automated verification.** Nothing anywhere asserts that a member of
family A cannot read family B.

**It has already failed twice, in production, and both were found by a person
looking — not by a test.**

- **Initiative 007 / migration 058.** Migration 027 was applied *after* 055 and
  silently restored the recursive policies it had replaced (same policy names,
  so it overwrote rather than conflicted). All three family-sharing tables
  raised `42P17` in production. Discovered on Sep 2 2026 by hand-probing the
  live database. **007 is still `BLOCKED ON PROD` in the registry today.**
- **Migration 004 / 059.** `public.action_stats` was created as a plain view
  over `actions`, so RLS was never applied through it and it returned every
  family's row counts **to every caller, signed in or not** — for 55
  migrations. An adversarial pass reproduced it on a PostgreSQL 16 cluster with
  Supabase's stock grants and read every family's row as `anon`, with no JWT,
  using the publishable key that ships in the app bundle. Migration 053 spotted
  it in a *comment* ("worth a separate look") and the look did not happen until
  this week's audit.

Two independent classes of failure, both silent, both long-lived. There is no
evidence a third is not present right now — only the absence of anything that
would tell us.

**The compounding factor is hand-application.** Because migrations are applied
manually in the SQL editor, "the policy set in git" and "the policy set in
production" are *different objects with no diff between them*. 007 is the
existence proof: the files were correct and production was not.

## Proposed outcome

Two capabilities, deliberately separate because they answer different
questions:

1. **A cross-tenant proof suite (CI).** A clean Postgres, all migrations
   applied in order, two seeded families, and assertions per protected table
   that family A cannot read or write family B. Answers *"is the design
   right?"*
2. **A drift report (on demand, read-only, against production).** One command
   that tells the owner which policies are actually live. Answers *"does
   production match the design?"*

Waypoint has been bitten by each independently, so shipping only one leaves a
known hole open.

**A free second benefit:** applying all 59 migrations to an empty database on
every CI run continuously proves the migration set is *replayable in order*.
Nothing proves that today — a fresh environment has never been built from
these files end to end.

## The one danger to design against

**A suite that asserts the migration TEXT rather than observed ACCESS.**

`src/lib/schemaGuards.test.ts` (added with 059) is deliberately static — it
replays migration statements and models Postgres's `reloptions`. It would have
caught the 004 view bug. It would **not** have caught 058, because that failure
was a runtime *ordering* effect: every file was correct on its own, and only the
sequence in which a human applied them produced the broken state.

Its own first draft is the cautionary tale. An adversarial pass defeated it five
ways against a live PG16 cluster — `create or replace` silently clearing the
option, a regex window jumping between two views, recursive views, materialized
views (where the guard demanded SQL that cannot execute), and first-wins instead
of last-wins ordering within a file. All five are fixed, but the lesson stands:
**a text guard is a proxy, and proxies get defeated.**

So the rule for this initiative: **if the suite can pass without a database, it
is the wrong suite.** Tests must connect as a real principal and observe real
rows.

## Scope

**In:**
- The ~24 member-scoped family tables from migration 053 — read *and* write.
- **The deliberate exclusions** (`chat_sessions`, `chat_messages`,
  `entitlements`, `push_tokens`, provider-portal tables, staff tables,
  `families` WRITE). 053 chose these as privacy boundaries and nothing tests
  them — an exclusion is as much a contract as an inclusion.
- **Anon.** Assert an unauthenticated caller gets zero rows everywhere.
- **`action_stats`** — proves 059 against a live database, not just statically.
- **The 22 `SECURITY DEFINER` functions** (distinct names; the raw string
  appears 42 times because several are re-declared). Each bypasses RLS *by
  design* and PostgREST exposes them as RPCs. Assert each either revokes
  EXECUTE from `anon`/`authenticated` or is listed with a reason — `023`'s
  `compute_aggregate_insights` currently has no revoke, unlike
  `increment_ai_usage` (015) and `monthly_ai_usage` (042) which do.
- The two historical regressions, as named tests that fail on the pre-fix
  schema.

**Out (v1), each for a reason:**
- Storage bucket policies (`documents`) — different mechanism; own pass.
- Edge Function authorization — service-role by design; belongs to 002.
- Policy performance.

## Constraints

- **Must run in CI with no live Supabase project** — no secrets, no cost, no
  chance of a test writing to production.
- CI has **no database service today**; this adds one.
- The `logic` vitest project is node-only and fast (~28s for 1209 tests).
  Database tests are slower and need their own project or job so the existing
  gates stay fast.
- Migrations are hand-applied and *ordering-sensitive* (that is 058's whole
  lesson) — the harness must apply them in filename order and fail loudly on
  any that does not apply cleanly.

## Done when

- CI applies all migrations to a clean Postgres and runs cross-tenant
  assertions for every protected table, inclusions and exclusions both.
- Both historical failures have a test that fails on the pre-fix schema.
- The owner has a one-command drift report for production.
- The registry row, `CLAUDE.md`, and 007's blocked status are updated.

## Open questions — for the owner

1. **Harness shape.** Plain `postgres:15` container + `set local role` +
   `set local request.jwt.claims` (fast, no Docker-in-Docker Supabase stack,
   tests the layer RLS actually keys off) **— recommended —** versus
   `supabase start` (heavier, slower, but also exercises PostgREST's own filter
   handling, which is where `action_stats` was reachable from). Trade-off: the
   light option does not test PostgREST itself.
2. **Appetite.** Minimal (the 24 member tables) ≈ 2 PRs, versus full (tables +
   exclusions + anon + definer-function audit + drift script) ≈ 4 PRs.
3. **Priority.** Does the DDS / vendorization packet need this evidence on a
   date? If yes it jumps the queue ahead of items 2 and 3; if no it follows
   them.
4. **Does the drift report run anywhere automatic?** It needs production
   credentials, so it cannot live in normal CI. Owner-run only, or a manual
   `workflow_dispatch` with a read-only role?

## Sizing

| PR | Content |
|----|---------|
| A | Harness: container, ordered migration runner, role/JWT helpers, one table proven end to end |
| B | All member-scoped tables — inclusions, read + write |
| C | Exclusions + anon + `action_stats`, and the two historical regressions as named tests |
| D | `SECURITY DEFINER` function audit + the production drift report |
