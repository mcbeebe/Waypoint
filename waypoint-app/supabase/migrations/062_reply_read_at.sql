-- 062_reply_read_at.sql
--
-- communications.read_at — when the family opened a synced reply.
--
-- Home showed a reply only when it won the single One Thing slot, so a reply
-- that came in while an overdue task led the ladder sat unseen in the paper
-- trail (owner report, 2026-10-08). Home now shows a "New reply" strip for
-- every unread reply on a tracked thread; opening the reply stamps this
-- column and the strip clears — on every device the family signs in on,
-- which is why it is a column and not device storage (owner decision).
--
-- "Read" is not "answered": the One Thing reply card still keys off whether
-- an outgoing message followed on the thread (lib/replyInbox.ts). This column
-- only drives the strip and the paper trail's unread dot.
--
-- The app tolerates this migration being unapplied: with no read_at on the
-- rows it fetches, the strip and the dot stay off (lib/replyInbox.ts
-- `hasReadState`), and marking read is a no-op.
--
-- Backfill: replies already answered on their thread, or older than 14 days,
-- start read — otherwise applying this would greet every family with every
-- reply they have ever received as "new".
--
-- Additive and idempotent; safe to re-run.
-- Rollback: alter table public.communications drop column read_at;

alter table public.communications
  add column if not exists read_at timestamptz;

comment on column public.communications.read_at is
  'When the family opened this incoming reply (Home "New reply" strip, paper-trail unread dot). Null = unread. Not the same as answered.';

update public.communications c
   set read_at = coalesce(c.sent_at, c.occurred_at)
 where c.direction = 'incoming'
   and c.read_at is null
   and (
     c.occurred_at < now() - interval '14 days'
     or exists (
       select 1 from public.communications o
        where o.direction = 'outgoing'
          and o.family_id = c.family_id
          and o.gmail_thread_id = c.gmail_thread_id
          and coalesce(o.sent_at, o.occurred_at) > coalesce(c.sent_at, c.occurred_at)
     )
   );

-- Home asks "any unread replies for this family?" on every load.
create index if not exists communications_unread_incoming_idx
  on public.communications (family_id)
  where direction = 'incoming' and read_at is null;
