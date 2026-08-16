-- 014: Repair migrations 006 / 008 / 010 (roadmap Wave 0.2)
--
-- Those three migrations called public.set_updated_at(), a function that was
-- never defined (001 defines handle_updated_at). Each file runs in one
-- transaction, so on any environment where they were applied via `db push`
-- they rolled back ENTIRELY — including every `enable row level security`
-- and every policy. This migration replays their full contents idempotently
-- (create if not exists / drop-then-create for triggers and policies) with
-- the correct function name, so a single `db push` converges any state:
-- fully missing, partially applied, or already healthy.

-- ═══ Replay of 006_forum_schema.sql (idempotent) ═══

-- Phase 5: Community Forum schema
-- Categories, threads, posts, reactions, reports, and direct messages

-- ─── Forum Categories ───────────────────────────────────────────────────────
create table if not exists public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  emoji text default '💬',
  sort_order integer default 0,
  is_diagnosis_specific boolean default false,
  thread_count integer default 0,
  created_at timestamptz default now() not null
);

-- ─── Forum Threads ──────────────────────────────────────────────────────────
create table if not exists public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.forum_categories(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  author_display_name text not null,
  title text not null,
  body text not null,
  tags text[] default '{}',
  is_pinned boolean default false,
  is_locked boolean default false,
  is_hidden boolean default false,
  post_count integer default 0,
  last_post_at timestamptz default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Forum Posts (replies) ──────────────────────────────────────────────────
create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.forum_threads(id) on delete cascade not null,
  parent_post_id uuid references public.forum_posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade not null,
  author_display_name text not null,
  body text not null,
  is_hidden boolean default false,
  reaction_count integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Reactions ──────────────────────────────────────────────────────────────
create table if not exists public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  reaction text not null, -- '👍', '👏', '❤️'
  created_at timestamptz default now() not null,
  unique (post_id, user_id, reaction)
);

-- ─── Reports ────────────────────────────────────────────────────────────────
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade not null,
  thread_id uuid references public.forum_threads(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  reason text not null,
  status text default 'pending', -- 'pending', 'reviewed', 'actioned', 'dismissed'
  moderator_notes text,
  created_at timestamptz default now() not null,
  resolved_at timestamptz
);

-- ─── Direct Messages ────────────────────────────────────────────────────────
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- ─── User Blocks ────────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references auth.users(id) on delete cascade not null,
  blocked_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (blocker_id, blocked_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_threads_category on public.forum_threads(category_id);
create index if not exists idx_threads_author on public.forum_threads(author_id);
create index if not exists idx_threads_last_post on public.forum_threads(last_post_at desc);
create index if not exists idx_posts_thread on public.forum_posts(thread_id);
create index if not exists idx_posts_author on public.forum_posts(author_id);
create index if not exists idx_reactions_post on public.forum_reactions(post_id);
create index if not exists idx_reports_status on public.forum_reports(status) where status = 'pending';
create index if not exists idx_dm_recipient on public.direct_messages(recipient_id, is_read);
create index if not exists idx_dm_conversation on public.direct_messages(sender_id, recipient_id);

-- ─── RLS Policies ───────────────────────────────────────────────────────────
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reactions enable row level security;
alter table public.forum_reports enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_blocks enable row level security;

-- Categories: anyone can read
drop policy if exists "Anyone can read categories" on forum_categories;
create policy "Anyone can read categories" on forum_categories for select using (true);

-- Threads: anyone can read non-hidden, authors can manage own
drop policy if exists "Anyone can read visible threads" on forum_threads;
create policy "Anyone can read visible threads" on forum_threads for select using (is_hidden = false);
drop policy if exists "Auth users can create threads" on forum_threads;
create policy "Auth users can create threads" on forum_threads for insert with check (auth.uid() = author_id);
drop policy if exists "Authors can update own threads" on forum_threads;
create policy "Authors can update own threads" on forum_threads for update using (auth.uid() = author_id);

-- Posts: anyone can read non-hidden, authors can manage own
drop policy if exists "Anyone can read visible posts" on forum_posts;
create policy "Anyone can read visible posts" on forum_posts for select using (is_hidden = false);
drop policy if exists "Auth users can create posts" on forum_posts;
create policy "Auth users can create posts" on forum_posts for insert with check (auth.uid() = author_id);
drop policy if exists "Authors can update own posts" on forum_posts;
create policy "Authors can update own posts" on forum_posts for update using (auth.uid() = author_id);

-- Reactions: users manage own
drop policy if exists "Anyone can read reactions" on forum_reactions;
create policy "Anyone can read reactions" on forum_reactions for select using (true);
drop policy if exists "Users can add reactions" on forum_reactions;
create policy "Users can add reactions" on forum_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove own reactions" on forum_reactions;
create policy "Users can remove own reactions" on forum_reactions for delete using (auth.uid() = user_id);

-- Reports: users can create, only see own
drop policy if exists "Users can report content" on forum_reports;
create policy "Users can report content" on forum_reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "Users can see own reports" on forum_reports;
create policy "Users can see own reports" on forum_reports for select using (auth.uid() = reporter_id);

-- DMs: participants only
drop policy if exists "Users can read own DMs" on direct_messages;
create policy "Users can read own DMs" on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Users can send DMs" on direct_messages;
create policy "Users can send DMs" on direct_messages for insert
  with check (auth.uid() = sender_id);
drop policy if exists "Recipients can mark read" on direct_messages;
create policy "Recipients can mark read" on direct_messages for update
  using (auth.uid() = recipient_id);

-- Blocks: users manage own
drop policy if exists "Users can manage blocks" on user_blocks;
create policy "Users can manage blocks" on user_blocks for all
  using (auth.uid() = blocker_id);

-- ─── Triggers ───────────────────────────────────────────────────────────────
drop trigger if exists set_forum_threads_updated_at on public.forum_threads;
create trigger set_forum_threads_updated_at before update on public.forum_threads
  for each row execute function public.handle_updated_at();

drop trigger if exists set_forum_posts_updated_at on public.forum_posts;
create trigger set_forum_posts_updated_at before update on public.forum_posts
  for each row execute function public.handle_updated_at();

-- ─── Seed default categories ────────────────────────────────────────────────
insert into public.forum_categories (name, description, emoji, sort_order, is_diagnosis_specific) values
  ('General Discussion', 'Open forum for all families', '💬', 1, false),
  ('Regional Centers', 'Questions about RC services and IPPs', '🏛️', 2, false),
  ('IEP & School', 'IEP meetings, school services, advocacy', '🏫', 3, false),
  ('Insurance & Benefits', 'Medi-Cal, CCS, SSI, insurance issues', '🏥', 4, false),
  ('Autism Spectrum', 'Families navigating ASD services', '🧩', 5, true),
  ('Down Syndrome', 'Support for DS families', '💛', 6, true),
  ('Cerebral Palsy', 'CP-specific resources and discussion', '💪', 7, true),
  ('Wins & Milestones', 'Celebrate your advocacy wins!', '🎉', 8, false),
  ('Resources & Tips', 'Share useful resources and strategies', '📚', 9, false);


-- ═══ Replay of 008_provider_portal.sql (idempotent) ═══

-- Phase 7: Provider Portal (B2B) schema
-- Provider profiles, family connections, messaging, and document access logging

-- ─── Provider Profiles ──────────────────────────────────────────────────────
create table if not exists public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  provider_type text not null,
  specialty text,
  organization text,
  npi_number text,
  credentials text,
  phone text,
  email text,
  address text,
  bio text,
  is_verified boolean default false,
  is_accepting_patients boolean default true,
  insurance_accepted text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Provider-Family Connections ────────────────────────────────────────────
create table if not exists public.provider_family_connections (
  id uuid primary key default gen_random_uuid(),
  provider_profile_id uuid references public.provider_profiles(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  status text not null default 'pending', -- 'pending', 'approved', 'declined', 'revoked'
  requested_by text not null, -- 'provider' or 'family'
  created_at timestamptz default now() not null,
  responded_at timestamptz,
  unique (provider_profile_id, family_id)
);

-- ─── Provider-Family Messages ───────────────────────────────────────────────
create table if not exists public.provider_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.provider_family_connections(id) on delete cascade not null,
  sender_type text not null, -- 'provider' or 'family'
  sender_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- ─── Document Access Log (audit trail) ──────────────────────────────────────
create table if not exists public.document_access_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  provider_profile_id uuid references public.provider_profiles(id) on delete cascade not null,
  accessed_at timestamptz default now() not null
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_provider_profiles_type on public.provider_profiles(provider_type);
create index if not exists idx_provider_profiles_org on public.provider_profiles(organization);
create index if not exists idx_provider_connections_provider on public.provider_family_connections(provider_profile_id);
create index if not exists idx_provider_connections_family on public.provider_family_connections(family_id);
create index if not exists idx_provider_messages_connection on public.provider_messages(connection_id);
create index if not exists idx_doc_access_doc on public.document_access_logs(document_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.provider_profiles enable row level security;
alter table public.provider_family_connections enable row level security;
alter table public.provider_messages enable row level security;
alter table public.document_access_logs enable row level security;

-- Provider profiles: owners manage own, anyone can read for directory
drop policy if exists "Providers manage own profile" on provider_profiles;
create policy "Providers manage own profile" on provider_profiles for all
  using (user_id = auth.uid());
drop policy if exists "Anyone can read provider profiles" on provider_profiles;
create policy "Anyone can read provider profiles" on provider_profiles for select using (true);

-- Connections: both parties can see
drop policy if exists "Connection participants can view" on provider_family_connections;
create policy "Connection participants can view" on provider_family_connections for select
  using (
    provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
    or family_id in (select id from families where user_id = auth.uid())
  );
drop policy if exists "Either party can create connection" on provider_family_connections;
create policy "Either party can create connection" on provider_family_connections for insert
  with check (
    provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
    or family_id in (select id from families where user_id = auth.uid())
  );
drop policy if exists "Either party can update connection" on provider_family_connections;
create policy "Either party can update connection" on provider_family_connections for update
  using (
    provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
    or family_id in (select id from families where user_id = auth.uid())
  );

-- Messages: connection participants only
drop policy if exists "Connection participants can read messages" on provider_messages;
create policy "Connection participants can read messages" on provider_messages for select
  using (connection_id in (
    select id from provider_family_connections where
      provider_profile_id in (select id from provider_profiles where user_id = auth.uid())
      or family_id in (select id from families where user_id = auth.uid())
  ));
drop policy if exists "Connection participants can send messages" on provider_messages;
create policy "Connection participants can send messages" on provider_messages for insert
  with check (sender_id = auth.uid());

-- Document access logs: providers and document owners
drop policy if exists "Providers can log access" on document_access_logs;
create policy "Providers can log access" on document_access_logs for insert
  with check (provider_profile_id in (select id from provider_profiles where user_id = auth.uid()));
drop policy if exists "Document owners can view access logs" on document_access_logs;
create policy "Document owners can view access logs" on document_access_logs for select
  using (document_id in (select id from documents where family_id in (select id from families where user_id = auth.uid())));

-- ─── Triggers ───────────────────────────────────────────────────────────────
drop trigger if exists set_provider_profiles_updated_at on public.provider_profiles;
create trigger set_provider_profiles_updated_at before update on public.provider_profiles
  for each row execute function public.handle_updated_at();


-- ═══ Replay of 010_resources_blog.sql (idempotent) ═══

-- Phase 10: Resources, Guides & Blog schema

-- ─── Resources / Guides ─────────────────────────────────────────────────────
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null, -- 'getting_started', 'regional_center', 'iep', 'insurance', 'legal', 'transitions'
  tags text[] default '{}',
  difficulty_level text default 'beginner', -- 'beginner', 'intermediate', 'advanced'
  estimated_read_time integer default 5, -- minutes
  related_kb_ids text[] default '{}',
  is_published boolean default true,
  published_at timestamptz default now(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Blog Posts ─────────────────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  body text not null,
  author text not null default 'Waypoint Team',
  category text not null, -- 'advocacy', 'news', 'guides', 'stories', 'updates'
  tags text[] default '{}',
  featured_image_url text,
  is_featured boolean default false,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_resources_category on public.resources(category);
create index if not exists idx_resources_published on public.resources(is_published, published_at desc);
create index if not exists idx_blog_category on public.blog_posts(category);
create index if not exists idx_blog_published on public.blog_posts(is_published, published_at desc);
create index if not exists idx_blog_featured on public.blog_posts(is_featured) where is_featured = true;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.resources enable row level security;
alter table public.blog_posts enable row level security;

-- All authenticated users can read published content
drop policy if exists "Anyone can read published resources" on resources;
create policy "Anyone can read published resources" on resources for select
  using (is_published = true);
drop policy if exists "Anyone can read published blog posts" on blog_posts;
create policy "Anyone can read published blog posts" on blog_posts for select
  using (is_published = true);

-- ─── Triggers ───────────────────────────────────────────────────────────────
drop trigger if exists set_resources_updated_at on public.resources;
create trigger set_resources_updated_at before update on public.resources
  for each row execute function public.handle_updated_at();
drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.handle_updated_at();
