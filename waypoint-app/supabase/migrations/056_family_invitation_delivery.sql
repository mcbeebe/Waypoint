-- 056: Family Sharing B2 — record whether the invitation email went out.
--
-- The family-invite Edge Function sends the co-parent a join link by email
-- (Resend). The pending-invite card must tell the owner the truth about
-- delivery — "sent Sep 2" or "the email didn't send — Resend" — so the row
-- carries it. Written by the Edge Function through the CALLER's own JWT, so
-- 055's admin policy is the only thing that lets it be written.
--
-- Apply by hand in the Supabase SQL editor, in order, like every migration.

alter table public.family_invitations
  add column if not exists sent_at timestamptz,
  add column if not exists send_error text;

comment on column public.family_invitations.sent_at is
  'When the join-link email was last delivered to the provider (Family Sharing B2).';
comment on column public.family_invitations.send_error is
  'Why the last send failed, for the owner''s pending card; null once a send succeeds.';
