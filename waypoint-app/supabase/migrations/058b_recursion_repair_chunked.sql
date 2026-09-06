-- 058b: the same repair as 058, in five separately-runnable chunks.
--
-- USE THIS IF 058 DEADLOCKED. On the production project 058 failed with:
--
--   ERROR: 40P01 deadlock detected
--   Process A waits for AccessExclusiveLock on relation X; blocked by process B.
--   Process B waits for AccessShareLock on relation Y; blocked by process A.
--
-- WHY. 058 runs as ONE transaction, and inside it does three things that hold
-- locks on all three tables at once: `drop policy` / `create policy` take an
-- AccessExclusiveLock on each table and hold it to commit, and then CHECK 2
-- reads all three tables, taking AccessShareLock on each. Meanwhile the live
-- app (PostgREST) is serving requests that read those same tables. That is a
-- textbook lock-ordering cycle: our transaction holds exclusive on one table
-- and wants exclusive on the next, while a request holds a share lock on the
-- next and wants one on the first. Postgres kills one of them.
--
-- Nothing is half-applied when this happens — the whole transaction rolls
-- back. Confirm with the diagnostic at the bottom before and after.
--
-- 058 IS NOT WRONG; it is just a big transaction competing with live traffic.
-- Simply re-running it usually succeeds. This file is the version to reach for
-- when it does not.
--
-- HOW TO RUN: paste and run ONE CHUNK AT A TIME. Each is idempotent, each is
-- safe to retry on its own, and none of them leaves the database worse than it
-- found it — a chunk either applies or rolls back. `lock_timeout` makes a
-- contended chunk fail fast (55P03 lock_not_available) instead of queueing
-- behind live traffic until it deadlocks; if that happens, just run that chunk
-- again. Chunk 5 is read-only and takes no exclusive locks at all.
--
-- Between chunks the database is in a MIXED state — some tables repaired,
-- some not. That is safe: each table's policies are independent, and a table
-- still on the old policies just keeps raising 42P17 exactly as it does now.
-- Do not stop halfway on purpose, but nothing breaks if you have to.

-- ══ CHUNK 1 ═══ the SECURITY DEFINER helpers. Locks no tables at all. ══
begin;
set local lock_timeout = '5s';

create or replace function public.member_family_ids()
returns setof uuid language sql security definer stable set search_path = '' as $$
  select id from public.families where user_id = auth.uid()
  union
  select fm.family_id from public.family_members fm where fm.user_id = auth.uid();
$$;

create or replace function public.admin_family_ids()
returns setof uuid language sql security definer stable set search_path = '' as $$
  select id from public.families where user_id = auth.uid()
  union
  select fm.family_id from public.family_members fm
   where fm.user_id = auth.uid() and fm.role = 'admin';
$$;

commit;

-- ══ CHUNK 2 ═══ family_members. One table, one lock. ══
begin;
set local lock_timeout = '5s';

drop policy if exists "Users can see own family memberships" on public.family_members;
create policy "Users can see own family memberships" on public.family_members for select
  using (user_id = auth.uid() or family_id in (select public.member_family_ids()));

drop policy if exists "Admins can manage family members" on public.family_members;
create policy "Admins can manage family members" on public.family_members for all
  using (family_id in (select public.admin_family_ids()))
  with check (family_id in (select public.admin_family_ids()));

commit;

-- ══ CHUNK 3 ═══ family_invitations ══
begin;
set local lock_timeout = '5s';

drop policy if exists "Family admins can manage invitations" on public.family_invitations;
create policy "Family admins can manage invitations" on public.family_invitations for all
  using (family_id in (select public.admin_family_ids()))
  with check (family_id in (select public.admin_family_ids()));

commit;

-- ══ CHUNK 4 ═══ activity_log ══
begin;
set local lock_timeout = '5s';

drop policy if exists "Family members can read activity" on public.activity_log;
create policy "Family members can read activity" on public.activity_log for select
  using (family_id in (select public.member_family_ids()));

drop policy if exists "Family members can write activity" on public.activity_log;
create policy "Family members can write activity" on public.activity_log for insert
  with check (family_id in (select public.member_family_ids()));

commit;

-- ══ CHUNK 5 ═══ verify. Read-only — no exclusive locks, cannot deadlock. ══
--
-- Expect: five rows, every one `still_recursive = false`.
select tablename, policyname,
       (coalesce(qual, '') ilike '%from family_members%'
        or coalesce(with_check, '') ilike '%from family_members%') as still_recursive
from pg_policies
where schemaname = 'public'
  and tablename in ('family_members', 'family_invitations', 'activity_log')
order by tablename, policyname;

-- And the check that actually matters — does a signed-in parent get their data?
-- Expect three rows, all `OK`. Anything else and the repair is not done.
do $$
declare t text; failures text := '';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
  foreach t in array array['family_members', 'family_invitations', 'activity_log'] loop
    begin
      execute format('select 1 from public.%I limit 1', t);
    exception when others then
      failures := failures || format(E'\n  %s → %s %s', t, SQLSTATE, left(SQLERRM, 120));
    end;
  end loop;
  perform set_config('role', 'postgres', true);
  if failures <> '' then
    raise exception E'STILL BROKEN — reading as `authenticated` errors:%s', failures;
  end if;
  raise notice 'Repair complete: all three tables read cleanly as authenticated. Family Sharing is unblocked.';
end $$;
