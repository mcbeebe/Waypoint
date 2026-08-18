/**
 * Google Calendar API service
 * Fetches, creates, updates, and deletes events via the Google Calendar REST API.
 * Auth tokens managed by auth.ts (stored in SecureStore).
 */

import { getGoogleAccessToken, refreshGoogleToken } from './auth';
import type { GoogleCalendarEvent, GoogleCalendarEventInput } from '@/types/database';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/** Authenticated fetch with automatic 401 retry via token refresh */
async function calendarFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error('No Google access token. Please sign in with Google first.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response = await fetch(url, { ...options, headers });

  // Retry once on 401 (expired token)
  if (response.status === 401) {
    const newToken = await refreshGoogleToken();
    if (!newToken) {
      throw new Error('Google token refresh failed. Please sign in again.');
    }
    headers.Authorization = `Bearer ${newToken}`;
    response = await fetch(url, { ...options, headers });
  }

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    response = await fetch(url, { ...options, headers });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
  }

  return response;
}

/**
 * Fetch calendar events within a date range.
 * @param startDate - ISO 8601 start (e.g., '2026-04-01T00:00:00Z')
 * @param endDate - ISO 8601 end (e.g., '2026-07-01T00:00:00Z')
 * @param maxResults - Max events to return (default 250)
 */
export async function fetchCalendarEvents(
  startDate: string,
  endDate: string,
  maxResults = 250
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: startDate,
    timeMax: endDate,
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const allEvents: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${CALENDAR_API}?${params}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await calendarFetch(url);
    const data = await response.json();

    const events: GoogleCalendarEvent[] = (data.items ?? []).map((item: Record<string, unknown>) => ({
      id: item.id as string,
      summary: (item.summary as string) ?? '(No title)',
      description: (item.description as string) ?? null,
      location: (item.location as string) ?? null,
      start: item.start as GoogleCalendarEvent['start'],
      end: item.end as GoogleCalendarEvent['end'],
      htmlLink: (item.htmlLink as string) ?? '',
      status: (item.status as string) ?? 'confirmed',
      created: (item.created as string) ?? '',
      updated: (item.updated as string) ?? '',
    }));

    allEvents.push(...events);
    pageToken = data.nextPageToken as string | undefined;
  } while (pageToken);

  return allEvents;
}

/** Map a raw API item to our event shape */
function toEvent(data: Record<string, unknown>): GoogleCalendarEvent {
  return {
    id: data.id as string,
    summary: (data.summary as string) ?? '(No title)',
    description: (data.description as string) ?? null,
    location: (data.location as string) ?? null,
    start: data.start as GoogleCalendarEvent['start'],
    end: data.end as GoogleCalendarEvent['end'],
    htmlLink: (data.htmlLink as string) ?? '',
    status: (data.status as string) ?? 'confirmed',
    created: (data.created as string) ?? '',
    updated: (data.updated as string) ?? '',
    attendees: (data.attendees as GoogleCalendarEvent['attendees']) ?? undefined,
  };
}

/**
 * Create a new event on the user's primary Google Calendar.
 * When the event has attendees, `notify` (default true) makes Google email
 * them an invitation. Returns the created event (with Google-assigned ID).
 */
export async function createCalendarEvent(
  event: GoogleCalendarEventInput,
  notify = true
): Promise<GoogleCalendarEvent> {
  const url = `${CALENDAR_API}?sendUpdates=${notify ? 'all' : 'none'}`;
  const response = await calendarFetch(url, {
    method: 'POST',
    body: JSON.stringify(event),
  });
  return toEvent(await response.json());
}

/** Fetch one event by id (used to prefill the edit form) */
export async function getCalendarEvent(eventId: string): Promise<GoogleCalendarEvent> {
  const response = await calendarFetch(`${CALENDAR_API}/${eventId}`);
  return toEvent(await response.json());
}

/**
 * Update an existing Google Calendar event (PATCH, partial).
 * `notify` (default true) emails attendees about the change.
 * Note: an `attendees` array in updates REPLACES the whole list.
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<GoogleCalendarEventInput>,
  notify = true
): Promise<GoogleCalendarEvent> {
  const url = `${CALENDAR_API}/${eventId}?sendUpdates=${notify ? 'all' : 'none'}`;
  const response = await calendarFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return toEvent(await response.json());
}

/**
 * Delete an event from the user's primary Google Calendar.
 * `notify` (default true) emails attendees a cancellation.
 */
export async function deleteCalendarEvent(eventId: string, notify = true): Promise<void> {
  await calendarFetch(`${CALENDAR_API}/${eventId}?sendUpdates=${notify ? 'all' : 'none'}`, {
    method: 'DELETE',
  });
}
