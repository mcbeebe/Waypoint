-- 013: Documents & IEP Intelligence (roadmap Phase 2)
-- Storage bucket for the document vault, document versioning, share-link
-- records, IEP goal tracker tables, and IEP timeline dates on children.

-- ─── Storage bucket ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Families can only touch objects under their own family-id folder
create policy "Families manage own document files"
  on storage.objects for all
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.families where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select id::text from public.families where user_id = auth.uid()
    )
  );

-- ─── Document versioning ────────────────────────────────────────────────────
alter table public.documents
  add column version integer not null default 1,
  add column version_group_id uuid;

comment on column public.documents.version_group_id is
  'Shared id linking versions of the same logical document (the first version''s row id)';

create index idx_documents_version_group on public.documents(version_group_id)
  where version_group_id is not null;

-- ─── Share links (record of created links; delivery uses signed URLs) ───────
create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  expires_at timestamptz not null,
  note text,
  created_at timestamptz default now() not null
);

create index idx_document_shares_document on public.document_shares(document_id);

alter table public.document_shares enable row level security;

create policy "Families manage their own document shares"
  on public.document_shares for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

-- ─── IEP goal tracker ───────────────────────────────────────────────────────
create table public.iep_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  domain text not null,             -- 'Communication', 'Social', 'Academic', 'Motor', 'Behavior', 'Adaptive', 'Other'
  goal_text text not null,
  baseline text,
  target text,
  measurement text,                 -- how progress is measured
  status text not null default 'active'
    check (status in ('active', 'met', 'discontinued')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_iep_goals_family on public.iep_goals(family_id);
create index idx_iep_goals_child on public.iep_goals(child_id);

create trigger set_updated_at before update on public.iep_goals
  for each row execute function public.handle_updated_at();

alter table public.iep_goals enable row level security;

create policy "Families manage their own IEP goals"
  on public.iep_goals for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

create table public.iep_goal_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.iep_goals(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  note text not null,
  progress_pct integer check (progress_pct between 0 and 100),
  logged_at timestamptz default now() not null
);

create index idx_iep_goal_logs_goal on public.iep_goal_logs(goal_id);

alter table public.iep_goal_logs enable row level security;

create policy "Families manage their own IEP goal logs"
  on public.iep_goal_logs for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

-- ─── IEP timeline dates (drive the deadline clocks) ─────────────────────────
alter table public.children
  add column iep_last_annual_review date,
  add column iep_last_triennial date,
  add column iep_assessment_plan_requested date,
  add column iep_assessment_consent_signed date;

comment on column public.children.iep_assessment_plan_requested is
  'Date a written assessment request was sent — starts the 15-calendar-day assessment-plan clock (CA Ed Code §56321)';
comment on column public.children.iep_assessment_consent_signed is
  'Date the signed assessment plan was returned — starts the 60-day evaluation clock';
