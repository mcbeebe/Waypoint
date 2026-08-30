-- 049: home_deferrals RLS — remove the family_members recursion.
--
-- BUG (confirmed, live on any project where 048 is applied):
-- 048's "Families manage own deferrals" policy subqueries public.family_members
-- in both USING and WITH CHECK. family_members' own policies (007, re-issued by
-- 016, broadened by 027) themselves subquery family_members, so Postgres expands
-- the home_deferrals policy into family_members' policy into itself and raises
--   ERROR 42P17: infinite recursion detected in policy for relation "family_members"
-- on EVERY read AND write of home_deferrals. useDeferrals reads that as a failed
-- read (correctly NOT a missing table, since the message contains no
-- "home_deferrals"), falls back to the device via reconcile()'s remote===null
-- branch, and Home appends "· on this device only" even though 048 is applied —
-- so a co-parent never sees the other parent's set-aside items, and the card
-- tells both of them their deferrals are device-only. Independently reproduced
-- in a real PostgreSQL cluster built from this repo's own policy text.
--
-- FIX: the pattern this repo already established in 036 — resolve the family set
-- in a SECURITY DEFINER function, which runs as the function owner and so never
-- re-enters family_members' policies. 036's own comment names this exact bug:
-- "so policies can call it without re-reading the tables those policies guard —
--  the recursion bug 007_family_sharing hit." 048 walked back into it.
--
-- A NEW helper, not accessible_family_ids(): that one also returns families
-- assigned to STAFF, and reusing it on this FOR ALL policy would silently
-- promote assigned staff from SELECT-only (048's "Assigned staff read
-- deferrals") to full write. member_family_ids() returns owner + co-parent
-- only — exactly 048's stated intent.
--
-- No grant/revoke on the function, matching accessible_family_ids() in 036:
-- adding `revoke ... from public` would make the policy raise a permission
-- error for the anon role instead of returning zero rows.
--
-- Apply by hand in the Supabase SQL editor, in order, like every migration.
-- No restart or cache flush is needed — PostgREST re-plans per request. This is
-- a schema/RLS change: no app code changes, so nothing in CI verifies it; it is
-- verifiable only against a live database.

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

drop policy if exists "Families manage own deferrals" on public.home_deferrals;
create policy "Families manage own deferrals" on public.home_deferrals for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

-- The staff SELECT policy ("Assigned staff read deferrals") already uses the
-- SECURITY DEFINER accessible_family_ids() and is not part of the recursion —
-- left untouched.
