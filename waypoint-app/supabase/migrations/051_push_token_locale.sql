-- 051: carry the device's language AND its background-sync consent on its push
-- token (phase 7, Lane B).
--
-- Two token-scoped signals the server needs but the app keeps client-side:
--
-- 1. locale — the server-side reply sender writes the notification copy, but the
--    app's language is a client-only setting (no families.locale column). The
--    device records the language it is using when it registers, and the sender
--    picks en/es/vi copy per token. A family reading in Spanish gets a Spanish
--    push.
--
-- 2. server_sync — a SEPARATE, explicit consent for Waypoint's servers to read
--    the connected Gmail account for new replies WHILE THE APP IS CLOSED. Off by
--    default. Wanting push notifications is not the same as consenting to a
--    background server-side mailbox read of a disabled child's agency
--    correspondence, so the cron only background-syncs families whose token
--    carries this. (Reply pushes still fire for replies synced while the app was
--    open; only the background read is gated.) Owner decision, Aug 30 2026 (#1/B).
--
-- Additive over 050 (already applied). The register RPC gains two arguments with
-- defaults, so an older client that still calls it with two args keeps working
-- (PostgREST fills the defaults) — no client/DB lockstep needed.
--
-- Apply by hand in the Supabase SQL editor, after 050. Idempotent.

alter table public.push_tokens
  add column if not exists locale text,
  add column if not exists server_sync boolean not null default false;

comment on column public.push_tokens.locale is
  'The app language this device registered under (en/es/vi) — the reply sender picks push copy from it (phase 7 Lane B).';
comment on column public.push_tokens.server_sync is
  'Explicit consent for app-closed server-side Gmail sync of this family (phase 7 Lane B). Off by default; distinct from wanting push.';

-- Replace the 050 two-arg function. Drop first: you cannot change a function''s
-- argument list with CREATE OR REPLACE.
drop function if exists public.register_push_token(text, text);

create or replace function public.register_push_token(
  p_token text,
  p_platform text,
  p_locale text default 'en',
  p_server_sync boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam uuid;
begin
  select id into fam from public.families where user_id = auth.uid() limit 1;
  if fam is null then
    return; -- no owned family (e.g. a co-parent) — nothing to register
  end if;
  -- One family per device: drop any prior owner of this exact token first.
  delete from public.push_tokens where expo_token = p_token;
  insert into public.push_tokens (family_id, expo_token, platform, user_id, locale, server_sync)
  values (
    fam,
    p_token,
    case when p_platform in ('ios', 'android', 'web') then p_platform else null end,
    auth.uid(),
    -- Normalize to the three languages the app speaks; anything else → en.
    case
      when p_locale like 'es%' then 'es'
      when p_locale like 'vi%' then 'vi'
      else 'en'
    end,
    coalesce(p_server_sync, false)
  );
end;
$$;
