-- 041: Billing automation & owner-dashboard read paths (PRD W-D: D3, D4).
--
--   organizations.rate_099_cents   the org's hourly 099 billing rate; 099
--                                  drafting refuses (with a reason) until set.
--   billing_job_runs               append-only ledger of every scheduled
--                                  billing run — "no silent lapse" means a
--                                  row exists even when nothing was created.
--   generate_anniversary_invoices  D3: on each case's service anniversary,
--                                  draft the FMS facilitation invoice at the
--                                  family's agreed price. Scheduled via
--                                  pg_cron when available (Supabase has it);
--                                  the DO block keeps local envs without the
--                                  extension from failing.
--   analytics read for admins      D4: the funnel numbers on the owner
--                                  dashboard read analytics_events, which
--                                  until now only families could touch.

-- ── org billing settings ────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists rate_099_cents bigint check (rate_099_cents > 0);

create policy "Admins update own org" on public.organizations for update
  using (id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  ))
  with check (id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  ));

-- ── billing job ledger ──────────────────────────────────────────────────────
create table public.billing_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ran_at timestamptz not null default now(),
  created_count integer not null default 0,
  error text
);

alter table public.billing_job_runs enable row level security;

create policy "Org staff read job runs" on public.billing_job_runs for select
  using (exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and status = 'active'
  ));

revoke update, delete on public.billing_job_runs from anon, authenticated;

-- ── anniversary re-invoicing (D3) ───────────────────────────────────────────
create or replace function public.generate_anniversary_invoices()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  created integer := 0;
  c record;
begin
  for c in
    select sc.id, sc.organization_id, sc.family_id, sc.agreed_annual_price_cents
    from public.sdp_cases sc
    where sc.closed_on is null
      and sc.stage = 'active'
      and sc.agreed_annual_price_cents is not null
      and sc.started_service_on is not null
      and sc.started_service_on < current_date
      and to_char(sc.started_service_on, 'MM-DD') = to_char(current_date, 'MM-DD')
      -- No duplicate: skip when a facilitation invoice already covers a
      -- period starting today for this case.
      and not exists (
        select 1 from public.invoices i
        where i.case_id = sc.id
          and i.payer_type = 'fms'
          and i.period_start = current_date
      )
  loop
    insert into public.invoices (
      organization_id, invoice_number, payer_type, payer_name,
      family_id, case_id, status, period_start, period_end, total_cents, notes
    ) values (
      c.organization_id,
      'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6),
      'fms',
      'FMS (on file)',
      c.family_id,
      c.id,
      'draft',
      current_date,
      current_date + interval '1 year' - interval '1 day',
      c.agreed_annual_price_cents,
      'Annual facilitation renewal — generated automatically on the service anniversary.'
    );
    created := created + 1;
  end loop;

  insert into public.billing_job_runs (job, created_count)
  values ('anniversary_invoices', created);
  return created;
exception when others then
  insert into public.billing_job_runs (job, created_count, error)
  values ('anniversary_invoices', created, sqlerrm);
  raise;
end;
$$;

-- Schedule daily at 08:00 UTC where pg_cron exists (Supabase); elsewhere the
-- function can be invoked manually or from an edge function.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'anniversary-invoices',
      '0 8 * * *',
      $job$select public.generate_anniversary_invoices()$job$
    );
  end if;
end;
$$;

-- ── owner-dashboard read paths (D4) ─────────────────────────────────────────
-- Funnel conversion reads funnel_step events; only supervisors/admins get
-- the aggregate view (events remain pseudonymous family_ids, no PII).
create policy "Org leadership read analytics events" on public.analytics_events
  for select using (exists (
    select 1 from public.staff
    where auth_user_id = auth.uid() and status = 'active'
      and role in ('admin', 'supervisor')
  ));
