-- 046: Gmail thread tracking (owner feedback, Aug 27) — letters sent
-- through the Gmail API carry their thread/message ids so replies can be
-- synced into the paper trail and answered in-thread, no copy-paste.
-- (communications.direction already exists from 022.)

alter table public.communications
  add column gmail_thread_id text,
  add column gmail_message_id text;

-- Sync idempotency: a Gmail message lands in the paper trail once.
create unique index if not exists communications_gmail_message_id_key
  on public.communications (gmail_message_id)
  where gmail_message_id is not null;

create index if not exists communications_gmail_thread_id_idx
  on public.communications (gmail_thread_id)
  where gmail_thread_id is not null;

comment on column public.communications.gmail_thread_id is
  'Gmail API thread id, when sent/received through the connected Gmail account';
