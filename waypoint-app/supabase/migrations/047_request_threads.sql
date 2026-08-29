-- 047: Request Case File — one request, one thread (Roadmap/Request-Case-File-Plan.md)
-- Any paper-trail entry can attach to the family_request it serves: stamped at
-- send/log time, backfilled from the 045 founders, and inherited by
-- Gmail-synced replies on unambiguous threads only (mis-attribution is worse
-- evidence than omission). Additive and idempotent.

alter table public.communications
  add column if not exists request_id uuid references public.family_requests(id) on delete set null;

create index if not exists communications_request_id_idx
  on public.communications (request_id) where request_id is not null;

comment on column public.communications.request_id is
  'The tracked family_request this entry serves — stamped at send/log time, inherited by Gmail-synced replies (unambiguous threads only), backfilled from 045 founders.';

-- Backfill: the 045 link points request → founding communication; mirror it.
update public.communications c
set request_id = fr.id
from public.family_requests fr
where fr.communication_id = c.id
  and c.request_id is null;

-- Inheritance: a synced reply (or any insert) on a Gmail thread inherits the
-- thread's request — but only when the thread maps to exactly ONE request
-- within the same family. The gmail edge function inserts through the
-- user-JWT client, so this trigger covers sync with no function changes.
create or replace function public.inherit_request_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidates uuid[];
begin
  if new.request_id is null and new.gmail_thread_id is not null then
    select array_agg(distinct c.request_id)
      into candidates
      from public.communications c
     where c.gmail_thread_id = new.gmail_thread_id
       and c.family_id = new.family_id
       and c.request_id is not null;
    if candidates is not null and array_length(candidates, 1) = 1 then
      new.request_id := candidates[1];
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists communications_inherit_request on public.communications;
create trigger communications_inherit_request
  before insert on public.communications
  for each row execute function public.inherit_request_id();
