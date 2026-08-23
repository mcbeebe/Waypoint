-- 040: Getting paid (PRD W-D: D1–D2) — dual payer paths and the 099
-- vendorization gate.
--
--   invoices / invoice_lines   one invoice model, two payers: the Regional
--                              Center (024 PCP reimbursement, 099 transition
--                              hours) or the family's FMS (ongoing
--                              facilitation at the family's agreed price).
--                              Every line traces to a logged service event —
--                              billing that can't disagree with time capture,
--                              and an event that can never be billed twice.
--   vendor_packets             the 099 vendorization packet tracker (D1):
--                              099 invoicing is blocked in-app until a packet
--                              is 'vendored'.

-- ── invoices ────────────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  invoice_number text not null unique,
  payer_type text not null check (payer_type in ('regional_center', 'fms')),
  payer_name text not null,          -- e.g. 'RCEB' or the family's FMS
  family_id uuid references public.families(id) on delete set null,
  case_id uuid references public.sdp_cases(id) on delete set null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'paid', 'void'
  )),
  period_start date,
  period_end date,
  issued_on date,
  due_on date,
  paid_on date,
  total_cents bigint not null default 0 check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_org_status_idx on public.invoices (organization_id, status);
create index invoices_family_idx on public.invoices (family_id);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  -- The traceability rule: a billable line points at the service event it
  -- bills, and one event can appear on at most one invoice line — double
  -- billing is a constraint violation, not a review finding.
  service_event_id uuid unique references public.service_events(id) on delete restrict,
  description text not null,
  service_code text,                 -- '024', '099', or FMS facilitation
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  amount_cents bigint not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

-- ── vendor_packets ──────────────────────────────────────────────────────────
create table public.vendor_packets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  packet_type text not null default '099' check (packet_type in ('024', '099', 'fms')),
  regional_center text not null,     -- which RC this packet vendorizes with
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'vendored', 'rejected'
  )),
  submitted_on date,
  vendored_on date,
  vendor_number text,
  checklist jsonb not null default '{}'::jsonb,  -- per Operations/099-Vendorization-Packet-Checklist.md
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vendor_packets_live_idx
  on public.vendor_packets (organization_id, packet_type, regional_center)
  where status <> 'rejected';

-- ── updated_at ──────────────────────────────────────────────────────────────
create trigger set_updated_at before update on public.invoices
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.vendor_packets
  for each row execute function public.handle_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.vendor_packets enable row level security;

-- Invoicing is org-staff business: any active staff of the org reads,
-- admins and supervisors write.
create policy "Org staff read invoices" on public.invoices for select
  using (organization_id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active'
  ));

create policy "Org billing staff manage invoices" on public.invoices for all
  using (organization_id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active'
      and role in ('admin', 'supervisor')
  ))
  with check (organization_id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active'
      and role in ('admin', 'supervisor')
  ));

create policy "Org staff read invoice lines" on public.invoice_lines for select
  using (invoice_id in (
    select i.id from public.invoices i
    where i.organization_id in (
      select organization_id from public.staff
      where auth_user_id = auth.uid() and status = 'active'
    )
  ));

create policy "Org billing staff manage invoice lines" on public.invoice_lines for all
  using (invoice_id in (
    select i.id from public.invoices i
    where i.organization_id in (
      select organization_id from public.staff
      where auth_user_id = auth.uid() and status = 'active'
        and role in ('admin', 'supervisor')
    )
  ))
  with check (invoice_id in (
    select i.id from public.invoices i
    where i.organization_id in (
      select organization_id from public.staff
      where auth_user_id = auth.uid() and status = 'active'
        and role in ('admin', 'supervisor')
    )
  ));

-- A family sees invoices billed against its own budget (FMS path) — the
-- same transparency rule as the spending plan.
create policy "Families read own invoices" on public.invoices for select
  using (family_id in (select id from public.families where user_id = auth.uid()));

create policy "Org staff read vendor packets" on public.vendor_packets for select
  using (organization_id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active'
  ));

create policy "Admins manage vendor packets" on public.vendor_packets for all
  using (organization_id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  ))
  with check (organization_id in (
    select organization_id from public.staff
    where auth_user_id = auth.uid() and status = 'active' and role = 'admin'
  ));
