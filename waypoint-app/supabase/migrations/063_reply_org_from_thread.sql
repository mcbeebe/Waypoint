-- 063_reply_org_from_thread.sql
--
-- Relabel synced Gmail replies with their thread's organization.
--
-- Until 2026-10 both reply syncs (functions/gmail "sync" and
-- _shared/gmailSync.ts) stamped every incoming row 'regional_center',
-- whatever the thread was about. A provider's reply to a letter the family
-- filed under School read "Regional Center" in the paper trail. The functions
-- now take the label from the family's own outgoing row on the thread
-- (_shared/threadOrg.ts). This repairs the rows already written.
--
-- Scope: only incoming rows that came from a sync (gmail_message_id set).
-- The value on those rows was never chosen by anyone, so nothing true is
-- lost:
--   * thread has a labelled outgoing row → take the newest one's label;
--   * no labelled outgoing row           → null (unlabelled, not wrong).
-- Hand-logged incoming entries (no gmail_message_id) are left alone.
--
-- Display-only: the app reads communications.organization for the paper
-- trail label and the export text; no ranking, clock or entitlement uses it.
--
-- Idempotent; safe to re-run. Rollback is not meaningful (the old values
-- were a constant): update ... set organization = 'regional_center' where
-- direction = 'incoming' and gmail_message_id is not null.

with thread_label as (
  select distinct on (family_id, gmail_thread_id)
         family_id, gmail_thread_id, organization
    from public.communications
   where direction = 'outgoing'
     and gmail_thread_id is not null
     and organization is not null
   order by family_id, gmail_thread_id, coalesce(sent_at, occurred_at) desc
)
update public.communications c
   set organization = tl.organization
  from thread_label tl
 where c.direction = 'incoming'
   and c.gmail_message_id is not null
   and c.family_id = tl.family_id
   and c.gmail_thread_id = tl.gmail_thread_id
   and c.organization is distinct from tl.organization;

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
        and o.organization is not null
   );
