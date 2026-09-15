/**
 * The Request Tracker's clock, rendered. The screen had no UI coverage at all,
 * and it prints a statutory date beside the statute it rests on — a wrong date
 * here is the app misstating the law to a family.
 *
 * What this file does NOT yet assert: that the citation opens. On this screen
 * it is still inert text, deliberately. The whole card is a
 * `<Pressable accessibilityRole="button">` (RequestTrackerScreen.tsx:160), so
 * dropping the tappable <Citation> in would nest a button inside a button —
 * invalid on web and, on native, hidden from VoiceOver by the card's own
 * accessibility grouping. Verified, not assumed: rendering that version
 * produced exactly one `validateDOMNesting` warning and one nested button.
 * Making it tappable needs the card restructured first; see the PR.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  // One open IPP-meeting ask, made Aug 1 — 30 days later is Aug 31.
  requests: [
    {
      id: 'req1',
      title: 'IPP review meeting request',
      request_type: 'ipp_meeting',
      requested_on: '2026-08-01',
      status: 'requested' as string,
    },
  ] as any[],
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
}));
vi.mock('@/hooks/useRequests', () => ({
  useRequests: () => ({
    requests: h.requests,
    loading: false,
    error: null,
    createRequest: async () => null,
    updateStatus: async () => true,
    refetch: async () => {},
  }),
}));
vi.mock('@/hooks/useCommunications', () => ({
  useCommunications: () => ({ communications: [], refetch: async () => {} }),
}));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: () => {} }) }));

import RequestTrackerScreen from './RequestTrackerScreen';
import { deadlineFor } from '@/lib/requestClocks';
import { sourcesForCitation } from '@/data/contentSources';

const OPEN = { ...h.requests[0] };

beforeEach(() => {
  h.requests = [{ ...OPEN }];
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 8, 6, 18, 30)); // Sep 6 — the Aug 31 clock is blown
});

// The suite's own convention, and the reason the tz projects exist: a test
// that installs fake timers and never removes them leaks a frozen clock into
// every file that runs after it in the same worker.
afterEach(() => {
  vi.useRealTimers();
});

describe('the tracker clock', () => {
  it('counts from the ask, not from today, and says so with its statute', () => {
    render(<RequestTrackerScreen />);
    // Aug 1 + 30 days = Aug 31; six days past on Sep 6. Anchoring on "today"
    // would print a comfortable Oct 6 here while the case screen said Aug 31.
    const line = screen.getByText(/past the legal deadline/);
    expect(line.textContent).toContain('6 days past the legal deadline (2026-08-31)');
    // The date and the statute it rests on are in ONE text node — asserted on
    // the node, not the screen, so relocating the citation elsewhere on the
    // card cannot keep this green.
    expect(line.textContent).toContain('W&I §4646.5(b)');
  });

  it('the statute it prints is one the provenance registry actually covers', () => {
    // The chip is inert here today, so nothing else on this screen would catch
    // a citation the registry cannot back — and an unbacked citation is one we
    // cannot show a parent the source for.
    const dl = deadlineFor('ipp_meeting', '2026-08-01', new Date(2026, 8, 6));
    expect(dl).not.toBeNull();
    expect(sourcesForCitation(dl!.citation).length).toBeGreaterThan(0);
  });

  it('a granted request shows no clock at all', () => {
    h.requests = [{ ...OPEN, status: 'granted' }];
    render(<RequestTrackerScreen />);
    expect(screen.queryByText(/past the legal deadline/)).toBeNull();
    expect(screen.queryByText(/Due 2026-/)).toBeNull();
  });
});
