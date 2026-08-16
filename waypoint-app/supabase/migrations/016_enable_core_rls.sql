-- 016: EMERGENCY — enable RLS on the 12 core tables (roadmap Wave 0 follow-up)
--
-- Live verification (Aug 16) showed migration 002 never fully applied:
-- families, children, diagnoses, providers, services, documents, expenses,
-- appointments, deadlines, chat_sessions, chat_messages and
-- knowledge_embeddings had ROW LEVEL SECURITY DISABLED in production.
-- This replays 002 (RLS enables + all policies) and 007's policies
-- idempotently. Safe to run repeatedly against any state.

-- ═══ Replay of 002_row_level_security.sql (idempotent) ═══

-- Migration 002: Enable Row-Level Security (RLS) on all user-facing tables
-- Ensures users can only access their own family's data
-- Date: 2026-03-13

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────

alter table families enable row level security;
alter table children enable row level security;
alter table diagnoses enable row level security;
alter table providers enable row level security;
alter table services enable row level security;
alter table documents enable row level security;
alter table expenses enable row level security;
alter table appointments enable row level security;
alter table deadlines enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- ─── Families: users can only access their own family record ──────────────────

drop policy if exists "Users can view own family" on families;
create policy "Users can view own family" on families for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own family" on families;
create policy "Users can insert own family" on families for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own family" on families;
create policy "Users can update own family" on families for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Children: access via family ownership ────────────────────────────────────

drop policy if exists "Users can view own children" on children;
create policy "Users can view own children" on children for select
  using (family_id in (select id from families where user_id = auth.uid()));

drop policy if exists "Users can insert own children" on children;
create policy "Users can insert own children" on children for insert
  with check (family_id in (select id from families where user_id = auth.uid()));

drop policy if exists "Users can update own children" on children;
create policy "Users can update own children" on children for update
  using (family_id in (select id from families where user_id = auth.uid()));

drop policy if exists "Users can delete own children" on children;
create policy "Users can delete own children" on children for delete
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Diagnoses: access via child → family ownership ──────────────────────────

drop policy if exists "Users can view own diagnoses" on diagnoses;
create policy "Users can view own diagnoses" on diagnoses for select
  using (child_id in (
    select id from children where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

drop policy if exists "Users can insert own diagnoses" on diagnoses;
create policy "Users can insert own diagnoses" on diagnoses for insert
  with check (child_id in (
    select id from children where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

drop policy if exists "Users can delete own diagnoses" on diagnoses;
create policy "Users can delete own diagnoses" on diagnoses for delete
  using (child_id in (
    select id from children where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

-- ─── Providers: access via family ownership ───────────────────────────────────

drop policy if exists "Users can manage own providers" on providers;
create policy "Users can manage own providers" on providers for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Services: access via family ownership ────────────────────────────────────

drop policy if exists "Users can manage own services" on services;
create policy "Users can manage own services" on services for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Documents: access via family ownership ───────────────────────────────────

drop policy if exists "Users can manage own documents" on documents;
create policy "Users can manage own documents" on documents for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Expenses: access via family ownership ────────────────────────────────────

drop policy if exists "Users can manage own expenses" on expenses;
create policy "Users can manage own expenses" on expenses for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Appointments: access via family ownership ────────────────────────────────

drop policy if exists "Users can manage own appointments" on appointments;
create policy "Users can manage own appointments" on appointments for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Deadlines: access via family ownership ───────────────────────────────────

drop policy if exists "Users can manage own deadlines" on deadlines;
create policy "Users can manage own deadlines" on deadlines for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Chat Sessions: access via family ownership ──────────────────────────────

drop policy if exists "Users can manage own chat sessions" on chat_sessions;
create policy "Users can manage own chat sessions" on chat_sessions for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Chat Messages: access via session → family ownership ────────────────────

drop policy if exists "Users can view own chat messages" on chat_messages;
create policy "Users can view own chat messages" on chat_messages for select
  using (session_id in (
    select id from chat_sessions where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

drop policy if exists "Users can insert own chat messages" on chat_messages;
create policy "Users can insert own chat messages" on chat_messages for insert
  with check (session_id in (
    select id from chat_sessions where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

-- ─── Knowledge Embeddings: read-only for all authenticated users ─────────────
-- KB articles are shared content, not user-specific

alter table knowledge_embeddings enable row level security;

drop policy if exists "Authenticated users can read knowledge base" on knowledge_embeddings;
create policy "Authenticated users can read knowledge base" on knowledge_embeddings for select
  using (auth.role() = 'authenticated');


-- ═══ Replay of 007_family_sharing.sql (idempotent) ═══

-- Phase 6: Co-Parent Coordination schema
-- Multi-user family access with roles, invitations, and activity logging

-- ─── Family Members (multi-user access) ─────────────────────────────────────
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member', -- 'admin', 'member', 'viewer'
  display_name text not null,
  joined_at timestamptz default now() not null,
  unique (family_id, user_id)
);

-- ─── Invitations ────────────────────────────────────────────────────────────
create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  inviter_id uuid references auth.users(id) on delete cascade not null,
  invitee_email text not null,
  role text not null default 'member',
  status text not null default 'pending', -- 'pending', 'accepted', 'declined'
  token text not null default gen_random_uuid()::text,
  created_at timestamptz default now() not null,
  responded_at timestamptz
);

-- ─── Activity Log ───────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  user_display_name text not null,
  action_type text not null, -- 'created_action', 'completed_action', 'added_appointment', 'uploaded_document', 'sent_message', etc.
  entity_type text, -- 'action', 'appointment', 'document', 'expense', etc.
  entity_id uuid,
  description text not null,
  created_at timestamptz default now() not null
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_family_members_family on public.family_members(family_id);
create index if not exists idx_family_members_user on public.family_members(user_id);
create index if not exists idx_invitations_family on public.family_invitations(family_id);
create index if not exists idx_invitations_email on public.family_invitations(invitee_email);
create index if not exists idx_invitations_token on public.family_invitations(token);
create index if not exists idx_activity_log_family on public.activity_log(family_id);
create index if not exists idx_activity_log_created on public.activity_log(created_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.activity_log enable row level security;

-- Family members: access own family memberships
drop policy if exists "Users can see own family memberships" on family_members;
create policy "Users can see own family memberships" on family_members for select
  using (user_id = auth.uid() or family_id in (select family_id from family_members where user_id = auth.uid()));
drop policy if exists "Admins can manage family members" on family_members;
create policy "Admins can manage family members" on family_members for all
  using (family_id in (select family_id from family_members where user_id = auth.uid() and role = 'admin'));

-- Invitations: inviters can manage, invitees can view/respond
drop policy if exists "Family admins can manage invitations" on family_invitations;
create policy "Family admins can manage invitations" on family_invitations for all
  using (family_id in (select family_id from family_members where user_id = auth.uid() and role = 'admin'));

-- Activity log: family members can read
drop policy if exists "Family members can read activity" on activity_log;
create policy "Family members can read activity" on activity_log for select
  using (family_id in (select family_id from family_members where user_id = auth.uid()));
drop policy if exists "Family members can write activity" on activity_log;
create policy "Family members can write activity" on activity_log for insert
  with check (family_id in (select family_id from family_members where user_id = auth.uid()));
