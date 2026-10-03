-- 061_signup_notify.sql
--
-- Emails the owner when a new account is created. An AFTER INSERT trigger on
-- auth.users posts ONLY the new user's id to the notify-signup Edge Function
-- via pg_net; the function looks the user up itself and sends the email
-- through Resend.
--
-- A sign-up must never depend on this:
--   * pg_net is asynchronous — the HTTP call happens after the transaction
--     commits, so a slow or failing function cannot delay or roll back the
--     auth insert.
--   * The trigger function swallows every error (exception when others), so
--     even a missing pg_net or Vault cannot fail a sign-up.
--   * Missing config (no Vault secrets) → it does nothing.
--
-- Capped at 10 alerts per rolling hour. auth.users is written by the public
-- anon key (signUp), so a script could otherwise flood the owner's inbox and
-- burn the Resend quota family-invite shares. The 11th sign-up in an hour
-- sends one "alerts paused" notice; the rest send nothing until the hour rolls.
--
-- Reuses 052's two Vault secrets — `project_url` and `outbound_cron_secret` —
-- so if the reply poller is set up, this needs no new Vault entries. If not:
--   Dashboard → Project Settings → Vault:
--     project_url           = https://<project-ref>.supabase.co
--     outbound_cron_secret  = the same value as the OUTBOUND_CRON_SECRET
--                             Edge Function secret
-- Then set the Edge Function secrets SIGNUP_NOTIFY_TO (your email) and
-- RESEND_API_KEY (already set for family-invite).
--
-- Rollback: drop trigger on_auth_user_created_notify on auth.users;
--           drop function public.notify_signup();

create extension if not exists pg_net;

create or replace function public.notify_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
  recent int;
begin
  begin
    -- Includes this row: the trigger is AFTER INSERT.
    select count(*) into recent
      from auth.users where created_at > now() - interval '1 hour';
    if recent > 11 then
      return new;
    end if;
    select decrypted_secret into base_url
      from vault.decrypted_secrets where name = 'project_url' limit 1;
    select decrypted_secret into secret
      from vault.decrypted_secrets where name = 'outbound_cron_secret' limit 1;
    if base_url is null or secret is null then
      return new;
    end if;
    perform net.http_post(
      url := rtrim(base_url, '/') || '/functions/v1/notify-signup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-outbound-secret', secret
      ),
      body := jsonb_build_object('user_id', new.id, 'capped', recent = 11)
    );
  exception when others then
    -- Never block a sign-up over an alert. Logged for the owner to find.
    raise warning 'notify_signup: alert not sent for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

comment on function public.notify_signup is
  'Sign-up alert (061): posts the new auth user id to the notify-signup Edge Function with the Vault-held shared secret. Never raises.';

-- Not callable by API roles: it only makes sense as a trigger.
revoke all on function public.notify_signup() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_notify on auth.users;
create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row execute function public.notify_signup();
