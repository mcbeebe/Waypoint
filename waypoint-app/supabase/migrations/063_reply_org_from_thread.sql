-- 063_reply_org_from_thread.sql
--
-- Relabel Gmail thread rows that were stamped 'regional_center' by code,
-- with the label of the message that founded their thread.
--
-- Until 2026-10, three code paths hard-coded organization = 'regional_center':
--   * both reply syncs (functions/gmail "sync", _shared/gmailSync.ts) on every
--     INCOMING reply;
--   * the paper-trail reply send (functions/gmail send, no communicationId) on
--     every OUTGOING reply the family sent from GmailReplyModal.
-- A provider's reply to a letter filed under School read "Regional Center".
-- The functions now use the thread founder's label (_shared/threadOrg.ts);
-- this repairs rows already written, by the same rule:
--
--   founder = the earliest outgoing row on (family_id, gmail_thread_id);
--   label   = founder.organization — null if the founder is unlabelled.
--
-- Rows touched — only those whose value was stamped, never chosen:
--   1. incoming rows that came from a sync (gmail_message_id set);
--   2. outgoing paper-trail replies: kind 'email', no template, a Gmail
--      message id, 'regional_center', and NOT the founder itself.
-- Founders, letters, hand-logged entries and drafts are never touched.
--
-- Display-only: the app reads communications.organization for the paper
-- trail label and its export text; no ranking, clock or entitlement uses it.
-- The updated_at trigger will bump those rows; nothing reads updated_at here.
--
-- DRY RUN FIRST — what would change, by (old → new):
--   with founder as (
--     select distinct on (family_id, gmail_thread_id) family_id, gmail_thread_id, id, organization
--       from public.communications
--      where direction = 'outgoing' and gmail_thread_id is not null
--      order by family_id, gmail_thread_id, coalesce(sent_at, occurred_at), created_at)
--   select c.direction, c.organization as old, f.organization as new, count(*)
--     from public.communications c
--     join founder f on f.family_id = c.family_id and f.gmail_thread_id = c.gmail_thread_id
--    where c.id <> f.id
--      and c.organization is distinct from f.organization
--      and ((c.direction = 'incoming' and c.gmail_message_id is not null)
--        or (c.direction = 'outgoing' and c.kind = 'email' and c.template_key is null
--            and c.gmail_message_id is not null and c.organization = 'regional_center'))
--    group by 1, 2, 3 order by 4 desc;
--
-- Idempotent; safe to re-run. Not reversible row-for-row (the old values were
-- a constant, not a choice); run the dry run above before applying.

with founder as (
  select distinct on (family_id, gmail_thread_id)
         family_id, gmail_thread_id, id, organization
    from public.communications
   where direction = 'outgoing'
     and gmail_thread_id is not null
   order by family_id, gmail_thread_id, coalesce(sent_at, occurred_at), created_at
)
update public.communications c
   set organization = f.organization
  from founder f
 where c.family_id = f.family_id
   and c.gmail_thread_id = f.gmail_thread_id
   and c.id <> f.id
   and c.organization is distinct from f.organization
   and (
     (c.direction = 'incoming' and c.gmail_message_id is not null)
     or (c.direction = 'outgoing'
         and c.kind = 'email'
         and c.template_key is null
         and c.gmail_message_id is not null
         and c.organization = 'regional_center')
   );

-- A synced reply on a thread with no outgoing row at all cannot have been
-- labelled by anyone; leave it unlabelled rather than stamped.
update public.communications c
   set organization = null
 where c.direction = 'incoming'
   and c.gmail_message_id is not null
   and c.organization = 'regional_center'
   and not exists (
     select 1 from public.communications o
      where o.direction = 'outgoing'
        and o.family_id = c.family_id
        and o.gmail_thread_id = c.gmail_thread_id
   );
