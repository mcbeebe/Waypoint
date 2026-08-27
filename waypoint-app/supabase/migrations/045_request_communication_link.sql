-- 045: Link a tracked request to the letter that created it (owner
-- feedback, Aug 27: the tracker row, the paper-trail letter, and the
-- Resource Stack layer describe one event — connect them). Set at
-- creation by the Letters sent moment; null for hand-tracked requests.

alter table public.family_requests
  add column communication_id uuid references public.communications(id) on delete set null;

comment on column public.family_requests.communication_id is
  'The paper-trail entry (letter/email) this request was opened from, when sent via Letters';
