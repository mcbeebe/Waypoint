-- 036: Family↔staff assignments with explicit consent, the staff access log,
-- and the accessible_family_ids() helper (PRD W-A: A2–A4).
--
-- The consent gate: a staff member can see a family ONLY through an active
-- assignment row. Revoking the assignment (revoked_at set) removes access at
-- the RLS layer immediately — the next query returns zero rows.
--
-- RLS approach (per conflict C-2, adapted): rather than rewriting the ~40
-- existing owner-scoped policies, staff read access is granted through NEW
-- additive policies (PostgreSQL ORs permissive policies together). The helper
-- is SECURITY DEFINER with an empty search_path so policies can call it
-- without re-reading the tables those policies guard — the recursion bug
-- 007_family_sharing hit. Core read set here: families, children, diagnoses,
-- actions. Remaining tables get their staff paths in W1 alongside the
-- features that need them.

-- ── family_assignments ──────────────────────────────────────────────────────
create table public.family_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  role_on_case text not null default 'facilitator'
    check (role_on_case in ('facilitator', 'supervisor')),
  consented_at timestamptz not null default now(),
  consent_version text not null default '1.0',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- One live assignment per family/staff pair; history rows keep revoked_at.
create unique index family_assignments_live_idx
  on public.family_assignments (family_id, staff_id)
  where revoked_at is null;
create index family_assignments_staff_idx on public.family_assignments (staff_id);

-- ── staff_access_log (append-only) ──────────────────────────────────────────
create table public.staff_access_log (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id),
  family_id uuid not null references public.families(id),
  entity text not null,
  entity_id uuid,
  action text not null check (action in ('read', 'create', 'update', 'export')),
  occurred_at timestamptz not null default now()
);

create index staff_access_log_family_idx on public.staff_access_log (family_id, occurred_at);

-- Append-only: no UPDATE/DELETE grants for app roles, enforced at the
-- privilege layer in addition to having no RLS policies for those verbs.
revoke update, delete on public.staff_access_log from anon, authenticated;

-- ── accessible_family_ids() ─────────────────────────────────────────────────
-- The one predicate every family-scoped staff policy uses: families the
-- caller owns, plus families actively assigned to them as staff.
create or replace function public.accessible_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.families where user_id = auth.uid()
  union
  select fa.family_id
  from public.family_assignments fa
  join public.staff s on s.id = fa.staff_id
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
    and fa.revoked_at is null;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.family_assignments enable row level security;
alter table public.staff_access_log enable row level security;

-- Families see (and can revoke) their own assignments; staff see theirs.
create policy "Families see own assignments" on public.family_assignments for select
  using (family_id in (select id from public.families where user_id = auth.uid()));

create policy "Families revoke own assignments" on public.family_assignments for update
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

create policy "Staff see own assignments" on public.family_assignments for select
  using (staff_id in (select id from public.staff where auth_user_id = auth.uid()));

-- Admins create assignments (consent capture is part of the create flow).
create policy "Admins manage assignments" on public.family_assignments for all
  using (
    organization_id in (
      select organization_id from public.staff s
      where s.auth_user_id = auth.uid() and s.role = 'admin' and s.status = 'active'
    )
  );

-- Access log: staff append rows about themselves; families read their own log.
create policy "Staff append own access log" on public.staff_access_log for insert
  with check (staff_id in (select id from public.staff where auth_user_id = auth.uid()));

create policy "Families read own access log" on public.staff_access_log for select
  using (family_id in (select id from public.families where user_id = auth.uid()));

-- ── Additive staff read paths (core read set) ───────────────────────────────
create policy "Assigned staff read families" on public.families for select
  using (id in (select public.accessible_family_ids()));

create policy "Assigned staff read children" on public.children for select
  using (family_id in (select public.accessible_family_ids()));

create policy "Assigned staff read diagnoses" on public.diagnoses for select
  using (child_id in (
    select c.id from public.children c
    where c.family_id in (select public.accessible_family_ids())
  ));

create policy "Assigned staff read actions" on public.actions for select
  using (family_id in (select public.accessible_family_ids()));

-- ── Verification queries (run manually; both must return zero rows) ─────────
-- 1. No staff row without a matching profile role:
--    select s.* from public.staff s
--      join public.profiles p on p.user_id = s.auth_user_id
--      where s.status = 'active' and p.role <> s.role;
-- 2. No live duplicate assignments:
--    select family_id, staff_id, count(*) from public.family_assignments
--      where revoked_at is null group by 1, 2 having count(*) > 1;
