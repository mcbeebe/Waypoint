-- Phase 1: Google Calendar sync columns
-- Tracks the Google Calendar event ID for bi-directional sync

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

ALTER TABLE deadlines
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;

-- Index for efficient sync lookups
CREATE INDEX IF NOT EXISTS idx_appointments_gcal_id
  ON appointments (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deadlines_gcal_id
  ON deadlines (google_calendar_event_id)
  WHERE google_calendar_event_id IS NOT NULL;
