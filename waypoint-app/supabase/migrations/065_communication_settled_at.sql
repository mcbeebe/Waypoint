-- 065_communication_settled_at.sql
--
-- communications.settled_at — "nothing to answer" for an incoming message.
--
-- Two writers (initiative 014):
--   PR D (adding a thread from Gmail): every message brought in as history —
--        all but a fresh, newest message from them — is settled on arrival,
--        so a months-old email the family already dealt with outside
--        Waypoint never takes Home's reply card, the case screen's "a reply
--        came in", or the request tracker's badge.
--   PR C (later): a "✓ Nothing to answer" action, so a reply like "I'll get
--        back to you" stops coming back to Home every morning.
--
-- Settled is not read (062) and not answered: read_at says the family opened
-- it; an outgoing message after it on the thread says they answered it;
-- settled_at says no answer is expected. A request's own statutory clock is
-- untouched by any of the three.
--
-- The app and the gmail function tolerate this being unapplied: an import
-- that names settled_at and fails on the missing column is retried without
-- it (missingOptionalColumn), and rows read without the key are unsettled.
--
-- Safe to re-run. Rollback: alter table public.communications drop column settled_at;

alter table public.communications add column if not exists settled_at timestamptz;

comment on column public.communications.settled_at is
  'When an incoming message was marked as needing no answer (065): history brought in by adding a thread, or the family''s "Nothing to answer". Null = may need an answer.';
