-- 055: Family Sharing — remove the family_members policy recursion.
--
-- BUG (reproduced in a real PostgreSQL 16 cluster built from this repo's own
-- 007 → 027 policy text, during the B3 adversary pass): the family_members
-- SELECT policy (007, re-issued by 016, broadened by 027) subqueries
-- family_members from INSIDE a family_members policy —
--   family_id in (select family_id from family_members where user_id = auth.uid())
-- — so Postgres expands the policy into itself and raises
--   ERROR 42P17: infinite recursion detected in policy for relation "family_members"
-- on EVERY direct client read or write of family_members. The "Admins can
-- manage family members" and "Family admins can manage invitations" policies
-- do the same (…where role = 'admin'), and activity_log's policies subquery
-- family_members too, so all three tables are poisoned. This is the exact
-- mechanism 049 documented and fixed for home_deferrals; landmine #1 in
-- Roadmap/initiatives/007-family-sharing-invites/analysis.md. It also
-- explains the owner's "0 members / no invite button" screenshot: the Family
-- Sharing screen's first read errors before its owner fallback can run — and
-- applying 027 alone would NOT have fixed it, because 027 keeps the
-- self-reference.
--
-- Consequences it caused inside this initiative:
--   * a co-parent who accepted an invite could not be resolved as a member by
--     the client (App's onboarding check, useFamily's B1 fallback) → sent to
--     "create your own family" in a loop;
--   * "Revoke" (a client DELETE on family_invitations) errored, the optimistic
--     card vanished anyway, and the revoked link stayed redeemable for 14 days.
--
-- FIX: resolve the family/admin sets in SECURITY DEFINER functions (they run
-- as their owner and never re-enter the guarded tables), then point every
-- policy at them — no inline self-subquery anywhere. member_family_ids() is
-- 049/053's (re-declared identically for self-containment); admin_family_ids()
-- is new: the families this user OWNS or holds an 'admin' membership in.
-- No grant/revoke, matching 049/050/053.
--
-- Apply by hand in the Supabase SQL editor, in order — with 054. Pure RLS:
-- nothing in CI verifies it. One read-only query shows whether the live
-- project has the recursive shape:
--   select policyname, qual from pg_policies where tablename = 'family_members';

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

-- ── family_members ──
drop policy if exists "Users can see own family memberships" on public.family_members;
create policy "Users can see own family memberships" on public.family_members for select
  using (user_id = auth.uid() or family_id in (select public.member_family_ids()));

drop policy if exists "Admins can manage family members" on public.family_members;
create policy "Admins can manage family members" on public.family_members for all
  using (family_id in (select public.admin_family_ids()))
  with check (family_id in (select public.admin_family_ids()));

-- ── family_invitations ──
drop policy if exists "Family admins can manage invitations" on public.family_invitations;
create policy "Family admins can manage invitations" on public.family_invitations for all
  using (family_id in (select public.admin_family_ids()))
  with check (family_id in (select public.admin_family_ids()));

-- ── activity_log ──
drop policy if exists "Family members can read activity" on public.activity_log;
create policy "Family members can read activity" on public.activity_log for select
  using (family_id in (select public.member_family_ids()));

drop policy if exists "Family members can write activity" on public.activity_log;
create policy "Family members can write activity" on public.activity_log for insert
  with check (family_id in (select public.member_family_ids()));
