-- 057: Family Sharing B2 — the invitation sender cannot be turned into a relay.
--
-- The B2 adversary pass found that anyone who creates a family could insert
-- unlimited invitations to arbitrary addresses, put phishing text in their
-- own name, and loop the family-invite function — Waypoint would send it all
-- from its own domain. The function's only throttle read family_invitations.
-- sent_at, a column the same caller can UPDATE (055's admin policy is
-- `for all`). A throttle is only real if it reads state the caller cannot
-- write. This migration adds that state, plus the input limits that were
-- missing. Everything here is SECURITY DEFINER or a constraint, so the
-- client cannot route around it.
--
-- Apply by hand in the Supabase SQL editor, in order (after 056).

-- ── 1. A send log the client can neither read nor write ──────────────────────
-- RLS enabled with NO policies: every non-owner role gets zero rows and
-- cannot insert. Only the definer function below writes it.
create table if not exists public.family_invite_sends (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.family_invitations(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  sent_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_invite_sends_family_time on public.family_invite_sends (family_id, created_at desc);
create index if not exists idx_invite_sends_invitation_time on public.family_invite_sends (invitation_id, created_at desc);
alter table public.family_invite_sends enable row level security;

-- ── 2. The gate the function must pass BEFORE sending ────────────────────────
-- Returns: 'ok' (and records the send) · 'cooldown' (this invitation was sent
-- in the last 60 s) · 'rate_limited' (the family has sent 30 in 24 h) ·
-- 'not_found' (no such invitation, or the caller is not its family's
-- owner/admin — indistinguishable on purpose).
create or replace function public.record_invite_send(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  fam uuid;
  last_send timestamptz;
  day_count int;
begin
  if auth.uid() is null then
    return 'not_found';
  end if;

  select i.family_id into fam
    from public.family_invitations i
   where i.id = p_invitation_id
     and i.family_id in (select public.admin_family_ids());
  if fam is null then
    return 'not_found';
  end if;

  -- Serialise per family so two concurrent calls cannot both pass the count.
  perform pg_advisory_xact_lock(hashtext('family_invite_send:' || fam::text));

  select max(created_at) into last_send
    from public.family_invite_sends
   where invitation_id = p_invitation_id;
  if last_send is not null and last_send > now() - interval '60 seconds' then
    return 'cooldown';
  end if;

  select count(*) into day_count
    from public.family_invite_sends
   where family_id = fam and created_at > now() - interval '24 hours';
  if day_count >= 30 then
    return 'rate_limited';
  end if;

  insert into public.family_invite_sends (invitation_id, family_id, sent_by)
  values (p_invitation_id, fam, auth.uid());
  return 'ok';
end;
$$;

-- ── 3. Input limits on the invitation itself ─────────────────────────────────
-- The address must look like one address (no display-name form, no lists —
-- the accept RPC compares it verbatim, so anything else can never be
-- redeemed). NOT VALID: enforced for new rows, legacy rows left alone.
alter table public.family_invitations
  drop constraint if exists family_invitations_invitee_email_shape;
alter table public.family_invitations
  add constraint family_invitations_invitee_email_shape
  check (invitee_email ~ '^[^[:space:]@<>,;]+@[^[:space:]@<>,;]+\.[^[:space:]@<>,;]+$' and length(invitee_email) <= 254)
  not valid;

-- A family may hold at most 20 pending invitations.
create or replace function public.family_invitations_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending int;
begin
  select count(*) into pending
    from public.family_invitations
   where family_id = new.family_id and status = 'pending';
  if pending >= 20 then
    raise exception 'too_many_pending_invitations';
  end if;
  return new;
end;
$$;
drop trigger if exists family_invitations_cap_trg on public.family_invitations;
create trigger family_invitations_cap_trg
  before insert on public.family_invitations
  for each row execute function public.family_invitations_cap();

-- ── 4. Keep the provider's message id so bounces can be reconciled ──────────
alter table public.family_invitations
  add column if not exists provider_message_id text;
