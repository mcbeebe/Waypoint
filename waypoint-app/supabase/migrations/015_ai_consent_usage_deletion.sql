-- 015: AI consent, usage metering, and account deletion (roadmap Wave 1)

-- ─── AI consent ─────────────────────────────────────────────────────────────
-- Set when the family affirmatively consents to AI features (data sent to
-- Anthropic). Null = not consented (or withdrawn). Enforced server-side in
-- the ai-proxy edge function.
alter table public.families add column ai_consent_at timestamptz;

-- ─── AI usage metering ──────────────────────────────────────────────────────
-- Per-user daily request counter; the ai-proxy enforces a hard ceiling so a
-- free signup can't run an unmetered relay on the Anthropic key.
create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "Users can view their own AI usage" on public.ai_usage;
create policy "Users can view their own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);
-- No insert/update policies: writes happen only via the service role.

-- Atomic increment used by the edge function; returns the new count.
create or replace function public.increment_ai_usage(p_user uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage (user_id, day, requests)
  values (p_user, current_date, 1)
  on conflict (user_id, day)
  do update set requests = ai_usage.requests + 1
  returning requests;
$$;

revoke all on function public.increment_ai_usage(uuid) from public, anon, authenticated;

-- ─── Account deletion ───────────────────────────────────────────────────────
-- The families DELETE policy was missing entirely, so client deletes matched
-- zero rows and silently "succeeded". Deletion itself is performed by the
-- delete-account edge function (auth.admin.deleteUser cascades through
-- families -> everything), but the policy belongs here for completeness.
drop policy if exists "Users can delete their own family" on public.families;
create policy "Users can delete their own family"
  on public.families for delete
  using (auth.uid() = user_id);
