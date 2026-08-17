-- 018: Thumbs feedback on AI Navigator answers (chat parity wave)
--
-- One row per rating tap. message_id is the client-side message id (not a
-- FK — messages persist in chat_messages but streaming ids are ephemeral),
-- content_preview keeps the first part of the rated answer so feedback is
-- reviewable even if the session is deleted.

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  message_id text,
  rating text not null check (rating in ('up', 'down')),
  content_preview text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_feedback_user on public.ai_feedback(user_id, created_at desc);

alter table public.ai_feedback enable row level security;

drop policy if exists "Users insert own feedback" on public.ai_feedback;
create policy "Users insert own feedback"
  on public.ai_feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users read own feedback" on public.ai_feedback;
create policy "Users read own feedback"
  on public.ai_feedback for select
  using (auth.uid() = user_id);

-- Ratings are immutable: no update/delete policies on purpose.
