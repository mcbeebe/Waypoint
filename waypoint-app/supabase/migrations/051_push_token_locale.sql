-- 051: carry the device's language on its push token (phase 7, Lane B).
--
-- The server-side reply sender writes the notification copy, but the app's
-- language is a client-only setting — there is no families.locale column. So
-- the device records the language IT is using when it registers, and the
-- sender picks en/es/vi copy per token. A family reading the app in Spanish
-- gets a Spanish push.
--
-- Additive over 050 (already applied). The register RPC gains a third argument
-- with a default, so an older client that still calls it with two arguments
-- keeps working (PostgREST fills the default) — no client/DB lockstep needed.
--
-- Apply by hand in the Supabase SQL editor, after 050. Idempotent.

alter table public.push_tokens
  add column if not exists locale text;

comment on column public.push_tokens.locale is
  'The app language this device registered under (en/es/vi) — the reply sender picks push copy from it (phase 7 Lane B).';

-- Replace the 050 two-arg function with a three-arg version. Drop first: you
-- cannot change a function''s argument list with CREATE OR REPLACE.
drop function if exists public.register_push_token(text, text);

create or replace function public.register_push_token(
  p_token text,
  p_platform text,
  p_locale text default 'en'
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
  insert into public.push_tokens (family_id, expo_token, platform, user_id, locale)
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
    end
  );
end;
$$;
