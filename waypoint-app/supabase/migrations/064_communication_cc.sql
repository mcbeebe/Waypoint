-- 064_communication_cc.sql
--
-- communications.cc — who else was on an email, as plain addresses.
--
-- Letters can copy people (#313), and the owner ruled every reply counts as
-- an answer, so the paper trail has to say who was on each email. Until now
-- the Cc existed only in Gmail (initiative 014, PR A).
--
--   outgoing rows: the Cc the family chose (validated by _shared/mime.ts
--                  parseCc on the Gmail path, by lib/letterAddress.ts addCc
--                  on the mail-app hand-off path).
--   incoming rows: everyone else on the reply — its To and Cc minus the
--                  family's own address and minus the sender
--                  (_shared/recipients.ts otherRecipients). That is the list a
--                  reply-all needs (PR B).
--
-- Null means "not recorded": every row written before this migration, and
-- every email with nobody else on it. No backfill — Gmail holds the history,
-- and re-reading every thread is its own job.
--
-- The app and the Edge Functions tolerate this being unapplied: a write that
-- names cc and fails on the missing column is retried without it
-- (isMissingCcColumn), so a late apply loses the Cc, never the email.
--
-- Safe to re-run. Rollback: alter table public.communications drop column cc;

alter table public.communications add column if not exists cc text[];

comment on column public.communications.cc is
  'Other recipients as plain email addresses (064). Outgoing: the chosen Cc. Incoming: To+Cc minus the family and the sender. Null = not recorded.';
