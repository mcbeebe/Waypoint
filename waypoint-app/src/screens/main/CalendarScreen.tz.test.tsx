/**
 * The Calendar's day grouping, rendered EAST and WEST.
 *
 * WHY THIS FILE EXISTS — it is the test that would have caught a regression I
 * shipped. `appointmentsByDay` grouped occurrences by slicing the UTC instant
 * out of `start_time`, so an evening appointment in California landed under the
 * NEXT day. The first attempt at fixing it changed only the week-strip lookup
 * key and left the grouping alone — making one side of a lookup local and the
 * other UTC, which was a net regression east of Greenwich.
 *
 * That shipped because everything was verified at the HELPER. The two sides of
 * a comparison are only visible at the call site, and CI runs at `TZ=UTC` where
 * none of it is observable. So this renders the real screen in both hemispheres
 * and asserts what a parent actually sees.
 *
 * Runs under `ui-tz` (Asia/Ho_Chi_Minh) and `ui-tz-west`
 * (America/Los_Angeles). Nothing below may assume the sign of the offset.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({ appointments: [] as any[] }));

vi.mock('@/hooks/useAppointments', () => ({
  useAppointments: () => ({
    appointments: h.appointments,
    loading: false,
    error: null,
    refetch: vi.fn(),
    updateStatus: vi.fn(),
    createAppointment: vi.fn(),
  }),
}));
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' }, loading: false }),
  useChildren: () => ({ children: [] }),
  useSelectedChild: () => ({ child: null, setChild: vi.fn() }),
}));
vi.mock('@/hooks/useDeadlines', () => ({ useDeadlines: () => ({ deadlines: [], loading: false }) }));
vi.mock('@/hooks/useCalendarSync', () => ({
  useCalendarSync: () => ({ syncNow: vi.fn(), syncing: false, lastSyncedAt: null, connected: false }),
}));
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ granted: true, request: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ or: async () => ({ data: [] }), gte: () => ({ lte: async () => ({ data: [] }) }) }) }),
    }),
  },
}));
vi.mock('@/lib/dialogs', () => ({ showAlert: () => {}, confirm: async () => true }));

import CalendarScreen from './CalendarScreen';

/**
 * A time TODAY whose UTC calendar day differs from its local one, whichever
 * hemisphere this run is in. West: an evening is already tomorrow in UTC.
 * East: an early morning is still yesterday in UTC.
 */
function skewedTimeToday(): Date {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const at = new Date(now);
  at.setHours(offset > 0 ? 20 : 5, 0, 0, 0);
  return at;
}

function appointment(start: Date) {
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    id: 'appt-1',
    family_id: 'fam1',
    child_id: null,
    title: 'Speech therapy with Dana',
    location: null,
    notes: null,
    status: 'scheduled',
    source: 'waypoint',
    recurrence: null,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    created_at: start.toISOString(),
    updated_at: start.toISOString(),
  };
}

beforeEach(() => {
  h.appointments = [];
});

describe('an appointment is filed on the day it happens', () => {
  it('the fixture actually straddles the UTC boundary', () => {
    // Without this the whole file could pass by testing an hour where the two
    // day definitions agree — which is exactly how the first version of this
    // sweep's tests passed while the bug was live.
    const at = skewedTimeToday();
    expect(new Date(2026, 0, 15, 12).getTimezoneOffset()).not.toBe(0);
    const localDay = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
    expect(at.toISOString().split('T')[0]).not.toBe(localDay);
  });

  it('shows an evening (or early-morning) appointment under TODAY', () => {
    const at = skewedTimeToday();
    h.appointments = [appointment(at)];
    render(<CalendarScreen />);

    // The appointment is there at all.
    expect(screen.getByText(/Speech therapy with Dana/)).toBeInTheDocument();

    // And it is filed under today's group. With the UTC slice this heading
    // read as the adjacent day instead — a parent looking at "today" would not
    // find the appointment they have in an hour.
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('does not also file it under the adjacent day', () => {
    const at = skewedTimeToday();
    h.appointments = [appointment(at)];
    render(<CalendarScreen />);

    const adjacent = new Date(at);
    adjacent.setDate(adjacent.getDate() + (at.getTimezoneOffset() > 0 ? 1 : -1));
    const adjacentLabel = adjacent.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    // The UTC slice produced exactly this heading, with the card under it.
    expect(screen.queryByText(adjacentLabel)).toBeNull();
    expect(screen.getByText(/1 event/)).toBeInTheDocument();
  });
});
