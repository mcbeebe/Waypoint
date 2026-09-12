/**
 * The "marked sent" moment, rendered — because the statutory date it prints
 * carries a citation, and a citation on the wrong date is the app misstating
 * the law to a family.
 *
 * A unit test on the date helpers cannot see the defect these guard: the
 * screen decides WHICH date to hand the clock. Re-sending a letter for an ask
 * that is already open must keep that request's original clock — the law
 * counts from the first written ask, and the Request Tracker computes from the
 * stored row. Anchoring on "today" instead put two statutory dates, weeks
 * apart, on two screens for one request, each with W&I §4646.5(b) attached.
 *
 * (The local-day half of the anchor — a founding send must not slice the UTC
 * day — is pinned in requestClocks.tz.test.ts, which runs in both timezones.
 * This file runs at the machine's zone, so it asserts only what holds in any.)
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  // One live IPP request, asked six weeks before the re-send below.
  requests: [
    {
      id: 'req1',
      title: 'IPP review meeting request',
      request_type: 'ipp_meeting',
      requested_on: '2026-08-01',
      status: 'requested',
    },
  ] as any[],
  createRequest: vi.fn(async (input: any) => ({ id: 'req2', ...input })),
  attach: vi.fn(async () => true),
  contacts: [] as any[],
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    family: { id: 'fam1', ai_consent_at: '2026-01-01T00:00:00Z', regional_center: 'ACRC' },
  }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', is_primary: true, date_of_birth: '2018-01-01' }],
    updateChild: vi.fn(async () => true),
  }),
}));

vi.mock('@/hooks/useRequests', () => ({
  useRequests: () => ({ requests: h.requests, createRequest: h.createRequest }),
}));

vi.mock('@/hooks/useContacts', () => ({ useContacts: () => ({ contacts: h.contacts }) }));

vi.mock('@/hooks/useCommunications', () => ({
  useCommunications: () => ({ communications: [], refetch: vi.fn() }),
  logCommunication: async () => 'comm1',
  markCommunicationSent: async () => true,
  attachCommunicationToRequest: h.attach,
}));

vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ gmail: false }),
  gmailSend: async () => ({ ok: true }),
}));

vi.mock('@/lib/analytics', () => ({ trackDraftUsed: vi.fn() }));

// Real templates and tone options; only the network draft is stubbed.
vi.mock('@/lib/letters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/letters')>()),
  generateLetter: async () => ({ draft: 'Dear Service Coordinator, I am requesting an IPP review.' }),
}));

import LettersScreen from './LettersScreen';
import { routeParams } from '../../../vitest.setup.ui';

/** Generate a draft, then confirm it went out — the path a parent walks. */
async function draftAndMarkSent() {
  render(<LettersScreen />);
  fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));
  await screen.findByRole('button', { name: /Mark this letter as sent/i });
  fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // 6:30pm local on Sep 6 2026 — an evening send, six weeks after the ask.
  vi.setSystemTime(new Date(2026, 8, 6, 18, 30));
  routeParams.template = 'ipp_review_request';
  delete routeParams.requestId;
  h.createRequest.mockClear();
  h.attach.mockClear();
  h.contacts = [];
});

afterEach(() => {
  vi.useRealTimers();
  delete routeParams.template;
});

describe('the deadline the sent moment shows', () => {
  it('re-sending an open ask keeps that request’s clock, and says it is overdue', async () => {
    await draftAndMarkSent();
    // The Aug 1 ask + 30 days = Aug 31, already past on Sep 6. The bug showed
    // a comfortable Oct 6 here while the Request Tracker showed Aug 31.
    const line = await screen.findByText(/Their deadline/);
    expect(line.textContent).toContain('2026-08-31');
    expect(line.textContent).toContain('W&I §4646.5(b)');
    expect(line.textContent).not.toContain('2026-10-06');
    // Joining a live request must not open a second clock row.
    expect(h.createRequest).not.toHaveBeenCalled();
    expect(h.attach).toHaveBeenCalledWith('comm1', 'req1');
  });

  it('a first send founds the request and shows the clock it just started', async () => {
    h.requests = [];
    await draftAndMarkSent();
    const line = await screen.findByText(/Their deadline/);
    // Founded today (local) → 30 days out, not yet overdue.
    expect(line.textContent).toContain('2026-10-06');
    await waitFor(() => expect(h.createRequest).toHaveBeenCalled());
    expect(h.createRequest.mock.calls[0][0]).toMatchObject({
      request_type: 'ipp_meeting',
      requested_on: '2026-09-06',
    });
    h.requests = [
      {
        id: 'req1',
        title: 'IPP review meeting request',
        request_type: 'ipp_meeting',
        requested_on: '2026-08-01',
        status: 'requested',
      },
    ];
  });

  it('a letter sent from a case never opens a second clock, or a second date', async () => {
    routeParams.requestId = 'req1'; // launched from the case file
    await draftAndMarkSent();
    await waitFor(() => expect(h.createRequest).not.toHaveBeenCalled());
    // The case owns the clock — the celebration does not print a rival date.
    expect(screen.queryByText(/Their deadline/)).toBeNull();
  });
});

/**
 * "Email This" on a Navigator answer (see NavigatorScreen's handleEmailThis)
 * lands here via the `template: 'general'` + `draftBody` hand-off, with no
 * template of its own to match an organization and often no greeting for
 * `pickRecipient` to read a name from — the one case this screen previously
 * had no in-app way to address at all (owner report, 2026-09-12).
 */
describe('addressing a draft neither the greeting nor the template can match', () => {
  beforeEach(() => {
    routeParams.template = 'general';
    routeParams.draftBody =
      'Reauthorizations lapse quietly — put the end date on a calendar with reminders.';
  });

  it('offers saved contacts as chips instead of leaving the parent stuck', () => {
    h.contacts = [
      { id: 'k1', name: 'Keri Waller', email: 'keri@acrc.org', role: 'Case Manager', organization: 'regional_center' },
      { id: 'k2', name: 'Carol Guggino', email: 'carol@school.org', role: 'Principal', organization: 'school' },
    ];
    render(<LettersScreen />);

    expect(screen.getByText(/Choose who this goes to/i)).toBeTruthy();
    expect(screen.getByLabelText('Send to Keri Waller')).toBeTruthy();
    expect(screen.getByLabelText('Send to Carol Guggino')).toBeTruthy();
  });

  it('picking a chip addresses the letter and updates the paper-trail organization', () => {
    h.contacts = [
      { id: 'k1', name: 'Keri Waller', email: 'keri@acrc.org', role: 'Case Manager', organization: 'regional_center' },
    ];
    render(<LettersScreen />);

    fireEvent.click(screen.getByLabelText('Send to Keri Waller'));

    // The address box now names the real recipient — the template's own
    // "other" org default no longer wins once someone is picked.
    expect(screen.getByText(/Keri Waller \(keri@acrc\.org\)/)).toBeTruthy();
    expect(screen.queryByText(/Choose who this goes to/i)).toBeNull();
  });

  it('with no saved contacts at all, still points the parent at Key Contacts', () => {
    render(<LettersScreen />);
    expect(screen.getByText(/Save them in Profile → Key Contacts/i)).toBeTruthy();
  });
});
