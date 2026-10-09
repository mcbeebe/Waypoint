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
import { Linking } from 'react-native';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

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
  createRequest: vi.fn(async (input: any) => ({ id: 'req2', ...input }) as any),
  toast: vi.fn((_message: string, _type?: string) => {}),
  attach: vi.fn(async () => true),
  contacts: [] as any[],
  // A fresh id per write, so a test can tell WHICH paper-trail row was sent.
  commSeq: 0,
  logCommunication: vi.fn(async (_familyId: string, _input: Record<string, unknown>) => ''),
  markSent: vi.fn(async (_id: string) => true),
  recordCc: vi.fn(async (_id: string, _cc: readonly string[]) => true),
  updateDraft: vi.fn(
    async (_id: string, _fields: Record<string, unknown>) =>
      'updated' as 'updated' | 'not_draft' | 'error'
  ),
  gmail: { gmail: false, email: null as string | null },
  gmailSend: vi.fn(async (_input: Record<string, unknown>) => ({ ok: true }) as { ok: boolean; error?: string }),
  generated: { draft: 'Dear Service Coordinator, I am requesting an IPP review.' } as {
    draft: string;
    subject?: string;
  },
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
  logCommunication: h.logCommunication,
  markCommunicationSent: h.markSent,
  recordCommunicationCc: h.recordCc,
  updateCommunicationDraft: h.updateDraft,
  attachCommunicationToRequest: h.attach,
}));

vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => h.gmail,
  gmailSend: h.gmailSend,
}));

vi.mock('@/lib/analytics', () => ({ trackDraftUsed: vi.fn() }));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: h.toast }) }));

// Real templates and tone options; only the network draft is stubbed.
vi.mock('@/lib/letters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/letters')>()),
  generateLetter: async () => h.generated,
}));

import LettersScreen from './LettersScreen';
import { routeParams, clipboard } from '../../../vitest.setup.ui';
import { sourcesForCitation } from '@/data/contentSources';

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
  h.toast.mockClear();
  h.attach.mockClear();
  h.commSeq = 0;
  h.logCommunication.mockReset();
  h.logCommunication.mockImplementation(async () => `comm${++h.commSeq}`);
  h.markSent.mockClear();
  h.recordCc.mockClear();
  h.updateDraft.mockReset();
  h.updateDraft.mockImplementation(async () => 'updated');
  h.gmail = { gmail: false, email: null };
  h.gmailSend.mockReset();
  h.gmailSend.mockImplementation(async () => ({ ok: true }));
  h.generated = { draft: 'Dear Service Coordinator, I am requesting an IPP review.' };
  h.contacts = [];
});

afterEach(() => {
  vi.useRealTimers();
  delete routeParams.template;
});

describe('the deadline the sent moment shows', () => {
  it('its citation is a receipt the parent can open, not grey text', async () => {
    await draftAndMarkSent();
    const line = await screen.findByText(/Their deadline/);
    const chip = within(line.parentElement as HTMLElement).getByLabelText(
      /Why this — the source/
    );
    fireEvent.click(chip);
    // The sheet shows the section that actually carries the 30-day clock
    // printed beside it, with its own claim and its own link. (Asserted via
    // the registry rather than a literal, so a re-verified claim doesn't
    // break this test for the wrong reason.)
    const src = sourcesForCitation('W&I §4646.5(b)');
    expect(src).toHaveLength(1);
    expect(screen.getByText(src[0].title)).toBeTruthy();
    expect(screen.getByText(src[0].claim)).toBeTruthy();
    expect(screen.getByLabelText(`Read the section — ${src[0].title}`)).toBeTruthy();
  });

  it('re-sending an open ask keeps that request’s clock, and says it is overdue', async () => {
    await draftAndMarkSent();
    // The Aug 1 ask + 30 days = Aug 31, already past on Sep 6. The bug showed
    // a comfortable Oct 6 here while the Request Tracker showed Aug 31.
    const line = await screen.findByText(/Their deadline/);
    expect(line.textContent).toContain('2026-08-31');
    expect(line.textContent).not.toContain('2026-10-06');
    // The citation moved out of this sentence and into a tappable chip. The
    // pairing this file exists to guard is ADJACENCY, so it is asserted
    // within the clock pill — a whole-screen query passed with the chip
    // relocated to the bottom of the card, which is exactly the regression
    // that would put a statute next to the wrong date.
    const pill = line.parentElement as HTMLElement;
    expect(
      within(pill).getByLabelText(/^W&I §4646\.5\(b\)\. Why this — the source$/)
    ).toBeTruthy();
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
    // Matches how NavigatorScreen's handleEmailThis actually calls this —
    // this text was never logged before, unlike CommunicationLogScreen's
    // and homeTriage's draftBody hand-offs.
    routeParams.draftBodyUnlogged = true;
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

  it('picking a chip addresses the letter and updates the paper-trail organization', async () => {
    h.contacts = [
      { id: 'k1', name: 'Keri Waller', email: 'keri@acrc.org', role: 'Case Manager', organization: 'regional_center' },
    ];
    render(<LettersScreen />);

    fireEvent.click(screen.getByLabelText('Send to Keri Waller'));

    // The address box now names the real recipient — the template's own
    // "other" org default no longer wins once someone is picked.
    expect(screen.getByText(/Keri Waller \(keri@acrc\.org\)/)).toBeTruthy();
    expect(screen.queryByText(/Choose who this goes to/i)).toBeNull();

    // Not just the on-screen text: the actual paper-trail write carries
    // the picked contact's real organization, not the 'general' template's
    // 'other' default.
    fireEvent.click(screen.getByLabelText('Save this draft'));
    await waitFor(() => expect(h.logCommunication).toHaveBeenCalled());
    expect(h.logCommunication.mock.calls[0][1]).toMatchObject({
      organization: 'regional_center',
      contact: 'Keri Waller',
    });
  });

  it('an auto-matched recipient can be changed too, and the pick replaces the match', () => {
    h.contacts = [
      { id: 'k1', name: 'Keri Waller', email: 'keri@acrc.org', role: 'Case Manager', organization: 'regional_center' },
      { id: 'k2', name: 'Sam Rivera', email: 'sam@example.org', role: 'Advocate', organization: 'other' },
    ];
    render(<LettersScreen />);
    // Waypoint matches Sam by the letter's own organization — no tap needed.
    expect(screen.getByText(/Sam Rivera \(sam@example\.org\)/)).toBeTruthy();
    expect(screen.queryByLabelText('Send to Keri Waller')).toBeNull();
    // It used to offer no way out of an automatic match.
    fireEvent.click(screen.getByLabelText('Change who this goes to'));
    expect(screen.getByText(/Choose who this goes to/i)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Send to Keri Waller'));
    expect(screen.getByText(/Keri Waller \(keri@acrc\.org\)/)).toBeTruthy();
    expect(screen.queryByText(/Sam Rivera \(sam@example\.org\)/)).toBeNull();
    // And the parent can still change their own pick.
    expect(screen.getByLabelText('Change who this goes to')).toBeTruthy();
  });

  it('a Change can be taken back, and a greeting match warns when re-addressed', () => {
    routeParams.draftBody = 'Hi Keri, could we set up a time to talk about the reauthorization?';
    h.contacts = [
      { id: 'k1', name: 'Keri Waller', email: 'keri@acrc.org', role: 'Case Manager', organization: 'regional_center' },
      { id: 'k2', name: 'Sam Rivera', email: 'sam@example.org', role: 'Advocate', organization: 'school' },
    ];
    render(<LettersScreen />);
    // Matched from the greeting.
    expect(screen.getByText(/Keri Waller \(keri@acrc\.org\)/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Change who this goes to'));
    fireEvent.click(screen.getByLabelText('Keep Keri Waller'));
    expect(screen.getByText(/Keri Waller \(keri@acrc\.org\)/)).toBeTruthy();
    expect(screen.queryByText(/still greets/)).toBeNull();

    fireEvent.click(screen.getByLabelText('Change who this goes to'));
    fireEvent.click(screen.getByLabelText('Send to Sam Rivera'));
    expect(screen.getByText(/Sam Rivera \(sam@example\.org\)/)).toBeTruthy();
    expect(screen.getByText(/The letter still greets Keri Waller/)).toBeTruthy();
  });

  it('offers a way to change a manual pick', () => {
    h.contacts = [
      { id: 'k1', name: 'Keri Waller', email: 'keri@acrc.org', role: 'Case Manager', organization: 'regional_center' },
    ];
    render(<LettersScreen />);

    fireEvent.click(screen.getByLabelText('Send to Keri Waller'));
    expect(screen.getByLabelText('Change who this goes to')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Change who this goes to'));
    // Back to square one: the chip row (and the "choose who" prompt) return.
    expect(screen.getByText(/Choose who this goes to/i)).toBeTruthy();
    expect(screen.getByLabelText('Send to Keri Waller')).toBeTruthy();
  });

  it('can address someone not yet saved as a contact, by typing their email', () => {
    render(<LettersScreen />);

    const input = screen.getByLabelText('Recipient email address');
    const useButton = screen.getByLabelText('Use this email address');
    // react-native-web's TouchableOpacity renders a <div role="button">, not
    // a real <button> — its `disabled` prop only ever surfaces as
    // aria-disabled, so that (not jest-dom's toBeDisabled, which checks the
    // native disabled DOM property) is what actually reflects the gate.
    expect(useButton.getAttribute('aria-disabled')).toBe('true');

    fireEvent.change(input, { target: { value: 'newprovider@clinic.org' } });
    expect(useButton.getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(useButton);

    expect(screen.getByText('newprovider@clinic.org')).toBeTruthy();
  });

  it('with no saved contacts at all, still offers the typed-address fallback and Key Contacts', () => {
    render(<LettersScreen />);
    expect(screen.getByLabelText('Recipient email address')).toBeTruthy();
    expect(screen.getByText(/Save them in Profile → Key Contacts/i)).toBeTruthy();
  });
});

/**
 * The chip picker is not scoped to the `general` template — any letter
 * whose recipient `pickRecipient` can't auto-match (no greeting, no saved
 * contact at the template's organization) gets the same fallback, not just
 * an "Email This" answer (an adversarial review, 2026-09-12, flagged this
 * as an unflagged, untested scope expansion — this pins that it is in fact
 * intended, not incidental).
 */
describe('the same fallback also helps a normal, template-driven letter', () => {
  it('offers contact chips for an IPP letter when no RC contact is saved', async () => {
    h.contacts = [
      { id: 's1', name: 'Carol Guggino', email: 'carol@school.org', role: 'Principal', organization: 'school' },
    ];
    render(<LettersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));
    await screen.findByText(/no blanks left|Fill in \d blank/i);

    // No Regional Center contact is saved and the generated draft has no
    // greeting, so pickRecipient finds nothing — but the parent still has
    // Carol available to pick, exactly like the general-template case.
    expect(screen.getByLabelText('Send to Carol Guggino')).toBeTruthy();
  });
});

/**
 * draftBody defaults to meaning "already a paper-trail row" — true for
 * CommunicationLogScreen's "keep working on this draft" and homeTriage's
 * saved-draft resume, the two callers this hand-off was originally built
 * for. Getting this backwards in either direction is a real, silent
 * failure: assume "already logged" for fresh text and Save/Send never
 * writes it; assume "not yet logged" for a reopened draft and it duplicates
 * the row it came from.
 */
describe('draftBody logging assumption — already-logged vs. fresh text', () => {
  beforeEach(() => {
    routeParams.template = 'general';
    routeParams.draftBody = 'Some text handed to Letters from elsewhere.';
  });

  it('a plain draftBody hand-off (no draftBodyUnlogged) never re-logs — the reopen case', () => {
    render(<LettersScreen />);
    fireEvent.click(screen.getByLabelText('Save this draft'));
    // saveDraftOnce's `loggedDraftRef.current === draft` check runs
    // synchronously before any await, so the skip decision is already made
    // by the time this click handler returns — nothing to wait for.
    expect(h.logCommunication).not.toHaveBeenCalled();
  });

  it('draftBodyUnlogged: true (the Navigator "Email This" case) logs on the first save', async () => {
    routeParams.draftBodyUnlogged = true;
    render(<LettersScreen />);
    fireEvent.click(screen.getByLabelText('Save this draft'));
    await waitFor(() => expect(h.logCommunication).toHaveBeenCalled());
    expect(h.logCommunication.mock.calls[0][1]).toMatchObject({
      body: 'Some text handed to Letters from elsewhere.',
      status: 'draft',
    });
  });
});

/**
 * "Send now with Gmail" used to send on one tap, beside an "Open in Gmail"
 * that only opens a compose window — and with a subject the parent could see
 * but not change. The owner sent a note to a provider that way (2026-10-07)
 * under "IPP Meeting Request — Teddy Beebe", a template title that had
 * nothing to do with it. These pin the fix: the button says it sends by
 * itself, opens a last look instead of sending, and what that sheet shows —
 * recipient, subject, body — is exactly what reaches gmailSend.
 */
describe('sending through Gmail', () => {
  const DRAFT = 'Dear Service Coordinator, I am requesting an IPP review.';
  const BUTTON = 'Review and send this letter through your connected Gmail';

  beforeEach(() => {
    h.gmail = { gmail: true, email: 'mike@example.com' };
    h.contacts = [
      { id: 'k1', name: 'Pat Nguyen', email: 'pat@rceb.org', role: 'Service Coordinator', organization: 'regional_center' },
    ];
  });

  afterEach(() => {
    delete routeParams.draftBody;
    delete routeParams.draftBodyUnlogged;
    delete routeParams.draftId;
    delete routeParams.draftSubject;
  });

  /** Generate a draft and wait for the Gmail button to appear. */
  async function draftReadyToSend() {
    render(<LettersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));
    return screen.findByLabelText(BUTTON);
  }

  /** Open the send sheet from the button; returns the sheet. */
  async function openSheetFromButton() {
    fireEvent.click(await screen.findByLabelText(BUTTON));
    return (await screen.findByText('Send this email now?')).parentElement as HTMLElement;
  }

  async function openSheet() {
    await draftReadyToSend();
    return openSheetFromButton();
  }

  /**
   * react-native-web unmounts a faded-out Modal on the browser's
   * `animationend`, which jsdom never fires — so a sheet the code closed
   * would still be in the DOM. Fire it on every ancestor (only the animated
   * wrapper acts on its own target) so "still open" means open.
   */
  function settleModal(inside: HTMLElement) {
    for (let el: HTMLElement | null = inside; el; el = el.parentElement) fireEvent.animationEnd(el);
  }

  describe('Cc (owner ask, 2026-10-09)', () => {
    beforeEach(() => {
      h.contacts = [
        { id: 'k1', name: 'Pat Nguyen', email: 'pat@rceb.org', role: 'Service Coordinator', organization: 'regional_center' },
        { id: 'k2', name: 'Sam Rivera', email: 'sam@example.org', role: 'Spouse', organization: 'other' },
      ];
    });

    it('copies a Key Contact or a typed address, shows them everywhere, and sends them', async () => {
      await draftReadyToSend();
      expect(screen.getByText('No one')).toBeTruthy();
      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'advocate@example.org' } });
      fireEvent.click(screen.getByLabelText('Add to Cc'));

      // The steps name who is copied, and say their replies count too.
      expect(screen.getByText(/to Pat Nguyen, copying Sam Rivera and advocate@example\.org — Gmail/)).toBeTruthy();
      expect(screen.getByText(/including people you copied/)).toBeTruthy();
      expect(screen.getByText(/counts as a reply: Waypoint treats it like an answer and holds off on follow-up nudges/)).toBeTruthy();

      const sheet = await openSheetFromButton();
      expect(within(sheet).getByText('Sam Rivera <sam@example.org>')).toBeTruthy();
      expect(within(sheet).getByText('advocate@example.org')).toBeTruthy();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      expect(h.gmailSend.mock.calls[0][0]).toMatchObject({
        to: 'pat@rceb.org',
        cc: ['sam@example.org', 'advocate@example.org'],
      });
    });

    it('refuses what is not one address, and a removed person is not sent', async () => {
      await draftReadyToSend();
      fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'a@x.com, b@y.com' } });
      fireEvent.click(screen.getByLabelText('Add to Cc'));
      expect(screen.getByText('That doesn’t look like one email address.')).toBeTruthy();

      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      fireEvent.click(screen.getByLabelText('Remove Sam Rivera from Cc'));
      expect(screen.getByText('No one')).toBeTruthy();
      const sheet = await openSheetFromButton();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ cc: [] });
    });

    it('an address typed but not added stops the send instead of being dropped', async () => {
      await draftReadyToSend();
      fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'sam@example.org' } });
      fireEvent.click(screen.getByLabelText(BUTTON));
      expect(screen.getByText(/Tap Add to copy that address, or clear it/)).toBeTruthy();
      expect(screen.queryByText('Send this email now?')).toBeNull();
      expect(h.gmailSend).not.toHaveBeenCalled();
    });

    it('a copied person made the addressee stays off Cc when the addressee changes back', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      fireEvent.click(screen.getByLabelText('Change who this goes to'));
      fireEvent.click(screen.getByLabelText('Send to Sam Rivera'));
      fireEvent.click(screen.getByLabelText('Change who this goes to'));
      fireEvent.click(screen.getByLabelText('Send to Pat Nguyen'));
      expect(screen.getByText('No one')).toBeTruthy();
    });

    it('"Mark as sent" after the mail-app hand-off records the Cc that hand-off carried (064)', async () => {
      const open = vi.spyOn(Linking, 'openURL').mockResolvedValue(true);
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      fireEvent.click(screen.getByText(/^Open in (Gmail|Mail app)$/));
      await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
      expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain('sam@example.org');
      // Chips changed after the hand-off do not rewrite what went out.
      fireEvent.click(screen.getByLabelText('Remove Sam Rivera from Cc'));
      fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));
      await waitFor(() => expect(h.recordCc).toHaveBeenCalledTimes(1));
      expect(h.recordCc).toHaveBeenCalledWith('comm1', ['sam@example.org']);
      open.mockRestore();
    });

    it('a Cc on screen is not recorded for a letter that was copied, printed or faxed instead', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));
      await waitFor(() => expect(h.markSent).toHaveBeenCalled());
      expect(h.recordCc).not.toHaveBeenCalled();
    });

    it('a Gmail send records nothing app-side — the gmail function stores its Cc', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      const sheet = await openSheetFromButton();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(h.markSent).toHaveBeenCalledTimes(1));
      expect(h.recordCc).not.toHaveBeenCalled();
    });

    it('the addressee is never also copied', async () => {
      await draftReadyToSend();
      fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'PAT@rceb.org' } });
      fireEvent.click(screen.getByLabelText('Add to Cc'));
      expect(screen.getByText('They’re already on this email.')).toBeTruthy();
      // And a copied person who becomes the addressee drops off the Cc line.
      fireEvent.click(screen.getByLabelText('Copy Sam Rivera'));
      fireEvent.click(screen.getByLabelText('Change who this goes to'));
      fireEvent.click(screen.getByLabelText('Send to Sam Rivera'));
      expect(screen.getByText('No one')).toBeTruthy();
    });
  });

  describe('"When you press Send" says what THIS send does', () => {
    const liveIpp = h.requests;
    afterEach(() => {
      h.requests = liveIpp;
      h.createRequest.mockImplementation(async (input: any) => ({ id: 'req2', ...input }));
    });

    it('a founding send names the legal timeline it starts', async () => {
      h.requests = [];
      await draftReadyToSend();
      expect(screen.getByText(/starts tracking the 30-day legal timeline for this request/)).toBeTruthy();
    });

    it('a re-send of an open ask joins its case instead — no new timeline promised', async () => {
      await draftReadyToSend(); // req1 is a live IPP request
      expect(screen.getByText(/added to this request’s case file/)).toBeTruthy();
      expect(screen.queryByText(/legal timeline/)).toBeNull();
    });

    it('a send whose tracking fails says so, instead of reporting success', async () => {
      h.requests = [];
      h.createRequest.mockImplementation(async () => null);
      const sheet = await openSheet();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(h.toast).toHaveBeenCalledWith(expect.stringMatching(/couldn’t start tracking it/), 'error')
      );
      expect(h.toast).not.toHaveBeenCalledWith(expect.stringMatching(/^Sent through Gmail — replies will sync/), 'success');
      // And no statutory date for a request that was never opened.
      expect(screen.queryByText(/Their deadline/)).toBeNull();
    });

    it('a send whose paper-trail mark fails points to "Mark as sent", the real recovery', async () => {
      h.markSent.mockImplementation(async () => false);
      const sheet = await openSheet();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(h.toast).toHaveBeenCalledWith(expect.stringMatching(/Tap “Mark as sent” below to start tracking/), 'error')
      );
      h.markSent.mockImplementation(async () => true);
    });
  });

  it('says it sends by itself, and the button opens a last look instead of sending', async () => {
    await draftReadyToSend();
    // "When you press Send" — read BEFORE the tap: the last look comes first,
    // then exactly who it is from and to, the paper trail, and the reply.
    expect(screen.getByText('WHEN YOU PRESS SEND')).toBeTruthy();
    expect(screen.getByText(/one last time — nothing goes until you confirm/)).toBeTruthy();
    expect(screen.getByText(/It’s sent automatically from mike@example\.com to Pat Nguyen — Gmail won’t open/)).toBeTruthy();
    expect(screen.getByText(/A copy is saved to your Paper Trail/)).toBeTruthy();
    expect(screen.getByText(/When a reply comes in on this email, it shows on Home/)).toBeTruthy();

    const sheet = await openSheetFromButton();
    expect(within(sheet).getByText(/goes out right away from your Gmail — there’s no undo/)).toBeTruthy();
    expect(within(sheet).getByText('mike@example.com')).toBeTruthy();
    expect(within(sheet).getByText('Pat Nguyen <pat@rceb.org>')).toBeTruthy();
    expect(within(sheet).getByText(DRAFT)).toBeTruthy();
    // The dialog itself is named, not just a heading inside it. (It takes the
    // dialog role once its fade-in ends.)
    settleModal(sheet);
    expect(screen.getByRole('dialog', { name: 'Send this email now?' })).toBeTruthy();
    expect(h.gmailSend).not.toHaveBeenCalled();

    fireEvent.click(within(sheet).getByLabelText('Go back'));
    settleModal(sheet);
    await waitFor(() => expect(screen.queryByText('Send this email now?')).toBeNull());
    expect(h.gmailSend).not.toHaveBeenCalled();
  });

  it('shows the subject as a field, and the subject the parent sets is the one sent and logged', async () => {
    await draftReadyToSend();
    const field = screen.getByLabelText('Email subject') as HTMLInputElement;
    // No subject from the model → the template fallback, now visible AND editable.
    expect(field.value).toBe('IPP Meeting Request — Teddy');
    fireEvent.change(field, { target: { value: 'Follow-up on Teddy’s IPP review' } });

    const sheet = await openSheetFromButton();
    const sheetField = within(sheet).getByLabelText(
      'Subject of the email you are about to send'
    ) as HTMLInputElement;
    // One subject, two places to edit it — the sheet starts from the screen's.
    expect(sheetField.value).toBe('Follow-up on Teddy’s IPP review');
    fireEvent.change(sheetField, { target: { value: 'Request: Teddy’s IPP review meeting' } });

    fireEvent.click(within(sheet).getByLabelText('Send now'));
    await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
    expect(h.gmailSend.mock.calls[0][0]).toMatchObject({
      to: 'pat@rceb.org',
      subject: 'Request: Teddy’s IPP review meeting',
      body: DRAFT,
    });
    expect(h.logCommunication.mock.calls[0][1]).toMatchObject({
      subject: 'Request: Teddy’s IPP review meeting',
    });
  });

  it('uses the subject the model wrote for this letter, on one line', async () => {
    h.generated = {
      draft: DRAFT,
      subject: 'Written recommendation for Teddy’s 1:1 support\nBcc: someone@else.com',
    };
    await draftReadyToSend();
    const one = 'Written recommendation for Teddy’s 1:1 support Bcc: someone@else.com';
    expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toBe(one);
    const sheet = await openSheetFromButton();
    fireEvent.click(within(sheet).getByLabelText('Send now'));
    await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
    // A line break in a subject would start a second header in the message.
    expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ subject: one });
  });

  it('moves a "Subject:" line out of the body — never sent, copied or logged as letter text', async () => {
    h.generated = { draft: `Subject: Teddy — IPP review\n\n${DRAFT}` };
    await draftReadyToSend();
    expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toBe('Teddy — IPP review');
    expect(screen.getByDisplayValue(DRAFT)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(clipboard.text).toBe(DRAFT));

    const sheet = await openSheetFromButton();
    fireEvent.click(within(sheet).getByLabelText('Send now'));
    await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
    expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ subject: 'Teddy — IPP review', body: DRAFT });
    expect(h.logCommunication.mock.calls[0][1]).toMatchObject({
      subject: 'Teddy — IPP review',
      body: DRAFT,
    });
  });

  it('will not send with a blank subject, or a [BRACKET] left in it', async () => {
    const sheet = await openSheet();
    const field = within(sheet).getByLabelText('Subject of the email you are about to send');
    const send = within(sheet).getByLabelText('Send now');

    fireEvent.change(field, { target: { value: '   ' } });
    expect(send.getAttribute('aria-disabled')).toBe('true');
    expect(within(sheet).getByText('Add a subject first.')).toBeTruthy();

    fireEvent.change(field, { target: { value: 'IPP review on [DATE]' } });
    expect(send.getAttribute('aria-disabled')).toBe('true');
    expect(within(sheet).getByText(/Fill the blanks in the draft first/)).toBeTruthy();

    fireEvent.click(send);
    expect(h.gmailSend).not.toHaveBeenCalled();
  });

  it('a blank fixed in the subject field unblocks the send — the stale "Subject:" line does not hold it', async () => {
    // The Navigator's "Email This" hands over exactly this shape.
    routeParams.template = 'general';
    routeParams.draftBody = `Subject: IPP review on [DATE]\n\nHi Pat,\n\n${DRAFT}`;
    routeParams.draftBodyUnlogged = true;
    h.contacts = [{ id: 'k1', name: 'Pat Nguyen', email: 'pat@rceb.org', organization: 'regional_center' }];
    render(<LettersScreen />);

    const button = await screen.findByLabelText(/Fill the 1 blank above/);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(screen.getByLabelText('Email subject'), {
      target: { value: 'IPP review on October 20' },
    });
    expect(screen.getByLabelText(BUTTON).getAttribute('aria-disabled')).toBeNull();
  });

  it('a failed send keeps the sheet open and says why', async () => {
    h.gmailSend.mockImplementation(async () => ({ ok: false, error: 'Gmail said no' }));
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByLabelText('Send now'));
    expect(await within(sheet).findByText('Gmail said no')).toBeTruthy();
    settleModal(sheet);
    expect(screen.getByText('Send this email now?')).toBeTruthy();
    expect(h.markSent).not.toHaveBeenCalled();
  });

  it('Escape cannot close the sheet while it is sending', async () => {
    let finish: (v: { ok: boolean }) => void = () => undefined;
    h.gmailSend.mockImplementation(
      () => new Promise<{ ok: boolean }>((resolve) => { finish = resolve; })
    );
    const sheet = await openSheet();
    settleModal(sheet); // active (listening for Escape) once shown
    fireEvent.click(within(sheet).getByLabelText('Send now'));
    await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));

    fireEvent.keyUp(document, { key: 'Escape' });
    settleModal(sheet);
    expect(screen.getByText('Send this email now?')).toBeTruthy();

    finish({ ok: true });
    await waitFor(() => expect(h.markSent).toHaveBeenCalled());
  });

  it('announces why Send now is off, as it changes', async () => {
    const sheet = await openSheet();
    fireEvent.change(within(sheet).getByLabelText('Subject of the email you are about to send'), {
      target: { value: '' },
    });
    const reason = within(sheet).getByText('Add a subject first.');
    expect(reason.closest('[aria-live="polite"]')).toBeTruthy();
  });

  /**
   * One letter is one paper-trail row. Logging every revision as its own row
   * left the pre-edit text behind as an unsent draft — which Home then put at
   * the top as "Finish the letter you started", for a letter already sent.
   */
  describe('the paper trail', () => {
    it('an edit after saving revises that row, and that row is the one sent', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

      const edited = `${DRAFT} Could we meet the week of October 20?`;
      fireEvent.change(screen.getByDisplayValue(DRAFT), { target: { value: edited } });
      const sheet = await openSheetFromButton();
      fireEvent.click(within(sheet).getByLabelText('Send now'));

      await waitFor(() => expect(h.markSent).toHaveBeenCalled());
      expect(h.logCommunication).toHaveBeenCalledTimes(1);
      expect(h.updateDraft).toHaveBeenCalledWith('comm1', expect.objectContaining({ body: edited }));
      expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ communicationId: 'comm1', body: edited });
      expect(h.markSent).toHaveBeenCalledWith('comm1');
    });

    it('a subject changed after saving is the subject the row records', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

      fireEvent.change(screen.getByLabelText('Email subject'), {
        target: { value: 'Written recommendation request' },
      });
      const sheet = await openSheetFromButton();
      fireEvent.click(within(sheet).getByLabelText('Send now'));

      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      expect(h.updateDraft).toHaveBeenCalledWith(
        'comm1',
        expect.objectContaining({ subject: 'Written recommendation request' })
      );
      expect(h.gmailSend.mock.calls[0][0]).toMatchObject({
        communicationId: 'comm1',
        subject: 'Written recommendation request',
      });
    });

    it('"Mark as sent" after an edit marks the revised row', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

      const edited = `${DRAFT} Thursdays work best for us.`;
      fireEvent.change(screen.getByDisplayValue(DRAFT), { target: { value: edited } });
      fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));

      await waitFor(() => expect(h.markSent).toHaveBeenCalled());
      expect(h.logCommunication).toHaveBeenCalledTimes(1);
      expect(h.updateDraft).toHaveBeenCalledWith('comm1', expect.objectContaining({ body: edited }));
      expect(h.markSent).toHaveBeenCalledWith('comm1');
    });

    it('a row that can no longer be revised is logged fresh, not lost', async () => {
      h.updateDraft.mockImplementation(async () => 'not_draft'); // e.g. sent from elsewhere
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

      const edited = `${DRAFT} One more thing.`;
      fireEvent.change(screen.getByDisplayValue(DRAFT), { target: { value: edited } });
      fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));

      await waitFor(() => expect(h.markSent).toHaveBeenCalled());
      expect(h.logCommunication.mock.calls[1][1]).toMatchObject({ body: edited });
      expect(h.markSent).toHaveBeenCalledWith('comm2');
    });

    it('a revision that failed to save is a failed save — never a second row beside the first', async () => {
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

      h.updateDraft.mockImplementationOnce(async () => 'error'); // a network blip
      const edited = `${DRAFT} One more thing.`;
      fireEvent.change(screen.getByDisplayValue(DRAFT), { target: { value: edited } });
      const sheet = await openSheetFromButton();
      fireEvent.click(within(sheet).getByLabelText('Send now'));

      expect(await within(sheet).findByText(/Couldn't save the draft/)).toBeTruthy();
      expect(h.gmailSend).not.toHaveBeenCalled();
      expect(h.logCommunication).toHaveBeenCalledTimes(1);

      // The next tap tries the revision again, against the same row.
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      expect(h.updateDraft).toHaveBeenLastCalledWith('comm1', expect.objectContaining({ body: edited }));
      expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ communicationId: 'comm1' });
      expect(h.logCommunication).toHaveBeenCalledTimes(1);
    });

    it('after "Mark as sent", recording who it went to is not a new letter', async () => {
      // No saved contact matches the draft, so nobody is picked yet.
      h.contacts = [{ id: 'k2', name: 'Carol Guggino', email: 'carol@school.org', organization: 'school' }];
      render(<LettersScreen />);
      fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));
      await screen.findByRole('button', { name: /Mark this letter as sent/i });
      fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));
      await waitFor(() => expect(h.markSent).toHaveBeenCalledWith('comm1'));

      // The parent records who it went to, then copies it for their notes.
      fireEvent.click(screen.getByLabelText('Send to Carol Guggino'));
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await waitFor(() => expect(clipboard.text).toBe(DRAFT));

      // No duplicate DRAFT of a sent letter (Home would ask them to finish it),
      // and the screen still knows it went out.
      expect(h.logCommunication).toHaveBeenCalledTimes(1);
      expect(h.updateDraft).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: /Mark this letter as sent/i })).toBeNull();
    });

    it('a Gmail send whose client-side mark failed is still remembered as sent', async () => {
      h.markSent.mockImplementationOnce(async () => false);
      let sheet = await openSheet();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.markSent).toHaveBeenCalledTimes(1));

      // The function marked the row sent; a second send must not reuse it
      // (that would overwrite its thread and drop the first email's replies).
      sheet = await openSheetFromButton();
      expect(within(sheet).getByText(/You already sent this letter/)).toBeTruthy();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(2));
      expect(h.gmailSend.mock.calls[1][0]).toMatchObject({ communicationId: 'comm2' });
    });

    it('after a send, Copy adds nothing — and a second send is its own row, with a warning', async () => {
      let sheet = await openSheet();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.markSent).toHaveBeenCalledWith('comm1'));

      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
      await waitFor(() => expect(clipboard.text).toBe(DRAFT));
      expect(h.logCommunication).toHaveBeenCalledTimes(1);

      sheet = await openSheetFromButton();
      expect(within(sheet).getByText(/You already sent this letter/)).toBeTruthy();
      fireEvent.click(within(sheet).getByLabelText('Send now'));
      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(2));
      // A new row, so the first send keeps its own Gmail thread and replies.
      expect(h.gmailSend.mock.calls[1][0]).toMatchObject({ communicationId: 'comm2' });
      expect(h.updateDraft).not.toHaveBeenCalled();
    });

    it('a save that failed is tried again on the next tap, not believed', async () => {
      h.logCommunication.mockImplementationOnce(async () => null as unknown as string);
      await draftReadyToSend();
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByLabelText('Save this draft'));
      await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(2));
    });

    it('a reopened draft keeps its subject and sends as the row it came from', async () => {
      routeParams.template = 'ipp_review_request';
      routeParams.draftBody = DRAFT;
      routeParams.draftId = 'row-7';
      routeParams.draftSubject = 'Written recommendation for Teddy’s 1:1 support';
      render(<LettersScreen />);

      const field = (await screen.findByLabelText('Email subject')) as HTMLInputElement;
      expect(field.value).toBe('Written recommendation for Teddy’s 1:1 support');
      const sheet = await openSheetFromButton();
      fireEvent.click(within(sheet).getByLabelText('Send now'));

      await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
      expect(h.gmailSend.mock.calls[0][0]).toMatchObject({
        communicationId: 'row-7',
        subject: 'Written recommendation for Teddy’s 1:1 support',
      });
      expect(h.logCommunication).not.toHaveBeenCalled();
      await waitFor(() => expect(h.markSent).toHaveBeenCalledWith('row-7'));
    });
  });
});
