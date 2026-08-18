-- 024: Family memories — the AI's durable understanding of each family (P2)
--
-- After chat exchanges, a background extraction saves durable insights
-- (facts, preferences, in-progress situations, and gaps the family may not
-- see). The Navigator injects active memories into its system prompt so it
-- KNOWS the family instead of re-asking; the Home screen surfaces
-- gap-kind memories as proactive prompts. Parents see and delete every
-- memory in Profile — full user control.

create table if not exists public.family_memories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,

  kind text not null check (kind in ('fact', 'preference', 'situation', 'gap')),
  content text not null check (char_length(content) <= 300),
  source text not null default 'chat' check (source in ('chat', 'behavior', 'manual')),

  archived boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_family_memories_active
  on public.family_memories(family_id, archived, updated_at desc);

alter table public.family_memories enable row level security;

drop policy if exists "Users manage own memories" on public.family_memories;
create policy "Users manage own memories"
  on public.family_memories for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

drop trigger if exists set_family_memories_updated_at on public.family_memories;
create trigger set_family_memories_updated_at
  before update on public.family_memories
  for each row execute function public.handle_updated_at();
