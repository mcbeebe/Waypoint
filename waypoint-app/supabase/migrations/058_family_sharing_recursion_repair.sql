-- 058: Family Sharing — REPAIR. 027 was applied after 055 and put the
--      infinite-recursion policies back. Family Sharing is broken right now.
--
-- ── WHAT IS ACTUALLY WRONG ON THE LIVE PROJECT (verified 2026-09-02) ────────
--
-- Probed against the production database as the `authenticated` role:
--
--   family_members      42P17 infinite recursion detected in policy for
--                             relation "family_members"
--   family_invitations  42P17  (same — its policy subqueries family_members)
--   activity_log        42P17  (same)
--   children            OK
--   actions             OK
--
-- And the state that explains it:
--
--   public.member_family_ids()   EXISTS   ← 055 ran
--   public.admin_family_ids()    EXISTS   ← 055 ran
--   policies on family_members   RECURSIVE ← but they are 027's text again
--
-- So 055 was applied, and then **027 was applied after it**. 027 does
-- `drop policy if exists` before `create policy`, and it uses the SAME POLICY
-- NAMES as 055 — "Users can see own family memberships", "Admins can manage
-- family members", "Family admins can manage invitations". Re-running it
-- therefore silently replaces 055's fixed policies with the recursive ones.
-- The definer functions survive, because 027 does not touch them, which is
-- exactly why the database looks half-fixed: the helper is there, and nothing
-- uses it.
--
-- This is the "0 members / no invite button" screenshot, still. The Family
-- Sharing screen's first read errors, so the member list never populates.
--
-- ── ORDER OF APPLICATION — READ THIS ───────────────────────────────────────
--
--   027 must NEVER be re-run after 055/058. It is superseded for these five
--   policies. If it is ever re-run (for its family_members backfill, say),
--   re-run THIS file immediately afterwards.
--
-- ── WHAT THIS FILE DOES ────────────────────────────────────────────────────
--
-- Exactly what 055 does — re-declared here so the repair is one paste, and so
-- a future session reading the migration list sees why 055 alone was not
-- enough — plus two things 055 did not have:
--
--   1. A STATIC CHECK that raises if any policy on the three affected tables
--      still subqueries family_members inline. A half-applied RLS migration
--      used to fail silently; now the SQL editor says so.
--   2. A RUNTIME PROBE that actually reads the three tables as the
--      `authenticated` role and raises if 42P17 comes back. This is the check
--      that would have caught the current state the day it happened. It is
--      best-effort: if the probe itself cannot run (role missing, permissions),
--      it is skipped rather than failing the migration.
--
-- Idempotent and safe to re-run. Apply by hand in the Supabase SQL editor,
-- like every migration. Pure RLS — nothing in CI verifies it.
--
-- ── READ-ONLY DIAGNOSTIC (paste any time to see where you stand) ────────────
--
--   select tablename, policyname,
--          (qual ilike '%from family_members%'
--           or coalesce(with_check,'') ilike '%from family_members%') as recursive
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('family_members','family_invitations','activity_log')
--   order by tablename, policyname;
--
--   Every row must read recursive = false.

-- ── The SECURITY DEFINER helpers (identical to 049/053/055) ────────────────
-- They run as their owner, so a policy calling them never re-enters the table
-- that policy guards. That is the whole mechanism.

create or replace function public.member_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.families where user_id = auth.uid()
  union
  select fm.family_id from public.family_members fm where fm.user_id = auth.uid();
$$;

create or replace function public.admin_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.families where user_id = auth.uid()
  union
  select fm.family_id from public.family_members fm
   where fm.user_id = auth.uid() and fm.role = 'admin';
$$;

-- ── family_members ────────────────────────────────────────────────────────
drop policy if exists "Users can see own family memberships" on public.family_members;
create policy "Users can see own family memberships" on public.family_members for select
  using (user_id = auth.uid() or family_id in (select public.member_family_ids()));

drop policy if exists "Admins can manage family members" on public.family_members;
create policy "Admins can manage family members" on public.family_members for all
  using (family_id in (select public.admin_family_ids()))
  with check (family_id in (select public.admin_family_ids()));

-- ── family_invitations ────────────────────────────────────────────────────
drop policy if exists "Family admins can manage invitations" on public.family_invitations;
create policy "Family admins can manage invitations" on public.family_invitations for all
  using (family_id in (select public.admin_family_ids()))
  with check (family_id in (select public.admin_family_ids()));

-- ── activity_log ──────────────────────────────────────────────────────────
drop policy if exists "Family members can read activity" on public.activity_log;
create policy "Family members can read activity" on public.activity_log for select
  using (family_id in (select public.member_family_ids()));

drop policy if exists "Family members can write activity" on public.activity_log;
create policy "Family members can write activity" on public.activity_log for insert
  with check (family_id in (select public.member_family_ids()));

-- ── CHECK 1 (static): no policy on these tables may name family_members inline
do $$
declare
  offending text;
begin
  select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
    into offending
  from pg_policies
  where schemaname = 'public'
    and tablename in ('family_members', 'family_invitations', 'activity_log')
    and (coalesce(qual, '') ilike '%from family_members%'
      or coalesce(qual, '') ilike '%from public.family_members%'
      or coalesce(with_check, '') ilike '%from family_members%'
      or coalesce(with_check, '') ilike '%from public.family_members%');

  if offending is not null then
    raise exception
      E'058 FAILED — these policies still subquery family_members inline and will raise 42P17:\n  %\n'
      'Something re-created them after this file ran (027 is the usual culprit — it uses the same '
      'policy names). Re-run 058 as the LAST statement of that session.', offending;
  end if;

  raise notice '058 check 1/2 passed: no inline family_members subquery in any policy on those tables.';
end $$;

-- ── CHECK 2 (runtime): actually read the tables as `authenticated`
-- The static check above cannot see a recursion introduced through some other
-- table's policy. This one just tries the read. Best-effort by design: a
-- probe that cannot run must not block the repair it is verifying.
do $$
declare
  t text;
  failures text := '';
  probe_ok boolean := true;
begin
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config(
      'request.jwt.claims',
      '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',
      true
    );
  exception when others then
    probe_ok := false;
  end;

  if not probe_ok then
    raise notice '058 check 2/2 skipped: could not assume the authenticated role here.';
    return;
  end if;

  foreach t in array array['family_members', 'family_invitations', 'activity_log'] loop
    begin
      execute format('select 1 from public.%I limit 1', t);
    exception when others then
      failures := failures || format(E'\n  %s → %s %s', t, SQLSTATE, left(SQLERRM, 120));
    end;
  end loop;

  perform set_config('role', 'postgres', true);

  if failures <> '' then
    raise exception E'058 FAILED — reading as `authenticated` still errors:%s', failures;
  end if;

  raise notice '058 check 2/2 passed: family_members, family_invitations and activity_log all read cleanly as authenticated. Family Sharing is unblocked.';
end $$;
