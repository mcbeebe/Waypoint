-- 027: Family owners can actually use Family Sharing.
--
-- Bug: the 007 policies gate member/invitation management on having an
-- *admin row in family_members* — but the account that created the family
-- never gets one, so the owner could neither see the invite button (client
-- derived their role from family_members) nor insert an invitation (RLS).
--
-- Fix, in two parts:
--   1. Backfill an admin membership row for every family owner.
--   2. Broaden the policies so the family owner (families.user_id) is
--      always treated as an admin, even without a membership row (covers
--      families created after this migration too).

-- ── 1. Backfill owner memberships ───────────────────────────────────────────
insert into public.family_members (family_id, user_id, role, display_name)
select f.id, f.user_id, 'admin', coalesce(nullif(trim(f.parent_first_name), ''), 'Parent')
from public.families f
where f.user_id is not null
on conflict (family_id, user_id) do nothing;

-- ── 2. Owner-aware policies ─────────────────────────────────────────────────
drop policy if exists "Users can see own family memberships" on public.family_members;
create policy "Users can see own family memberships" on public.family_members for select
  using (
    user_id = auth.uid()
    or family_id in (select family_id from public.family_members where user_id = auth.uid())
    or family_id in (select id from public.families where user_id = auth.uid())
  );

drop policy if exists "Admins can manage family members" on public.family_members;
create policy "Admins can manage family members" on public.family_members for all
  using (
    family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin')
    or family_id in (select id from public.families where user_id = auth.uid())
  );

drop policy if exists "Family admins can manage invitations" on public.family_invitations;
create policy "Family admins can manage invitations" on public.family_invitations for all
  using (
    family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin')
    or family_id in (select id from public.families where user_id = auth.uid())
  );

drop policy if exists "Family members can read activity" on public.activity_log;
create policy "Family members can read activity" on public.activity_log for select
  using (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
    or family_id in (select id from public.families where user_id = auth.uid())
  );

drop policy if exists "Family members can write activity" on public.activity_log;
create policy "Family members can write activity" on public.activity_log for insert
  with check (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
    or family_id in (select id from public.families where user_id = auth.uid())
  );
