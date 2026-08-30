-- 050: Push tokens + reply-notification dedupe (phase 7, Lane B — the outbound
-- loop's server-initiated reply push; initiative 003).
--
-- Two additions, both for "you have a reply" pushes that fire while the app is
-- CLOSED — which the on-device Lane A cannot do:
--
-- 1. push_tokens — the Expo push token(s) a family's devices have registered.
--    One row per (family, token). The server-side sender reads these to know
--    where to deliver. Owner-scoped RLS, matching every other core table
--    (children/diagnoses/communications all use families-by-user_id): this
--    deliberately does NOT depend on 049's member_family_ids(), so applying 050
--    never requires 049 first, and there is no family_members recursion here.
--
-- 2. communications.notified_at — stamped when a reply push has been sent, so
--    the cron sender fires EXACTLY ONCE per incoming reply. Without it, every
--    poll would re-notify every still-unanswered reply.
--
-- Additive and idempotent; safe to re-run. Apply by hand in the Supabase SQL
-- editor, in order. This is a schema/RLS change: no CI covers it.

-- ── 1. push_tokens ───────────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  -- The Expo push token (ExponentPushToken[...]). Unique so re-registering the
  -- same device updates one row instead of piling up duplicates.
  expo_token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  -- Which signed-in user's device this is, so a revoked co-parent's token can
  -- be pruned without touching the owner's.
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expo_token)
);

create index if not exists push_tokens_family_idx
  on public.push_tokens (family_id);

comment on table public.push_tokens is
  'Expo push tokens per family device — read by the server-side reply-push sender (phase 7 Lane B).';

alter table public.push_tokens enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'push_tokens'
       and policyname = 'Families manage own push tokens'
  ) then
    create policy "Families manage own push tokens" on public.push_tokens for all
      using (family_id in (select id from public.families where user_id = auth.uid()))
      with check (family_id in (select id from public.families where user_id = auth.uid()));
  end if;
end
$$;

-- Keep updated_at fresh on re-registration (reuses the shared trigger fn 001).
drop trigger if exists set_updated_at on public.push_tokens;
create trigger set_updated_at before update on public.push_tokens
  for each row execute function public.handle_updated_at();

-- ── 2. communications.notified_at ────────────────────────────────────────────
alter table public.communications
  add column if not exists notified_at timestamptz;

comment on column public.communications.notified_at is
  'When a reply push was sent for this incoming message — fire exactly once (phase 7 Lane B).';

-- Partial index the cron sender scans: unnotified incoming replies only.
create index if not exists communications_unnotified_incoming_idx
  on public.communications (family_id)
  where direction = 'incoming' and notified_at is null;
