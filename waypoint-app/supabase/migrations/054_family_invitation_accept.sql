-- 054: Family Sharing B3 — the accept flow. A tokenised invite becomes a
-- membership through ONE guarded door.
--
-- Initiative 007 (Roadmap/initiatives/007-family-sharing-invites). B1 (053)
-- made a family_members row grant access to the family file; this migration
-- is the only way a co-parent can CREATE that row for themselves. Until now
-- an invitation was a dead letter: `inviteMember` wrote a pending row with a
-- token nothing ever redeemed.
--
-- THE TRUST BOUNDARY. Both functions are SECURITY DEFINER (they must read an
-- invitation the caller cannot see under RLS, and insert a membership the
-- caller is not yet allowed to insert). Everything that keeps them safe is
-- inside them, checked server-side, never trusted from the client:
--   * the caller must be signed in (auth.uid() is not null);
--   * the token must exist — it is gen_random_uuid()::text, 122 bits, not
--     guessable; a wrong token learns nothing;
--   * the invitation must be pending, and not expired (14 days, new column);
--   * the SIGNED-IN EMAIL must match the invited email (owner decision:
--     email-locked links), compared case- and whitespace-insensitively;
--   * accept is idempotent for the person who already accepted, and refuses
--     an invite someone ELSE already used;
--   * the role written is the role invited — the client cannot escalate it;
--   * the accepted row is locked (FOR UPDATE) so two taps cannot double-join.
-- Failures raise short machine-readable messages the app maps to a screen
-- state (invite_not_found / invite_expired / invite_already_used /
-- invite_email_mismatch / not_signed_in). Like 050, identity is derived from
-- auth.uid() server-side; no grant/revoke, matching 049/050 — the null-uid
-- guard is what makes an anon call a clean error rather than an action.
--
-- Apply by hand in the Supabase SQL editor, in order, like every migration.
-- Pure schema/RPC: nothing in CI verifies it; the client maps its outcomes.

-- ── 1. Invitations age out ──────────────────────────────────────────────────
alter table public.family_invitations
  add column if not exists expires_at timestamptz;

update public.family_invitations
  set expires_at = created_at + interval '14 days'
  where expires_at is null;

alter table public.family_invitations
  alter column expires_at set default (now() + interval '14 days');
alter table public.family_invitations
  alter column expires_at set not null;

comment on column public.family_invitations.expires_at is
  'A leaked join link ages out — 14 days from creation (Family Sharing B3).';

-- ── 2. Preview: what the Join screen shows BEFORE the person commits ───────
-- Returns only what the invitee needs to decide: who invited them, as what
-- role, and whether this signed-in account is the one it was sent to. No
-- child names, no family data — those wait until after acceptance. The
-- invited address is returned MASKED (d***@example.com) so the "different
-- email" state can say which address to sign in with without echoing it.
create or replace function public.preview_family_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv record;
  caller_email text;
  inviter_name text;
  local_part text;
  masked text;
  st text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  select i.family_id, i.invitee_email, i.role, i.status, i.expires_at
    into inv
    from public.family_invitations i
   where i.token = p_token;

  if not found then
    raise exception 'invite_not_found';
  end if;

  caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  select coalesce(nullif(trim(f.parent_first_name), ''), 'A parent')
    into inviter_name
    from public.families f
   where f.id = inv.family_id;

  if inv.status = 'accepted' then
    st := 'already_used';
  elsif inv.status <> 'pending' then
    st := 'not_found';
  elsif inv.expires_at < now() then
    st := 'expired';
  else
    st := 'pending';
  end if;

  local_part := split_part(inv.invitee_email, '@', 1);
  masked := left(local_part, 1) || '***@' || split_part(inv.invitee_email, '@', 2);

  return jsonb_build_object(
    'state', st,
    'role', inv.role,
    'inviter_name', inviter_name,
    'email_matches', lower(trim(inv.invitee_email)) = caller_email,
    'invitee_email_hint', masked
  );
end;
$$;

-- ── 3. Accept: the one door into a family ───────────────────────────────────
create or replace function public.accept_family_invitation(
  p_token text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv record;
  caller_email text;
  already_member boolean;
  name_to_use text;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  -- Lock the invitation row so two concurrent taps cannot both proceed.
  select i.id, i.family_id, i.invitee_email, i.role, i.status, i.expires_at
    into inv
    from public.family_invitations i
   where i.token = p_token
     for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  select exists (
    select 1 from public.family_members m
     where m.family_id = inv.family_id and m.user_id = auth.uid()
  ) into already_member;

  if inv.status = 'accepted' then
    -- Idempotent for the person who accepted; closed to anyone else.
    if already_member then
      return inv.family_id;
    end if;
    raise exception 'invite_already_used';
  end if;

  if inv.status <> 'pending' then
    raise exception 'invite_not_found';
  end if;

  if inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  caller_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if caller_email = '' or lower(trim(inv.invitee_email)) <> caller_email then
    raise exception 'invite_email_mismatch';
  end if;

  name_to_use := coalesce(
    nullif(trim(p_display_name), ''),
    nullif(split_part(inv.invitee_email, '@', 1), ''),
    'Family member'
  );

  -- The role written is the role INVITED — never a client-supplied value.
  insert into public.family_members (family_id, user_id, role, display_name)
  values (inv.family_id, auth.uid(), inv.role, name_to_use)
  on conflict (family_id, user_id) do nothing;

  update public.family_invitations
     set status = 'accepted', responded_at = now()
   where id = inv.id;

  -- Best-effort activity trail (activity_log write is definer-side here).
  begin
    insert into public.activity_log
      (family_id, user_id, user_display_name, action_type, description)
    values
      (inv.family_id, auth.uid(), name_to_use, 'joined_family',
       name_to_use || ' joined the family');
  exception when others then
    null;
  end;

  return inv.family_id;
end;
$$;
