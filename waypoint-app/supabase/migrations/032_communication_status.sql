-- 032: Track whether a drafted letter actually went out
--
-- Letters were logged to the paper trail the moment they were copied or
-- opened in Gmail, which records the intent but not the outcome — a draft
-- written at 11pm and never sent looked identical to one that was.
--
-- 'draft' = written, not yet confirmed sent
-- 'sent'  = the parent confirmed it went out (and when)

alter table public.communications
  add column if not exists status text not null default 'sent',
  add column if not exists sent_at timestamptz;

-- Existing rows were logged as things that happened; keep them that way.
update public.communications
   set sent_at = coalesce(sent_at, occurred_at)
 where status = 'sent' and sent_at is null;

alter table public.communications
  drop constraint if exists communications_status_check;
alter table public.communications
  add constraint communications_status_check check (status in ('draft', 'sent'));

create index if not exists idx_communications_status
  on public.communications(family_id, status);

comment on column public.communications.status is
  'draft = written but not confirmed sent; sent = the parent confirmed it went out.';
comment on column public.communications.sent_at is
  'When the parent confirmed this was sent. Null while it is still a draft.';
