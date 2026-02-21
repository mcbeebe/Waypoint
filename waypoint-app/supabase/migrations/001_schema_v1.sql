-- Waypoint Database Schema v1
-- Sprint 1, Issue #4
-- Tables: families, children, diagnoses, services, documents,
--         expenses, appointments, providers, knowledge_embeddings

-- Enable pgvector for RAG embeddings
create extension if not exists vector with schema extensions;

-- ============================================================
-- FAMILIES
-- Core account table, linked to Supabase auth.users
-- ============================================================
create table public.families (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  parent_first_name text,
  parent_last_name text,
  email text,
  phone text,
  state text default 'CA',
  county text,
  zip_code text,
  regional_center text,
  school_district text,
  insurance_carrier text,
  insurance_plan text,
  income_bracket text,
  onboarding_completed boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- CHILDREN
-- Each family can have multiple children
-- ============================================================
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  first_name text not null,
  last_name text,
  date_of_birth date,
  gender text,
  is_primary boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- DIAGNOSES
-- Linked to children — supports multiple diagnoses per child
-- ============================================================
create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  name text not null,
  icd_code text,
  diagnosed_date date,
  diagnosing_provider text,
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- PROVIDERS
-- Therapists, doctors, coordinators, attorneys, etc.
-- ============================================================
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  name text not null,
  provider_type text not null, -- 'therapist', 'doctor', 'attorney', 'coordinator', 'school', 'regional_center'
  specialty text,
  organization text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- SERVICES
-- Active services for each child (OT, ABA, speech, etc.)
-- ============================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  provider_id uuid references public.providers(id) on delete set null,
  service_type text not null, -- 'OT', 'ABA', 'speech', 'PT', 'behavioral', 'respite', 'other'
  funding_source text, -- 'insurance', 'regional_center', 'medi-cal', 'ccs', 'private_pay', 'school'
  authorized_hours numeric,
  frequency text, -- '2x/week', 'monthly', etc.
  start_date date,
  end_date date,
  authorization_number text,
  status text default 'active', -- 'active', 'pending', 'denied', 'ended'
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- DOCUMENTS
-- Document vault: IEPs, evaluations, insurance docs, etc.
-- ============================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete set null,
  title text not null,
  document_type text not null, -- 'iep', 'evaluation', 'insurance_denial', 'appeal', 'medical_record', 'ipp', 'other'
  file_path text,
  file_size bigint,
  mime_type text,
  extracted_text text, -- OCR / parsed text for AI processing
  key_dates jsonb, -- extracted dates (annual review, expiry, etc.)
  tags text[],
  uploaded_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- EXPENSES
-- Financial tracker for disability-related expenses
-- ============================================================
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  category text not null, -- 'therapy', 'equipment', 'transportation', 'copay', 'medication', 'other'
  description text,
  amount numeric(10,2) not null,
  expense_date date not null,
  funding_source text, -- 'out_of_pocket', 'insurance', 'regional_center', 'medi-cal'
  is_tax_deductible boolean default false,
  receipt_document_id uuid references public.documents(id) on delete set null,
  reimbursement_status text default 'none', -- 'none', 'submitted', 'approved', 'denied', 'received'
  reimbursement_amount numeric(10,2),
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- APPOINTMENTS
-- Calendar tracking for all appointments
-- ============================================================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  title text not null,
  appointment_type text, -- 'therapy', 'iep_meeting', 'ipp_meeting', 'medical', 'evaluation', 'other'
  start_time timestamptz not null,
  end_time timestamptz,
  location text,
  notes text,
  reminder_sent boolean default false,
  status text default 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- DEADLINES
-- IEP reviews, appeal windows, SSI redeterminations, etc.
-- ============================================================
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  child_id uuid references public.children(id) on delete set null,
  title text not null,
  deadline_type text not null, -- 'iep_annual_review', 'insurance_appeal', 'ssi_redetermination', 'ipp_review', 'authorization_expiry', 'other'
  due_date date not null,
  reminder_days integer[] default '{30,14,7,1}',
  status text default 'upcoming', -- 'upcoming', 'action_needed', 'completed', 'overdue'
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================================
-- AI CHAT HISTORY
-- Conversation logs with the AI Navigator
-- ============================================================
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  title text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb, -- citations from knowledge base
  created_at timestamptz default now() not null
);

-- ============================================================
-- KNOWLEDGE BASE EMBEDDINGS (RAG)
-- pgvector table for AI retrieval
-- ============================================================
create table public.knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null, -- 'lanterman_act', 'idea', 'ssi_rules', 'rc_pos_standards', etc.
  section text,
  metadata jsonb,
  embedding extensions.vector(1536), -- OpenAI text-embedding-3 dimensions
  created_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_families_user_id on public.families(user_id);
create index idx_children_family_id on public.children(family_id);
create index idx_diagnoses_child_id on public.diagnoses(child_id);
create index idx_providers_family_id on public.providers(family_id);
create index idx_services_child_id on public.services(child_id);
create index idx_services_family_id on public.services(family_id);
create index idx_documents_family_id on public.documents(family_id);
create index idx_documents_child_id on public.documents(child_id);
create index idx_expenses_family_id on public.expenses(family_id);
create index idx_expenses_date on public.expenses(expense_date);
create index idx_appointments_family_id on public.appointments(family_id);
create index idx_appointments_start on public.appointments(start_time);
create index idx_deadlines_family_id on public.deadlines(family_id);
create index idx_deadlines_due_date on public.deadlines(due_date);
create index idx_chat_sessions_family_id on public.chat_sessions(family_id);
create index idx_chat_messages_session_id on public.chat_messages(session_id);

-- Vector similarity search index (IVFFlat for performance at scale)
create index idx_knowledge_embedding on public.knowledge_embeddings
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on row changes
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.families
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.children
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.providers
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.services
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.appointments
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.chat_sessions
  for each row execute function public.handle_updated_at();
