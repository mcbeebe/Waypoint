-- 026: Persist structured chat metadata (steps, rights, resources, quick
-- replies…) alongside each assistant message, so reloading a saved chat
-- restores the rich answer cards instead of plain text.
-- The client parses [[TRAILER]] blocks into a ChatMeta object at stream
-- time; this column stores that parsed object verbatim.

alter table public.chat_messages
  add column if not exists meta jsonb;

comment on column public.chat_messages.meta is
  'Parsed ChatMeta (steps/rights/resources/quickReplies/followUps…) for assistant messages; null for user messages or prose-only replies.';
