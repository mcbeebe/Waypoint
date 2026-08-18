-- 022: Communication log (roadmap 3.3) — the family's paper trail
--
-- Letters generated in the app auto-log here; parents add calls, meetings,
-- and notes by hand. In disputes, the parent with the better record wins —
-- this is that record.

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,

  kind text not null check (kind in ('letter', 'email', 'call', 'meeting', 'note')),
  direction text not null default 'outgoing' check (direction in ('outgoing', 'incoming')),

  -- Who and about what
  contact text,        -- person: "Maria Lopez (Service Coordinator)"
  organization text,   -- 'regional_center' | 'school' | 'insurance' | 'medical' | 'other'
  subject text not null,
  body text,           -- letter text, call notes, meeting summary

  -- Provenance for auto-logged letters
  template_key text,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_communications_family
  on public.communications(family_id, occurred_at desc);

alter table public.communications enable row level security;

drop policy if exists "Users manage own communications" on public.communications;
create policy "Users manage own communications"
  on public.communications for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

drop trigger if exists set_communications_updated_at on public.communications;
create trigger set_communications_updated_at
  before update on public.communications
  for each row execute function public.handle_updated_at();
