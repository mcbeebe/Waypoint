-- Phase 10: Resources, Guides & Blog schema

-- ─── Resources / Guides ─────────────────────────────────────────────────────
create table public.resources (
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
create table public.blog_posts (
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
create index idx_resources_category on public.resources(category);
create index idx_resources_published on public.resources(is_published, published_at desc);
create index idx_blog_category on public.blog_posts(category);
create index idx_blog_published on public.blog_posts(is_published, published_at desc);
create index idx_blog_featured on public.blog_posts(is_featured) where is_featured = true;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.resources enable row level security;
alter table public.blog_posts enable row level security;

-- All authenticated users can read published content
create policy "Anyone can read published resources" on resources for select
  using (is_published = true);
create policy "Anyone can read published blog posts" on blog_posts for select
  using (is_published = true);

-- ─── Triggers ───────────────────────────────────────────────────────────────
create trigger set_resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();
create trigger set_blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();
