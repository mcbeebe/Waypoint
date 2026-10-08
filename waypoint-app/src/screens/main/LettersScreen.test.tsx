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
  createRequest: vi.fn(async (input: any) => ({ id: 'req2', ...input })),
  attach: vi.fn(async () => true),
  contacts: [] as any[],
  // A fresh id per write, so a test can tell WHICH paper-trail row was sent.
  commSeq: 0,
  logCommunication: vi.fn(async (_familyId: string, _input: Record<string, unknown>) => ''),
  markSent: vi.fn(async (_id: string) => true),
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
  attachCommunicationToRequest: h.attach,
}));

vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => h.gmail,
  gmailSend: h.gmailSend,
}));

vi.mock('@/lib/analytics', () => ({ trackDraftUsed: vi.fn() }));

// Real templates and tone options; only the network draft is stubbed.
vi.mock('@/lib/letters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/letters')>()),
  generateLetter: async () => h.generated,
}));

import LettersScreen from './LettersScreen';
import { routeParams } from '../../../vitest.setup.ui';
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
  h.attach.mockClear();
  h.commSeq = 0;
  h.logCommunication.mockReset();
  h.logCommunication.mockImplementation(async () => `comm${++h.commSeq}`);
  h.markSent.mockClear();
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

  it('offers a way to change a manual pick, unlike an auto-matched greeting', () => {
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
 * recipients, subject, body — is exactly what reaches gmailSend.
 */
describe('sending through Gmail', () => {
  const DRAFT = 'Dear Service Coordinator, I am requesting an IPP review.';

  beforeEach(() => {
    h.gmail = { gmail: true, email: 'mike@example.com' };
    h.contacts = [
      { id: 'k1', name: 'Pat Nguyen', email: 'pat@rceb.org', role: 'Service Coordinator', organization: 'regional_center' },
      { id: 'k2', name: 'Jenn Beebe', email: 'jenn@example.com', role: 'Parent', organization: 'other' },
    ];
  });

  /** Generate a draft and wait for the Gmail button to appear. */
  async function draftReadyToSend() {
    render(<LettersScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Generate Draft/i }));
    return screen.findByLabelText('Review and send this letter through your connected Gmail');
  }

  /** The open send sheet, found by its title. */
  async function openSheet() {
    fireEvent.click(await draftReadyToSend());
    const title = await screen.findByText('Send this email now?');
    return title.parentElement as HTMLElement;
  }

  it('says it sends by itself, and the button opens a last look instead of sending', async () => {
    const button = await draftReadyToSend();
    expect(screen.getByText(/Sends automatically from mike@example\.com — Gmail won’t open/)).toBeTruthy();

    fireEvent.click(button);
    const sheet = (await screen.findByText('Send this email now?')).parentElement as HTMLElement;
    expect(within(sheet).getByText(/goes out right away from your Gmail — there’s no undo/)).toBeTruthy();
    expect(within(sheet).getByText('mike@example.com')).toBeTruthy();
    expect(within(sheet).getByText('Pat Nguyen <pat@rceb.org>')).toBeTruthy();
    expect(within(sheet).getByText(DRAFT)).toBeTruthy();
    expect(h.gmailSend).not.toHaveBeenCalled();

    fireEvent.click(within(sheet).getByLabelText('Go back'));
    // react-native-web unmounts a faded-out Modal on the browser's
    // `animationend`, which jsdom never fires — so fire it, on the animated
    // wrapper (the only ancestor whose handler acts on its own target).
    for (let el: HTMLElement | null = sheet; el; el = el.parentElement) fireEvent.animationEnd(el);
    await waitFor(() => expect(screen.queryByText('Send this email now?')).toBeNull());
    expect(h.gmailSend).not.toHaveBeenCalled();
  });

  it('shows the subject as a field, and the subject the parent sets is the one sent', async () => {
    await draftReadyToSend();
    const field = screen.getByLabelText('Email subject') as HTMLInputElement;
    // No subject from the model → the template fallback, now visible AND editable.
    expect(field.value).toBe('IPP Meeting Request — Teddy');
    fireEvent.change(field, { target: { value: 'Follow-up on Teddy’s IPP review' } });

    fireEvent.click(screen.getByLabelText('Review and send this letter through your connected Gmail'));
    const sheet = (await screen.findByText('Send this email now?')).parentElement as HTMLElement;
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
    // …and the paper trail records the subject that went out.
    expect(h.logCommunication.mock.calls[0][1]).toMatchObject({
      subject: 'Request: Teddy’s IPP review meeting',
    });
  });

  it('uses the subject the model wrote for this letter over the template title', async () => {
    h.generated = { draft: DRAFT, subject: 'Written recommendation for Teddy’s 1:1 support' };
    await draftReadyToSend();
    expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toBe(
      'Written recommendation for Teddy’s 1:1 support'
    );
  });

  it('never sends a "Subject:" line inside the email body', async () => {
    h.generated = { draft: `Subject: Teddy — IPP review\n\n${DRAFT}` };
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByLabelText('Send now'));
    await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
    expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ subject: 'Teddy — IPP review', body: DRAFT });
  });

  it('adds people to the To line — typed, or a Key Contact by name — and sends only those still listed', async () => {
    const sheet = await openSheet();
    const add = within(sheet).getByLabelText('Add someone to the To line');
    const addButton = within(sheet).getByLabelText('Add to To');

    // The addressee is already on the letter, so is never offered again.
    fireEvent.change(add, { target: { value: 'pat' } });
    expect(within(sheet).queryByLabelText('Add Pat Nguyen to the To line')).toBeNull();

    fireEvent.change(add, { target: { value: 'jen' } });
    fireEvent.click(within(sheet).getByLabelText('Add Jenn Beebe to the To line'));
    expect(within(sheet).getByText('jenn@example.com')).toBeTruthy();

    // Two addresses in one entry would add someone the list never showed.
    fireEvent.change(add, { target: { value: 'a@x.com, b@y.com' } });
    expect(addButton.getAttribute('aria-disabled')).toBe('true');

    fireEvent.change(add, { target: { value: 'advocate@example.org' } });
    fireEvent.click(addButton);
    expect(within(sheet).getByText('advocate@example.org')).toBeTruthy();

    fireEvent.click(within(sheet).getByLabelText('Remove jenn@example.com'));
    expect(within(sheet).queryByText('jenn@example.com')).toBeNull();

    fireEvent.click(within(sheet).getByLabelText('Send now'));
    await waitFor(() => expect(h.gmailSend).toHaveBeenCalledTimes(1));
    expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ to: 'pat@rceb.org, advocate@example.org' });
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

  it('a failed send keeps the sheet open and says why', async () => {
    h.gmailSend.mockImplementation(async () => ({ ok: false, error: 'Gmail said no' }));
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByLabelText('Send now'));
    expect(await within(sheet).findByText('Gmail said no')).toBeTruthy();
    expect(screen.getByText('Send this email now?')).toBeTruthy();
    expect(h.markSent).not.toHaveBeenCalled();
  });

  it('a letter edited after it was saved logs and sends the text that actually went out', async () => {
    await draftReadyToSend();
    fireEvent.click(screen.getByLabelText('Save this draft'));
    await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

    const edited = `${DRAFT} Could we meet the week of October 20?`;
    fireEvent.change(screen.getByDisplayValue(DRAFT), { target: { value: edited } });
    fireEvent.click(screen.getByLabelText('Review and send this letter through your connected Gmail'));
    const sheet = (await screen.findByText('Send this email now?')).parentElement as HTMLElement;
    fireEvent.click(within(sheet).getByLabelText('Send now'));

    await waitFor(() => expect(h.markSent).toHaveBeenCalled());
    // The edited text is its own row, and THAT row is the one marked sent —
    // not the pre-edit draft that happened to be saved first.
    expect(h.logCommunication).toHaveBeenCalledTimes(2);
    expect(h.logCommunication.mock.calls[1][1]).toMatchObject({ body: edited });
    expect(h.gmailSend.mock.calls[0][0]).toMatchObject({ communicationId: 'comm2', body: edited });
    expect(h.markSent).toHaveBeenCalledWith('comm2');
  });

  it('so does "Mark as sent" — an edit after saving is the row that gets marked', async () => {
    await draftReadyToSend();
    fireEvent.click(screen.getByLabelText('Save this draft'));
    await waitFor(() => expect(h.logCommunication).toHaveBeenCalledTimes(1));

    const edited = `${DRAFT} Thursdays work best for us.`;
    fireEvent.change(screen.getByDisplayValue(DRAFT), { target: { value: edited } });
    fireEvent.click(screen.getByRole('button', { name: /Mark this letter as sent/i }));

    await waitFor(() => expect(h.markSent).toHaveBeenCalled());
    expect(h.logCommunication.mock.calls[1][1]).toMatchObject({ body: edited });
    expect(h.markSent).toHaveBeenCalledWith('comm2');
  });
});
