-- 025: Key contacts — the people around this family's case (D4)
--
-- Teachers, case managers, principals, Regional Center service
-- coordinators, insurance case workers. Stored once in Profile, then
-- auto-filled into generated letters (real names instead of [BRACKETS]),
-- offered as recipients in email flows, and given to the AI Navigator so
-- it can reference "your SC Maria" naturally.

create table if not exists public.family_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,

  name text not null,
  role text,           -- "Service Coordinator", "SpEd Teacher", "Principal"
  organization text check (organization in ('regional_center', 'school', 'insurance', 'medical', 'other')),
  email text,
  phone text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_family_contacts_family
  on public.family_contacts(family_id, created_at);

alter table public.family_contacts enable row level security;

drop policy if exists "Users manage own contacts" on public.family_contacts;
create policy "Users manage own contacts"
  on public.family_contacts for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

drop trigger if exists set_family_contacts_updated_at on public.family_contacts;
create trigger set_family_contacts_updated_at
  before update on public.family_contacts
  for each row execute function public.handle_updated_at();
