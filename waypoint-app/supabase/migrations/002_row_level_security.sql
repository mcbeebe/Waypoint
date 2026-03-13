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

create policy "Users can view own family"
  on families for select
  using (auth.uid() = user_id);

create policy "Users can insert own family"
  on families for insert
  with check (auth.uid() = user_id);

create policy "Users can update own family"
  on families for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Children: access via family ownership ────────────────────────────────────

create policy "Users can view own children"
  on children for select
  using (family_id in (select id from families where user_id = auth.uid()));

create policy "Users can insert own children"
  on children for insert
  with check (family_id in (select id from families where user_id = auth.uid()));

create policy "Users can update own children"
  on children for update
  using (family_id in (select id from families where user_id = auth.uid()));

create policy "Users can delete own children"
  on children for delete
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Diagnoses: access via child → family ownership ──────────────────────────

create policy "Users can view own diagnoses"
  on diagnoses for select
  using (child_id in (
    select id from children where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

create policy "Users can insert own diagnoses"
  on diagnoses for insert
  with check (child_id in (
    select id from children where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

create policy "Users can delete own diagnoses"
  on diagnoses for delete
  using (child_id in (
    select id from children where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

-- ─── Providers: access via family ownership ───────────────────────────────────

create policy "Users can manage own providers"
  on providers for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Services: access via family ownership ────────────────────────────────────

create policy "Users can manage own services"
  on services for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Documents: access via family ownership ───────────────────────────────────

create policy "Users can manage own documents"
  on documents for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Expenses: access via family ownership ────────────────────────────────────

create policy "Users can manage own expenses"
  on expenses for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Appointments: access via family ownership ────────────────────────────────

create policy "Users can manage own appointments"
  on appointments for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Deadlines: access via family ownership ───────────────────────────────────

create policy "Users can manage own deadlines"
  on deadlines for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Chat Sessions: access via family ownership ──────────────────────────────

create policy "Users can manage own chat sessions"
  on chat_sessions for all
  using (family_id in (select id from families where user_id = auth.uid()));

-- ─── Chat Messages: access via session → family ownership ────────────────────

create policy "Users can view own chat messages"
  on chat_messages for select
  using (session_id in (
    select id from chat_sessions where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

create policy "Users can insert own chat messages"
  on chat_messages for insert
  with check (session_id in (
    select id from chat_sessions where family_id in (
      select id from families where user_id = auth.uid()
    )
  ));

-- ─── Knowledge Embeddings: read-only for all authenticated users ─────────────
-- KB articles are shared content, not user-specific

alter table knowledge_embeddings enable row level security;

create policy "Authenticated users can read knowledge base"
  on knowledge_embeddings for select
  using (auth.role() = 'authenticated');
