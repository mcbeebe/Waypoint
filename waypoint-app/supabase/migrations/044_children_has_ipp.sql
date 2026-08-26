-- 044: "We have an IPP" confirmation (owner feedback, Aug 26)
-- The process map asks whether a family has an IPP; the only answers were
-- "upload now" or "request records". Families who simply *know* they have
-- one (services already running) need to say so without uploading — the
-- map then places them at the services stage and stops asking.

alter table public.children
  add column has_ipp boolean;

comment on column public.children.has_ipp is
  'Family confirmed an IPP exists (upload optional). null = unknown, true = confirmed/uploaded, false = confirmed none';
