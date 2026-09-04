# 008 — Build plan

**Date:** 2026-09-04 · **Status:** Ready to build (owner answered all four
scoping questions, Sep 4 2026 — see `intent.md`)
**Serves:** `intent.md`; migration 059's deferred "full cross-tenant RLS proof"

---

## The design decision everything else rests on

**The suite enumerates the schema at runtime. It does not carry a list of
tables.**

This repo has already paid for the alternative. `routeGraph.ts` exists because
a hand-copied list of route names in a test file drifted immediately and
certified nine dead taps — it encoded what its author believed rather than what
the system did. A hand-maintained list of "tables to check for isolation" fails
the same way, and worse: the failure is silent and it is a security boundary.

So the suite reads `pg_tables` and requires **every** table in `public` to be
classified into exactly one bucket:

| Bucket | Meaning | Asserted |
|---|---|---|
| `family` | Family-scoped data | Owner and member read/write own; **zero** rows of another family |
| `member_excluded` | Family-scoped but deliberately owner-only | Owner reads; **member gets zero rows** |
| `per_user` | Keyed to a user, not a family | Each user sees only their own |
| `reference` | Non-sensitive shared content (`resources`, `blog_posts`, …) | Readable; **not writable** by a client role |
| `service_only` | No client access at all | `anon` and `authenticated` get zero rows and cannot write |

**An unclassified table fails the suite.** That is the whole point: a new table
added without a decision about who can see it cannot reach `main` quietly. The
classification lives in one manifest with a one-line reason per entry, and the
reason is required.

---

## PR A — the rig, and one real assertion

Nothing about coverage yet. This PR earns the right to make claims.

- `postgres:16` service container in a **new CI job**, separate from `check`.
- **Bootstrap SQL** reproducing Supabase's ownership and grant model — this is
  the part that must be right or every later assertion is meaningless:
  - a **non-superuser** `migrator` role that owns the tables (a superuser
    bypasses RLS entirely and would make the whole suite green and worthless);
  - `anon`, `authenticated`, `service_role` roles;
  - `ALTER DEFAULT PRIVILEGES` matching Supabase's stock grants;
  - an `auth` schema with `auth.users` (migrations carry FKs to it) and
    `auth.uid()` / `auth.jwt()` reading `request.jwt.claims`.
  - *This shape is already proven:* the adversarial pass on migration 059
    stood it up on PG16 and reproduced the real leak with it.
- **Ordered migration runner** — applies all 60 `.sql` files in filename order
  and fails loudly on the first that does not apply cleanly.
- **Fixtures:** family A (owner `userA`), family B (owner `userB`), and
  `userC` as a *member* of family A. Two families is the minimum that can
  express "not the other one"; the member is what makes 053's policies
  testable at all.
- **Impersonation helper:** `asUser(id, fn)` → `set local role authenticated;
  set local request.jwt.claims = '{"sub":"…"}'`, and `asAnon(fn)`.
- **One table proven end to end** (`actions`): owner reads own rows, gets zero
  of family B's, and cannot write into family B.
- New vitest project `rls`, run by `npm run test:rls`. **Deliberately NOT added
  to `npm test`** — the six existing projects run in ~28s with no Docker, and
  a contributor without Docker must not be blocked. CI runs both.

**Done when:** the rig is green in CI, and deleting the `actions` policy turns
it red.

---

## PR B — the inclusions

- The runtime enumeration and the classification manifest described above.
- For every `family` table: `userA` and `userC` read and write family A;
  **both get zero rows of family B**, and writes into B are rejected.
- Cross-tenant writes are asserted separately from reads. A policy that lets A
  *see* nothing of B but *update* B's rows is still a breach, and `for all`
  policies make that a real shape.

**Done when:** every `family` table is covered by construction, and adding an
unclassified table fails the suite.

---

## PR C — the exclusions, anon, and the two known regressions

The half nobody has ever tested.

- **Exclusions.** `userC` (a legitimate member of family A) must get **zero
  rows** from `chat_sessions`, `chat_messages`, `entitlements`, `push_tokens`,
  the provider-portal tables and the staff tables, and must not be able to
  UPDATE `families`. Each is a promise 053 made in prose.
- **Anon.** Every table, zero rows, no writes.
- **`action_stats`.** Proves migration 059 against a live database rather than
  statically: `userA` gets exactly one row, `anon` gets a permission error.
  Pairs with `schemaGuards.test.ts`, which only proves the file says so.
- **The two historical failures, as named tests that fail on the pre-fix
  schema:**
  - the 059 view bypass (drop `security_invoker` → three families' rows);
  - the 058 recursion (restore 027's policy names after 055 → `42P17`).

**Done when:** both regressions are reproducible on demand and red before their
fix, green after.

---

## PR D — the function class, and the drift report

- **`SECURITY DEFINER` audit.** All 22 distinct functions. Each must either
  `revoke execute` from `anon`/`authenticated`, or appear in an allowlist with
  a stated reason. Known starting point: `compute_aggregate_insights` (023) has
  no revoke, where `increment_ai_usage` (015) and `monthly_ai_usage` (042) both
  do — it is not proof of a hole, but it is proof the class is unaudited.
- **`scripts/rls-drift.mjs`** — read-only, run by the owner against production
  with a read-only role. Reports, per object: policies present vs expected,
  grants, and view `reloptions`. Answers the question 007 could not:
  *does production match the files?*
  - Owner-run locally for v1 (decision 4), written so promoting it to a manual
    `workflow_dispatch` is a config change, not a rewrite.
  - **Never scheduled.**

**Done when:** the owner can run one command and get a straight answer about
production, and 007's blocked status can be resolved with evidence.

---

## What this will NOT prove — stated so nobody over-reads a green run

1. **That production is correct.** The suite proves the migration files, applied
   *in order*, produce a sound policy set. Production is applied by hand, so
   those are independent facts. 007 is the standing proof: the files were right
   and production was not. **PR D is the only part that speaks to production.**
2. **That a human applied them in the right order.** Filename order is the
   correct order; 058's failure was a person applying 027 *after* 055. No CI
   run can catch that — only the drift report can.
3. **Anything at the API layer.** Per decision 1: no PostgREST, so RPC
   reachability over HTTP and the "client filter is not a boundary" class are
   out. Upgrade path named in `intent.md`.
4. **Storage bucket policies.** The `documents` bucket uses a different
   mechanism; out of scope for v1.

---

## Sequence

A → B → C → D, in order. A is the only one with unknowns in it (the ownership
and grant model has to be exactly right or everything downstream is theatre);
B–D are additive once the rig exists. No external deadline (decision 3), so
this runs after the remaining engineering items rather than ahead of them.
