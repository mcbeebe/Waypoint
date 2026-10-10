-- 066_request_intake_on.sql
--
-- family_requests.intake_on — the day a Regional Center intake happened.
--
-- W&I §4643 gives the Regional Center 120 days "following initial intake" to
-- assess, and intake itself comes up to 15 working days after the family's
-- request (§4642). requested_on keeps meaning the day the family asked; this
-- column records intake separately, so neither date is ever relabelled as
-- the other. While intake_on is null the app shows the law's latest possible
-- date (request + 15 working days + 120 days), never an earlier one.
--
-- Nullable, no backfill: existing rows keep their ask date and simply have no
-- intake date yet. The existing row-level policies on family_requests cover
-- the new column.
--
-- The app tolerates this being unapplied: inserts name intake_on only when a
-- parent entered one, and logging an intake date reports the failure.

alter table public.family_requests add column if not exists intake_on date;

comment on column public.family_requests.intake_on is
  'Day of Regional Center intake (W&I §4643 runs from it); null until the family logs it.';
