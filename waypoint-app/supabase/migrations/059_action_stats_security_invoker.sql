-- 059: action_stats leaked every family's row counts to EVERY caller,
--      including unauthenticated ones.
--
-- THE BUG. `public.action_stats` (migration 004, line 74) is a plain view over
-- public.actions. Postgres runs a view with its DEFINER's rights unless
-- `security_invoker` is set — the option defaults to OFF in every version that
-- has it (PG15+), and does not exist at all before that. The view is owned by
-- the migration role, which owns public.actions, and a table's owner bypasses
-- that table's RLS unless FORCE ROW LEVEL SECURITY is set. It is not set on
-- actions (or on anything else in this schema). So RLS on actions was never
-- applied through this view, for anyone.
--
-- WHAT THAT EXPOSED. The view is client-reachable: useActions.ts:115 reads it
-- as `.from('action_stats').select('*').eq('family_id', familyId).single()`.
-- That `.eq()` is a CLIENT-SIDE FILTER, not a boundary — PostgREST will honour
-- whatever filter the caller sends, including none. And the caller did not have
-- to be signed in: an adversarial pass reproduced this on a PostgreSQL 16
-- cluster with Supabase's stock grants and read every family's row as `anon`,
-- WITH NO JWT AT ALL — that is the publishable key shipped inside the Expo
-- bundle and the GitHub Pages build. So any caller, authenticated or not,
-- could issue
--
--     GET /rest/v1/action_stats?select=*
--
-- and receive ONE ROW PER FAMILY IN THE DATABASE: family_id (uuid),
-- total_actions, completed_count, in_progress_count, not_started_count,
-- dismissed_count, completion_rate, avg_days_to_complete.
--
-- It is metadata, not content — no child names, no diagnoses, no letters, no
-- message bodies. But it discloses the platform's total family count, every
-- family's uuid, and each family's engagement level, to ANYONE ON THE INTERNET
-- holding the publishable key. Not "anyone who can sign up" — no account was
-- needed. That is an unauthenticated disclosure, a different severity band.
-- For a product handling children's disability data that is a real finding, and
-- it is the first thing an enterprise or DDS security questionnaire asks about.
--
-- HOW IT SURVIVED. Migration 053 spotted it in a header comment — "NOTE
-- (pre-existing, out of scope): action_stats is a VIEW over actions. If it is
-- not security_invoker, RLS on actions isn't applied through it for anyone —
-- worth a separate look, unaffected by this migration either way." The separate
-- look never happened. This migration is that look.
--
-- THE FIX. One line: make the view resolve permissions and RLS as the CALLER.
-- Then the policies already on public.actions do the work they were written to
-- do — migration 004's owner policy and 053's `member_family_ids()` member
-- policy — and the view returns the caller's own family and nothing else.
--
-- NO CLIENT CHANGE IS NEEDED, and none is made:
--   * a caller with actions gets exactly their own row; `.eq()` + `.single()`
--     still resolves as before;
--   * a caller with no actions yet gets zero rows -> PostgREST PGRST116, which
--     useActions.ts:120 already treats as "new user, no actions" and swallows;
--   * an anon caller has no auth.uid(), so every policy on actions fails and
--     the view is empty.
--
-- WHY THE REVOKE IS ALSO HERE. An earlier draft of this migration argued the
-- revoke away: "the leak vector was the AUTHENTICATED role, and after this
-- change anon already gets zero rows". The first half was simply false — anon
-- was the wider vector, as the probe above showed. The second half is true
-- (with security_invoker on, anon has no auth.uid() so every policy on actions
-- fails closed), so the revoke is defence in depth rather than the fix. It is
-- still worth one line: this view has exactly one legitimate caller,
-- useActions.ts, which is always authenticated. Nothing anon can do with it is
-- intended, so it should not hold SELECT on it.
--
-- action_stats is the ONLY view in the schema (verified across all 60 migration
-- files — 058b is why the count is 60 and not 59), so this migration is
-- complete for the view class. The 22
-- SECURITY DEFINER functions are a DIFFERENT audit — each bypasses RLS on
-- purpose and needs its own internal authorization check, and PostgREST exposes
-- them as RPCs. (22 is the count of DISTINCT function names; a grep for the
-- string "security definer" returns 42 because several are re-declared across
-- migrations — member_family_ids alone appears in 049, 053, 055, 058 and 058b.)
-- Not touched here. One example of why that audit is owed: 023's
-- compute_aggregate_insights carries no `revoke execute`, unlike
-- increment_ai_usage (015) and monthly_ai_usage (042) which do.
--
-- REGRESSION GUARD. src/lib/schemaGuards.test.ts fails CI if any view is added
-- to this directory without security_invoker, so the next view cannot repeat
-- this. Full cross-tenant RLS proof is initiative 008 (RLS integration tests).
--
-- APPLY THIS WITHOUT WAITING FOR 058. Initiative 007 is BLOCKED ON PROD
-- pending migration 058, so the instinct is to queue this behind it. Do not —
-- 059 is independent, and the evidence is 058's own live probe (2026-09-02,
-- recorded in its header): it found `actions  OK` and
-- `public.member_family_ids()  EXISTS`. The two policies this fix relies on to
-- return the caller's own row — 004's owner policy and 053's member policy,
-- the latter calling member_family_ids() — therefore already evaluate
-- correctly in production. 058's 42P17 recursion is confined to
-- family_members, family_invitations and activity_log, none of which this view
-- touches. Applying 059 first neither helps nor hinders 058.
--
-- The other preconditions are already met. With security_invoker=on the CALLER
-- must hold SELECT on public.actions — `authenticated` does, proven by the
-- running product rather than assumed (useActions.ts:86, :177, :197). It must
-- ALSO hold SELECT on public.families, which is the non-obvious one: 004's
-- owner policy subqueries families in its USING clause, and under
-- security_invoker that subquery runs as the caller too. A role with SELECT on
-- actions but not families gets "permission denied for table families".
-- `authenticated` holds it — useFamily.ts:46 reads families directly. (053's
-- member policy is immune either way: it routes through the SECURITY DEFINER
-- member_family_ids().)
--
-- Apply by hand in the Supabase SQL editor, in order (after 058b). Idempotent
-- and instantly reversible (`set (security_invoker = off)`). It rewrites no
-- data and is instant, but it does take an ACCESS EXCLUSIVE lock on the view:
-- it will queue behind an in-flight read and block new readers while queued.
-- On a view this small that is microseconds; it is not a zero-lock operation.
--
-- Date: 2026-09-04

-- ── 0. Fail loudly on a Postgres that cannot do this ────────────────────────
-- On PG14 and earlier the option does not exist and the ALTER below would fail
-- with an opaque "unrecognized parameter". Supabase has shipped PG15+ for new
-- projects since 2023; this is here so an older project gets a sentence it can
-- act on instead of a parser error.
do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception
      'action_stats cannot be secured on Postgres % — security_invoker needs 15+. '
      'Upgrade, or drop the view and have the client aggregate from actions '
      '(which IS protected by RLS).', current_setting('server_version');
  end if;
end $$;

-- ── 1. The fix ──────────────────────────────────────────────────────────────
alter view public.action_stats set (security_invoker = on);

comment on view public.action_stats is
  'Per-family action rollup. security_invoker=on (migration 059) so RLS on '
  'public.actions applies to the CALLER — without it this view returned every '
  'family''s counts to every signed-in user. Do not turn it off; do not add a '
  'view here without it (guarded by src/lib/schemaGuards.test.ts).';

-- ── 2. Defence in depth: anon has no legitimate use for this view ──────────
-- Not the fix (step 1 already closes anon), but this view's only caller is an
-- authenticated hook, so anon should not hold SELECT on it. Safe: `anon` and
-- `authenticated` are separate roles in Supabase and do not inherit from one
-- another, so this cannot affect a signed-in family.
revoke all on public.action_stats from anon;

-- ── 3. Verify, in the SQL editor, after applying ────────────────────────────
-- Expect exactly one row, with security_invoker listed in reloptions:
--
--   select c.relname, c.reloptions
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relname = 'action_stats';
--   -- => action_stats | {security_invoker=on}
--
-- And confirm the leak is closed from the CLIENT side, which is the only test
-- that actually matters. Signed in as a normal family user, run:
--
--   GET /rest/v1/action_stats?select=*      (no family_id filter)
--
-- BEFORE this migration: one row per family in the database.
-- AFTER:                 exactly one row (your own), or zero if you have no
--                        actions yet.
--
-- Then repeat it SIGNED OUT, with only the publishable key — the case that made
-- this unauthenticated disclosure. Expect zero rows, and after step 2, a
-- permission error rather than an empty list.
