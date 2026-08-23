-- 039: The facilitation workspace core (PRD W-C: C1–C7).
--
--   sdp_cases            one row per family being facilitated: the 5-stage
--                        pipeline, the money (agreed price, certified budget),
--                        and the resumable person-centered-plan draft (C2, C3).
--   service_events       the ONE canonical time-capture model (conflict
--                        C-3(b)): separate from appointments, linkable to one.
--                        099 transition hours are service_events with
--                        activity_type 'transition_099' — the tracker derives
--                        from them, so hours and billing can never disagree (C4, C6).
--   transition_extensions  the only way past the 40-hour 099 cap (C4).
--   spending_plan_lines  the family-directed budget, validated app-side and
--                        guarded in-DB against the conflict-of-interest line:
--                        the operating org can never be a provider (C5, §4685.8).
--   family_baselines     outcomes baseline at start of service, re-measured
--                        at 6/12 months (C7, conflict C-10(b)).
--
-- Money is integer cents everywhere. Hours are minutes on service_events
-- (integer), converted at the edges.

-- ── sdp_cases ───────────────────────────────────────────────────────────────
create table public.sdp_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  facilitator_staff_id uuid references public.staff(id),
  stage text not null default 'intake' check (stage in (
    'intake', 'orientation', 'pcp', 'budget_certification', 'spending_plan',
    'active', 'closed'
  )),
  -- Ongoing facilitation at the family's agreed price (C6) — drives invoices.
  agreed_annual_price_cents bigint check (agreed_annual_price_cents >= 0),
  -- The certified SDP budget the spending plan must sum to (C5).
  certified_budget_cents bigint check (certified_budget_cents >= 0),
  -- Resumable guided PCP capture (C3): strengths, preferences, goals, supports.
  pcp_draft jsonb not null default '{}'::jsonb,
  pcp_completed_at timestamptz,
  orientation_done_on date,
  budget_certified_on date,
  spending_plan_approved_on date,
  started_service_on date,
  last_contact_on date,
  closed_on date,
  close_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One live case per family.
create unique index sdp_cases_live_idx on public.sdp_cases (family_id)
  where closed_on is null;
create index sdp_cases_org_stage_idx on public.sdp_cases (organization_id, stage);

-- ── service_events ──────────────────────────────────────────────────────────
create table public.service_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  staff_id uuid not null references public.staff(id),
  family_id uuid not null references public.families(id) on delete cascade,
  case_id uuid references public.sdp_cases(id) on delete set null,
  activity_type text not null check (activity_type in (
    'intake_call', 'orientation', 'pcp', 'transition_099', 'facilitation',
    'admin', 'other'
  )),
  minutes integer not null check (minutes > 0 and minutes <= 720),
  occurred_on date not null,
  notes text,
  billable boolean not null default true,
  -- Linked, not merged (conflict C-3(b)): an event may come from a calendar
  -- appointment but exists independently of it.
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now()
);

create index service_events_family_idx on public.service_events (family_id, occurred_on);
create index service_events_case_type_idx on public.service_events (case_id, activity_type);
create index service_events_staff_idx on public.service_events (staff_id, occurred_on);

-- ── transition_extensions (past the 40h 099 cap, only with approval) ───────
create table public.transition_extensions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.sdp_cases(id) on delete cascade,
  requested_on date not null,
  approved_on date,
  additional_hours numeric(5,2) not null check (additional_hours > 0),
  approved_by text,        -- who at the RC approved (name/reference)
  notes text,
  created_at timestamptz not null default now()
);

create index transition_extensions_case_idx on public.transition_extensions (case_id);

-- ── spending_plan_lines ─────────────────────────────────────────────────────
create table public.spending_plan_lines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.sdp_cases(id) on delete cascade,
  category text not null,
  provider_name text not null,
  service_code text,
  annual_amount_cents bigint not null check (annual_amount_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spending_plan_lines_case_idx on public.spending_plan_lines (case_id);

-- Conflict-of-interest guard (C5, W&I §4685.8): the operating organization
-- can never appear as a provider on a plan it facilitates. App-side
-- validation explains it; this trigger makes it impossible.
create or replace function public.block_operating_org_provider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_name text;
begin
  select o.name into org_name
  from public.sdp_cases c
  join public.organizations o on o.id = c.organization_id
  where c.id = new.case_id;
  if org_name is not null and lower(trim(new.provider_name)) = lower(trim(org_name)) then
    raise exception
      'The facilitating organization (%) cannot be a provider on the spending plan (W&I §4685.8 independence requirement).',
      org_name;
  end if;
  return new;
end;
$$;

drop trigger if exists spending_plan_coi_guard on public.spending_plan_lines;
create trigger spending_plan_coi_guard
  before insert or update on public.spending_plan_lines
  for each row execute function public.block_operating_org_provider();

-- ── family_baselines ────────────────────────────────────────────────────────
create table public.family_baselines (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.sdp_cases(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  kind text not null default 'baseline' check (kind in ('baseline', '6mo', '12mo')),
  captured_on date not null,
  services_in_place text,
  unmet_needs text,
  coordination_hours_per_week numeric(5,2) check (coordination_hours_per_week >= 0),
  caregiver_strain smallint check (caregiver_strain between 1 and 5),
  remeasure_due_on date,
  created_at timestamptz not null default now()
);

create unique index family_baselines_kind_idx on public.family_baselines (case_id, kind);

-- ── updated_at triggers (reuse the project's standard function) ─────────────
create trigger set_updated_at before update on public.sdp_cases
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.spending_plan_lines
  for each row execute function public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.sdp_cases enable row level security;
alter table public.service_events enable row level security;
alter table public.transition_extensions enable row level security;
alter table public.spending_plan_lines enable row level security;
alter table public.family_baselines enable row level security;

-- Staff work their accessible families; org scoping rides on the case row.
create policy "Staff manage accessible cases" on public.sdp_cases for all
  using (family_id in (select public.accessible_family_ids()))
  with check (family_id in (select public.accessible_family_ids()));

create policy "Staff manage accessible service events" on public.service_events for all
  using (family_id in (select public.accessible_family_ids()))
  with check (family_id in (select public.accessible_family_ids()));

create policy "Staff manage accessible extensions" on public.transition_extensions for all
  using (case_id in (
    select id from public.sdp_cases
    where family_id in (select public.accessible_family_ids())
  ))
  with check (case_id in (
    select id from public.sdp_cases
    where family_id in (select public.accessible_family_ids())
  ));

create policy "Staff manage accessible plan lines" on public.spending_plan_lines for all
  using (case_id in (
    select id from public.sdp_cases
    where family_id in (select public.accessible_family_ids())
  ))
  with check (case_id in (
    select id from public.sdp_cases
    where family_id in (select public.accessible_family_ids())
  ));

create policy "Staff manage accessible baselines" on public.family_baselines for all
  using (family_id in (select public.accessible_family_ids()))
  with check (family_id in (select public.accessible_family_ids()));

-- Transparency: accessible_family_ids() already includes owned families, so
-- the policies above give families read/write on their own case data too.
-- Families directing their own budget IS the product; nothing is hidden
-- from the people it belongs to.
