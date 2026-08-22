-- 034: Action notes — the running log on a single action item
--
-- Parents work an action over days or weeks: "left a voicemail Tue",
-- "SC said to email instead", "packet mailed 3/14". Status alone can't
-- carry that. This gives each action a timestamped comment thread the
-- parent writes themselves, so the detail screen becomes a record of
-- what actually happened rather than just what was suggested.

create table if not exists public.action_notes (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,

  body text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_action_notes_action
  on public.action_notes(action_id, created_at);

alter table public.action_notes enable row level security;

drop policy if exists "Users manage own action notes" on public.action_notes;
create policy "Users manage own action notes"
  on public.action_notes for all
  using (family_id in (select id from public.families where user_id = auth.uid()))
  with check (family_id in (select id from public.families where user_id = auth.uid()));

drop trigger if exists set_action_notes_updated_at on public.action_notes;
create trigger set_action_notes_updated_at
  before update on public.action_notes
  for each row execute function public.handle_updated_at();
