-- 059: action_stats leaked every family's row counts to every signed-in user.
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
-- whatever filter the caller sends, including none. Any authenticated user
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
-- family's uuid, and each family's engagement level, to anyone who can sign up.
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
-- CONSIDERED AND DELIBERATELY NOT DONE — `revoke all on public.action_stats
-- from anon`. It reads like defence in depth but adds nothing here: the leak
-- vector was the AUTHENTICATED role, and after this change anon already gets
-- zero rows through RLS. A grant change would widen the diff without closing
-- anything, so the fix stays one statement.
--
-- action_stats is the ONLY view in the schema (verified across all 59
-- migrations), so this migration is complete for the view class. The 41
-- SECURITY DEFINER functions are a DIFFERENT audit — each bypasses RLS on
-- purpose and needs its own internal authorization check — and are not touched
-- here.
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
-- The other precondition is already met: with security_invoker=on the CALLER
-- must hold SELECT on public.actions. `authenticated` does — the app reads and
-- writes that table directly today (useActions.ts:86, :177, :197), so the
-- grant is proven by the running product, not assumed.
--
-- Apply by hand in the Supabase SQL editor, in order (after 058b). Idempotent
-- and instantly reversible (`set (security_invoker = off)`); it takes only a
-- catalog lock, rewrites no data, and can be applied on a live database.
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

-- ── 2. Verify, in the SQL editor, after applying ────────────────────────────
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
