-- 031: Tell Waypoint's own appointments apart from synced Google events
--
-- Calendar sync pulls in a family's whole Google life (school drop-offs,
-- work meetings), which buries the handful of appointments that belong to
-- the disability journey. Recording where a row came from lets the app
-- offer a "just my Waypoint items" view.
--
-- Note: a Waypoint-created appointment gets a google_calendar_event_id too
-- once it's pushed, so that column can't answer this on its own.

alter table public.appointments
  add column if not exists source text not null default 'waypoint';

-- Existing rows carrying a Google id were, in practice, pulled FROM Google:
-- the push path is new and little-used. Anything created in-app from here
-- on keeps the 'waypoint' default.
update public.appointments
   set source = 'google'
 where google_calendar_event_id is not null
   and source = 'waypoint';

alter table public.appointments
  drop constraint if exists appointments_source_check;
alter table public.appointments
  add constraint appointments_source_check check (source in ('waypoint', 'google'));

create index if not exists idx_appointments_source on public.appointments(family_id, source);

comment on column public.appointments.source is
  'Where this appointment originated: waypoint (created in-app) | google (pulled by calendar sync).';
