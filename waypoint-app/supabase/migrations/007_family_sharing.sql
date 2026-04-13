-- Phase 6: Co-Parent Coordination schema
-- Multi-user family access with roles, invitations, and activity logging

-- ─── Family Members (multi-user access) ─────────────────────────────────────
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'member', -- 'admin', 'member', 'viewer'
  display_name text not null,
  joined_at timestamptz default now() not null,
  unique (family_id, user_id)
);

-- ─── Invitations ────────────────────────────────────────────────────────────
create table public.family_invitations (
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
create table public.activity_log (
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
create index idx_family_members_family on public.family_members(family_id);
create index idx_family_members_user on public.family_members(user_id);
create index idx_invitations_family on public.family_invitations(family_id);
create index idx_invitations_email on public.family_invitations(invitee_email);
create index idx_invitations_token on public.family_invitations(token);
create index idx_activity_log_family on public.activity_log(family_id);
create index idx_activity_log_created on public.activity_log(created_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.family_members enable row level security;
alter table public.family_invitations enable row level security;
alter table public.activity_log enable row level security;

-- Family members: access own family memberships
create policy "Users can see own family memberships" on family_members for select
  using (user_id = auth.uid() or family_id in (select family_id from family_members where user_id = auth.uid()));
create policy "Admins can manage family members" on family_members for all
  using (family_id in (select family_id from family_members where user_id = auth.uid() and role = 'admin'));

-- Invitations: inviters can manage, invitees can view/respond
create policy "Family admins can manage invitations" on family_invitations for all
  using (family_id in (select family_id from family_members where user_id = auth.uid() and role = 'admin'));

-- Activity log: family members can read
create policy "Family members can read activity" on activity_log for select
  using (family_id in (select family_id from family_members where user_id = auth.uid()));
create policy "Family members can write activity" on activity_log for insert
  with check (family_id in (select family_id from family_members where user_id = auth.uid()));
