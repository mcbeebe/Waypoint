-- 028: Insurance & authorization tracker — slim v1 (roadmap 5.3, F12)
--
-- Decided slim scope: plan/card details, authorization records with
-- expiration countdowns + renewal reminders through the deadlines system,
-- and denial → appeal handoff into the letter generator.
-- Units-used-vs-approved tracking deferred.

-- ── Plan / card details (shown on the tracker, autofill for calls) ─────────
alter table public.families
  add column if not exists insurance_member_id text,
  add column if not exists insurance_group_number text,
  add column if not exists insurance_phone text;

-- ── Authorization records ───────────────────────────────────────────────────
create table if not exists public.insurance_authorizations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete set null,
  service text not null,                    -- e.g. 'ABA — 20 hrs/wk', 'OT 2x/wk'
  provider_name text,
  authorization_number text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'denied', 'appealing', 'expired')),
  start_date date,
  end_date date,                            -- expiration drives the countdown + reminder
  denial_date date,
  denial_reason text,
  notes text,
  -- Renewal reminder created in the deadlines system (F9) when end_date is set
  deadline_id uuid references public.deadlines(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_insurance_auth_family on public.insurance_authorizations(family_id);
create index if not exists idx_insurance_auth_end on public.insurance_authorizations(end_date);

-- updated_at trigger (same helper as core tables from 001)
drop trigger if exists set_insurance_auth_updated_at on public.insurance_authorizations;
create trigger set_insurance_auth_updated_at
  before update on public.insurance_authorizations
  for each row execute function public.handle_updated_at();

-- ── RLS: family-owned ───────────────────────────────────────────────────────
alter table public.insurance_authorizations enable row level security;

drop policy if exists "Users manage own insurance authorizations" on public.insurance_authorizations;
create policy "Users manage own insurance authorizations"
  on public.insurance_authorizations for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

comment on table public.insurance_authorizations is
  'Insurance authorization / denial records (5.3 slim v1). end_date drives expiration countdowns and a linked authorization_expiry deadline.';
