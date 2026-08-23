-- 037: The family request tracker (PRD W-G: G4) — every ask a family has in
-- flight with the system: service requests, assessments, IPP meetings,
-- authorizations, reimbursements. The app computes the statutory clock per
-- type client-side; an overdue item offers the matching lever letter.
--
-- This is the flywheel table: a family tracking its traditional-path pain
-- is simultaneously assembling the documented-unmet-needs record that
-- becomes its SDP budget case. Aggregated (consented) outcomes later feed
-- the days-to-service accountability dataset (G5).

create table public.family_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  request_type text not null check (request_type in (
    'rc_intake', 'rc_assessment', 'ipp_meeting', 'service_request',
    'authorization', 'reimbursement', 'iep_evaluation', 'other'
  )),
  title text not null,
  requested_on date not null,
  channel text,                -- how it was asked: letter, email, phone, in person
  status text not null default 'requested' check (status in (
    'requested', 'in_progress', 'granted', 'denied', 'withdrawn'
  )),
  decided_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_requests_family_idx on public.family_requests (family_id, status);

alter table public.family_requests enable row level security;

create policy "Families manage own requests" on public.family_requests for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

-- Assigned staff read (same additive pattern as 036's core read set)
create policy "Assigned staff read requests" on public.family_requests for select
  using (family_id in (select public.accessible_family_ids()));
