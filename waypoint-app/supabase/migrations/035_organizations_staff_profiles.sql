-- 035: Organizations, profiles, and staff — the two-sided foundation (PRD W-A).
--
-- Three things this migration establishes:
--   1. organizations — tenancy from day one. Every staff-bearing table FKs to
--      an organization so a second org (a licensed facilitator practice, a
--      partner) onboards with data, not code. Waypoint itself is org #1.
--   2. profiles — one row per auth user resolving their role at login.
--      The app routes on this BEFORE touching families: a staff login must
--      never fall into parent onboarding or create a families row.
--   3. staff — the staff registry (facilitator/supervisor/admin), org-scoped.
--
-- Roles live in tables, not JWT claims, so a role change takes effect on the
-- next request without re-issuing tokens (conflict C-1, option b).

-- ── organizations ───────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

insert into public.organizations (name, slug) values ('Waypoint', 'waypoint');

-- ── profiles ────────────────────────────────────────────────────────────────
-- role: 'family' is the default for every signup; staff roles are granted by
-- an admin writing the staff row (kept in sync by trigger below).
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'family'
    check (role in ('family', 'facilitator', 'supervisor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every existing auth user is a family member today.
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- New signups get a profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── staff ───────────────────────────────────────────────────────────────────
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('facilitator', 'supervisor', 'admin')),
  full_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  supervisor_id uuid references public.staff(id),
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_org_idx on public.staff (organization_id);

-- Keep profiles.role in sync with the staff registry: writing/removing a
-- staff row is what grants/revokes a staff role.
create or replace function public.sync_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set role = 'family', updated_at = now()
      where user_id = old.auth_user_id;
    return old;
  end if;
  if new.status = 'active' then
    insert into public.profiles (user_id, role) values (new.auth_user_id, new.role)
      on conflict (user_id) do update set role = excluded.role, updated_at = now();
  else
    update public.profiles set role = 'family', updated_at = now()
      where user_id = new.auth_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_staff_change on public.staff;
create trigger on_staff_change
  after insert or update or delete on public.staff
  for each row execute function public.sync_profile_role();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;

-- Users read their own profile; nobody writes it from the client
-- (role changes flow only through the staff table's trigger).
create policy "Users read own profile" on public.profiles for select
  using (user_id = auth.uid());

-- Staff can read their own org and its staff roster; admins manage staff.
create policy "Staff read own org" on public.organizations for select
  using (id in (select organization_id from public.staff where auth_user_id = auth.uid()));

create policy "Staff read own org roster" on public.staff for select
  using (
    auth_user_id = auth.uid()
    or organization_id in (select organization_id from public.staff s where s.auth_user_id = auth.uid())
  );

create policy "Admins manage staff" on public.staff for all
  using (
    organization_id in (
      select organization_id from public.staff s
      where s.auth_user_id = auth.uid() and s.role = 'admin' and s.status = 'active'
    )
  );
