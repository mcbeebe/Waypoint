-- 042: Sponsor-aware entitlements (PRD W-E: E2) + the monthly AI meter the
-- tier gates read (E4).
--
-- One rule the whole tier system hangs on: an entitlement row grants
-- Premium; the ABSENCE of rows is the free tier. Sponsorship is a
-- first-class dimension so "district pays" and "employer pays" onboard
-- later as data — facilitation clients are auto-entitled by trigger the
-- moment their case goes active ("Included with your facilitation — you
-- pay $0"), and the grant expires when the case closes.

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  tier text not null default 'premium' check (tier in ('premium')),
  sponsor_type text not null default 'self' check (sponsor_type in (
    'self',          -- the family subscribes (Stripe)
    'facilitation',  -- active facilitation client (auto)
    'district', 'employer', 'licensee'
  )),
  -- Where the grant came from: Stripe subscription id, sdp_case id, contract ref
  source text,
  period_start date not null default current_date,
  period_end date,          -- null = until revoked (sponsored grants)
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index entitlements_family_idx on public.entitlements (family_id, status);
-- One live grant per family per sponsor path.
create unique index entitlements_live_idx
  on public.entitlements (family_id, sponsor_type)
  where status = 'active';

create trigger set_updated_at before update on public.entitlements
  for each row execute function public.handle_updated_at();

-- ── auto-entitlement for facilitation clients (E2) ──────────────────────────
create or replace function public.sync_facilitation_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage = 'active' and new.closed_on is null then
    insert into public.entitlements (family_id, sponsor_type, source, status)
    values (new.family_id, 'facilitation', new.id::text, 'active')
    on conflict (family_id, sponsor_type) where status = 'active'
    do nothing;
  elsif new.closed_on is not null then
    update public.entitlements
      set status = 'expired', period_end = new.closed_on, updated_at = now()
      where family_id = new.family_id
        and sponsor_type = 'facilitation'
        and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists on_case_entitlement on public.sdp_cases;
create trigger on_case_entitlement
  after insert or update of stage, closed_on on public.sdp_cases
  for each row execute function public.sync_facilitation_entitlement();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.entitlements enable row level security;

create policy "Families read own entitlements" on public.entitlements for select
  using (family_id in (select id from public.families where user_id = auth.uid()));

create policy "Staff read accessible entitlements" on public.entitlements for select
  using (family_id in (select public.accessible_family_ids()));

create policy "Admins manage entitlements" on public.entitlements for all
  using (exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  ))
  with check (exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  ));
-- Stripe webhook writes arrive via the service role (bypasses RLS).

-- ── monthly AI meter (E4) ───────────────────────────────────────────────────
-- The ai-proxy reads this to enforce the free tier's monthly Navigator cap
-- (the daily ceiling in 015 stays as the anti-abuse backstop for everyone).
create or replace function public.monthly_ai_usage(p_user uuid)
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(sum(requests), 0)::integer
  from public.ai_usage
  where user_id = p_user
    and day >= date_trunc('month', current_date)::date;
$$;

revoke all on function public.monthly_ai_usage(uuid) from public, anon, authenticated;
