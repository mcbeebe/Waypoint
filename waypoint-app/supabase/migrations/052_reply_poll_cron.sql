-- 052: reply-poll cron + run infrastructure (phase 7, Lane B — 7B-4). The true
-- app-closed loop.
--
-- Creates: (a) the single-flight lease row the functions use to avoid
-- double-sending, (b) google_accounts.synced_at, the sweep's rotation cursor,
-- then (c) a pg_cron job that every 5 minutes POSTs to the `poll-replies` Edge
-- Function via pg_net. That function server-side-syncs Gmail for every
-- consenting family and pushes "you have a reply" — no device need be open.
--
-- ───────────────────────────────────────────────────────────────────────────
-- OWNER PREREQUISITES (do these BEFORE applying, or the job no-ops safely):
--   1. Deploy the `poll-replies` and `push-send` Edge Functions.
--   2. Set the function secret OUTBOUND_CRON_SECRET (a long random string) on
--      the project — the functions and this cron must share the SAME value.
--   3. Store two Vault secrets (Dashboard → Project Settings → Vault), so the
--      secret is NEVER written into the cron.job command text:
--        project_url           = https://<project-ref>.supabase.co
--        outbound_cron_secret  = <the same value as OUTBOUND_CRON_SECRET>
--   4. This migration enables pg_cron + pg_net (Supabase supports both).
--
-- Apply by hand in the Supabase SQL editor, after 051. Idempotent — re-running
-- re-points the same named job. No CI covers any of this.
-- ───────────────────────────────────────────────────────────────────────────

-- ── Run infrastructure the poller needs ──────────────────────────────────────

-- Single-flight lease: a lease ROW (not a session advisory lock, which would
-- not survive transaction pooling) so two overlapping runs can't double-send.
-- Acquisition is one atomic UPDATE guarded on locked_until < now(); see
-- functions/_shared/lease.ts.
create table if not exists public.outbound_run_lock (
  id integer primary key,
  locked_until timestamptz not null default to_timestamp(0)
);
insert into public.outbound_run_lock (id, locked_until)
  values (1, to_timestamp(0))
  on conflict (id) do nothing;
-- Only the service role (the Edge Functions) touches this — never a client.
alter table public.outbound_run_lock enable row level security;

-- Rotation cursor for the Gmail sweep: process least-recently-synced accounts
-- first and stamp this, so runs rotate through everyone and the tail is never
-- starved (functions/_shared/gmailSync.ts orders by this).
alter table public.google_accounts
  add column if not exists synced_at timestamptz;
comment on column public.google_accounts.synced_at is
  'Last time the reply poller swept this account — rotation cursor (phase 7 Lane B).';

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The cron calls THIS function, not net.http_post directly, so the shared
-- secret is read from Vault at run time and never stored in cron.job.command.
create or replace function public.trigger_reply_poll()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  secret text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into secret
    from vault.decrypted_secrets where name = 'outbound_cron_secret' limit 1;
  -- No config yet → do nothing (the job stays harmless until the owner sets up
  -- the Vault secrets), rather than erroring every five minutes.
  if base_url is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := base_url || '/functions/v1/poll-replies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-outbound-secret', secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

comment on function public.trigger_reply_poll is
  'Cron entry (052): posts to the poll-replies Edge Function with the Vault-held shared secret (phase 7 Lane B).';

-- Re-point the named job idempotently: unschedule if it already exists, then
-- schedule fresh. (cron.unschedule raises if the job is unknown, hence the guard.)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'waypoint-reply-poll') then
    perform cron.unschedule('waypoint-reply-poll');
  end if;
end
$$;

select cron.schedule(
  'waypoint-reply-poll',
  '*/5 * * * *',
  $$select public.trigger_reply_poll()$$
);
