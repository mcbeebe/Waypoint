/**
 * The Case file button, rendered. The number on it is a claim about a family's
 * own evidence, made one row above the list that evidence appears in — so the
 * only test worth having is one that reads the button and the list together.
 *
 * A lib-level test cannot see this defect class: the count could be computed
 * perfectly and the screen could still print a different subset of it. The
 * first version of this feature did exactly that — it counted only the
 * exactly-linked items while the list below, and the exported file, both
 * showed the thread-inferred ones too.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  request: {
    id: 'req1',
    family_id: 'fam1',
    child_id: null,
    request_type: 'ipp_meeting',
    title: 'IPP meeting for Teddy',
    requested_on: '2026-07-01',
    channel: 'email',
    status: 'requested',
    decided_on: null,
    notes: null,
    communication_id: 'origin',
    created_at: '2026-07-01T14:00:00Z',
    updated_at: '2026-07-01T14:00:00Z',
  } as any,
  // Two exactly-linked items (the origin letter + a logged call) and one that
  // is only inferred from the Gmail thread. The file contains all three.
  rows: [] as any[],
  requestIdErrors: null as string | null,
}));

function comm(over: Record<string, unknown>) {
  return {
    id: 'c?',
    family_id: 'fam1',
    child_id: null,
    kind: 'email',
    direction: 'outgoing',
    subject: 'Requesting an IPP meeting',
    body: 'Body text',
    contact_name: null,
    org: 'regional_center',
    occurred_at: '2026-07-01T10:00:00Z',
    sent_at: '2026-07-01T10:00:00Z',
    status: 'sent',
    gmail_thread_id: null,
    gmail_message_id: null,
    request_id: null,
    created_at: '2026-07-01T10:00:00Z',
    ...over,
  };
}

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', is_primary: true }],
  }),
}));

vi.mock('@/hooks/useRequests', () => ({
  useRequests: () => ({
    requests: [h.request],
    loading: false,
    updateStatus: vi.fn(async () => true),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCommunications', () => ({
  useCommunications: () => ({ communications: [], refetch: vi.fn() }),
  logCommunication: async () => 'c9',
  isMissingRequestIdColumn: (m: string) => m.includes('request_id'),
}));

vi.mock('@/lib/gmail', () => ({ gmailStatus: async () => ({ gmail: false }) }));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: () => {} }) }));

// A chainable stub shaped like the three queries the screen actually runs:
// .eq().eq(), .eq().eq().maybeSingle(), and .eq().in().
vi.mock('@/lib/supabase', () => {
  const builder = () => {
    const state: { byRequestId: boolean; byThread: boolean } = {
      byRequestId: false,
      byThread: false,
    };
    const chain: any = {
      select: () => chain,
      eq: (col: string) => {
        if (col === 'request_id') state.byRequestId = true;
        return chain;
      },
      in: () => {
        state.byThread = true;
        return chain;
      },
      maybeSingle: async () => ({
        data: h.rows.find((r) => r.id === 'origin') ?? null,
        error: null,
      }),
      then: (resolve: (v: unknown) => unknown) => {
        if (state.byRequestId) {
          if (h.requestIdErrors) {
            return Promise.resolve({ data: null, error: { message: h.requestIdErrors } }).then(
              resolve
            );
          }
          return Promise.resolve({
            data: h.rows.filter((r) => r.request_id === h.request.id),
            error: null,
          }).then(resolve);
        }
        if (state.byThread) {
          return Promise.resolve({
            data: h.rows.filter((r) => r.gmail_thread_id),
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return chain;
  };
  return { supabase: { from: () => builder() } };
});

import RequestCaseScreen from './RequestCaseScreen';
import { routeParams } from '../../../vitest.setup.ui';

beforeEach(() => {
  routeParams.requestId = 'req1';
  h.requestIdErrors = null;
  h.rows = [
    comm({ id: 'origin', gmail_thread_id: 't1', gmail_message_id: 'm1' }),
    comm({
      id: 'call',
      kind: 'call',
      subject: 'Called the service coordinator',
      request_id: 'req1',
      occurred_at: '2026-07-05T12:00:00Z',
    }),
    comm({
      id: 'reply',
      direction: 'incoming',
      subject: 'Re: Requesting an IPP meeting',
      gmail_thread_id: 't1',
      gmail_message_id: 'm2',
      occurred_at: '2026-07-10T09:00:00Z',
    }),
  ];
});

describe('the Case file button', () => {
  it('counts every item the parent can see, thread-inferred ones included', async () => {
    render(<RequestCaseScreen />);

    // All three land on the thread the parent reads...
    await waitFor(() =>
      expect(screen.getByText('Called the service coordinator')).toBeTruthy()
    );
    expect(screen.getByText('Re: Requesting an IPP meeting')).toBeTruthy();

    // ...so the button above it must not say "(2)". The origin letter and the
    // call are exactly linked; the reply is only inferred from the thread, and
    // counting the linked ones alone was the shipped bug.
    await waitFor(() => expect(screen.getByText('📄 Case file (3)')).toBeTruthy());
    expect(screen.queryByText('📄 Case file (2)')).toBeNull();
  });

  it('drops the number when the screen knows the record is incomplete', async () => {
    // A real fetch failure (not the pre-047 shape) — the screen already warns
    // the record may be partial, so the button must not assert a total.
    h.requestIdErrors = 'permission denied for table communications';
    render(<RequestCaseScreen />);

    await waitFor(() => expect(screen.getByText('📄 Case file')).toBeTruthy());
    expect(screen.queryByText(/Case file \(/)).toBeNull();
  });

  it('the statutory clock cites a source the parent can open', async () => {
    render(<RequestCaseScreen />);
    // The clock on an open IPP request rests on §4646.5(b); it must be a
    // control, not the inert grey text it was before.
    const chip = await screen.findByRole('button', { name: /W&I §4646\.5\(b\)/ });
    expect(chip).toBeTruthy();
  });

  it('says "1 item", never "1 items", to a screen reader', async () => {
    h.rows = [comm({ id: 'origin' })];
    render(<RequestCaseScreen />);
    await waitFor(() =>
      expect(screen.getByLabelText(/1 item on record/)).toBeTruthy()
    );
  });
});
