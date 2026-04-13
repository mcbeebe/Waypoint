-- Phase 5: Community Forum schema
-- Categories, threads, posts, reactions, reports, and direct messages

-- ─── Forum Categories ───────────────────────────────────────────────────────
create table public.forum_categories (
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
create table public.forum_threads (
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
create table public.forum_posts (
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
create table public.forum_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  reaction text not null, -- '👍', '👏', '❤️'
  created_at timestamptz default now() not null,
  unique (post_id, user_id, reaction)
);

-- ─── Reports ────────────────────────────────────────────────────────────────
create table public.forum_reports (
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
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

-- ─── User Blocks ────────────────────────────────────────────────────────────
create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references auth.users(id) on delete cascade not null,
  blocked_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (blocker_id, blocked_id)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index idx_threads_category on public.forum_threads(category_id);
create index idx_threads_author on public.forum_threads(author_id);
create index idx_threads_last_post on public.forum_threads(last_post_at desc);
create index idx_posts_thread on public.forum_posts(thread_id);
create index idx_posts_author on public.forum_posts(author_id);
create index idx_reactions_post on public.forum_reactions(post_id);
create index idx_reports_status on public.forum_reports(status) where status = 'pending';
create index idx_dm_recipient on public.direct_messages(recipient_id, is_read);
create index idx_dm_conversation on public.direct_messages(sender_id, recipient_id);

-- ─── RLS Policies ───────────────────────────────────────────────────────────
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_reactions enable row level security;
alter table public.forum_reports enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_blocks enable row level security;

-- Categories: anyone can read
create policy "Anyone can read categories" on forum_categories for select using (true);

-- Threads: anyone can read non-hidden, authors can manage own
create policy "Anyone can read visible threads" on forum_threads for select using (is_hidden = false);
create policy "Auth users can create threads" on forum_threads for insert with check (auth.uid() = author_id);
create policy "Authors can update own threads" on forum_threads for update using (auth.uid() = author_id);

-- Posts: anyone can read non-hidden, authors can manage own
create policy "Anyone can read visible posts" on forum_posts for select using (is_hidden = false);
create policy "Auth users can create posts" on forum_posts for insert with check (auth.uid() = author_id);
create policy "Authors can update own posts" on forum_posts for update using (auth.uid() = author_id);

-- Reactions: users manage own
create policy "Anyone can read reactions" on forum_reactions for select using (true);
create policy "Users can add reactions" on forum_reactions for insert with check (auth.uid() = user_id);
create policy "Users can remove own reactions" on forum_reactions for delete using (auth.uid() = user_id);

-- Reports: users can create, only see own
create policy "Users can report content" on forum_reports for insert with check (auth.uid() = reporter_id);
create policy "Users can see own reports" on forum_reports for select using (auth.uid() = reporter_id);

-- DMs: participants only
create policy "Users can read own DMs" on direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send DMs" on direct_messages for insert
  with check (auth.uid() = sender_id);
create policy "Recipients can mark read" on direct_messages for update
  using (auth.uid() = recipient_id);

-- Blocks: users manage own
create policy "Users can manage blocks" on user_blocks for all
  using (auth.uid() = blocker_id);

-- ─── Triggers ───────────────────────────────────────────────────────────────
create trigger set_forum_threads_updated_at before update on public.forum_threads
  for each row execute function public.set_updated_at();

create trigger set_forum_posts_updated_at before update on public.forum_posts
  for each row execute function public.set_updated_at();

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
