-- 021: Action → Google Calendar event linkage
--
-- Stores the Google Calendar event id created from an action so the app can
-- edit the event (time, attendees) or remove it later. The event itself
-- lives on the user's Google Calendar; this is just the pointer.

alter table public.actions
  add column if not exists google_event_id text;
