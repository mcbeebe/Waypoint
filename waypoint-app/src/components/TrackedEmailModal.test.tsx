/**
 * The tracked-send sheet, rendered.
 *
 * The defect this exists to keep out is not a layout bug — it is a LIE the
 * old Navigator sheet told the database: it wrote a `communications` row
 * marked `sent`, with no recipient and no Gmail thread id, at the instant the
 * compose window opened. So these tests assert what actually reaches
 * `logCommunication` / `markCommunicationSent`, not just what is on screen.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const logged: Array<{ familyId: string; entry: Record<string, unknown> }> = [];
const markedSent: string[] = [];
const gmailSends: Array<Record<string, unknown>> = [];
const opened: string[] = [];
let gmailScope = false;
let gmailSendOk = true;

vi.mock('@/hooks/useCommunications', () => ({
  logCommunication: async (familyId: string, entry: Record<string, unknown>) => {
    logged.push({ familyId, entry });
    return 'comm-1';
  },
  markCommunicationSent: async (id: string) => {
    markedSent.push(id);
    return true;
  },
}));

vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ connected: gmailScope, gmail: gmailScope, email: null }),
  gmailSend: async (input: Record<string, unknown>) => {
    gmailSends.push(input);
    return gmailSendOk ? { ok: true, threadId: 'thread-9' } : { ok: false, error: 'Gmail said no' };
  },
}));

const toasts: Array<{ text: string; tone?: string }> = [];
vi.mock('@/components/Toast', () => ({
  useToast: () => ({ showToast: (text: string, tone?: string) => void toasts.push({ text, tone }) }),
}));

import TrackedEmailModal from './TrackedEmailModal';

// react-native-web's Linking would try to open a real window in jsdom, so the
// test records the URL the component handed over instead.
import { Linking } from 'react-native';
vi.spyOn(Linking, 'openURL').mockImplementation(async (url: string) => {
  opened.push(url);
  return true;
});

const CONTACTS = [
  { id: 'c1', name: 'Ana Diaz', email: 'ana@altaregional.org', role: 'Service coordinator' },
  { id: 'c2', name: 'No email', email: null },
];

function sheet(props: Partial<React.ComponentProps<typeof TrackedEmailModal>> = {}) {
  return render(
    <TrackedEmailModal
      visible
      familyId="fam-1"
      title="Email about this step"
      defaultSubject="Mateo — speech assessment"
      body={'Hello,\n\nCould you let me know the next step?'}
      contacts={CONTACTS}
      onClose={() => {}}
      {...props}
    />
  );
}

const sendButton = () =>
  screen.getByLabelText(/Send through Gmail|Open in your email app/i);

beforeEach(() => {
  logged.length = 0;
  markedSent.length = 0;
  gmailSends.length = 0;
  opened.length = 0;
  toasts.length = 0;
  gmailScope = false;
  gmailSendOk = true;
});

describe('before anything is sent', () => {
  it('refuses to send with no recipient — and writes NOTHING to the paper trail', async () => {
    sheet();
    fireEvent.click(sendButton());
    await waitFor(() => expect(toasts.length).toBeGreaterThan(0));
    expect(toasts[0].text).toMatch(/email address/i);
    // The whole point: no row, no "sent", no record of a send that never was.
    expect(logged).toHaveLength(0);
    expect(markedSent).toHaveLength(0);
  });

  it('refuses an address that is not an address', async () => {
    sheet();
    fireEvent.change(screen.getByLabelText('Recipient email address'), {
      target: { value: 'my case manager' },
    });
    fireEvent.click(sendButton());
    await waitFor(() => expect(toasts.length).toBeGreaterThan(0));
    expect(toasts[0].text).toMatch(/doesn't look like/i);
    expect(logged).toHaveLength(0);
  });

  it('offers only contacts that actually have an address', () => {
    sheet();
    expect(screen.getByLabelText('Send to Ana Diaz')).toBeInTheDocument();
    expect(screen.queryByLabelText('Send to No email')).not.toBeInTheDocument();
  });

  it('fills the recipient from a contact chip', () => {
    sheet();
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    expect(screen.getByLabelText('Recipient email address')).toHaveValue('ana@altaregional.org');
  });

  it('shows the parent the generated body before it goes anywhere', () => {
    sheet({ body: 'Could you let me know the next step?' });
    expect(screen.getByText(/Could you let me know the next step/)).toBeInTheDocument();
  });
});

describe('the hand-off route (no Gmail connection)', () => {
  it('saves a DRAFT — never a "sent" row — and does not claim it went', async () => {
    sheet();
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    fireEvent.click(sendButton());

    await waitFor(() => expect(logged).toHaveLength(1));
    expect(logged[0].familyId).toBe('fam-1');
    expect(logged[0].entry.status).toBe('draft');
    // The recipient is recorded — the old path logged contact: null.
    expect(logged[0].entry.contact).toBe('Ana Diaz');
    expect(logged[0].entry.kind).toBe('email');
    expect(markedSent).toHaveLength(0);

    await waitFor(() => expect(opened).toHaveLength(1));
    // encodeURIComponent turns the @ into %40 inside the compose URL
    expect(decodeURIComponent(opened[0])).toMatch(/ana@altaregional\.org/);

    // And the screen says draft, not sent.
    expect(await screen.findByText(/Opened in/)).toBeInTheDocument();
    expect(screen.getByText(/Saved to your paper trail as a draft/)).toBeInTheDocument();
  });

  it('marks the row sent only when the parent confirms it went', async () => {
    sheet();
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    fireEvent.click(sendButton());
    const confirm = await screen.findByLabelText('I sent it');
    expect(markedSent).toHaveLength(0);

    fireEvent.click(confirm);
    await waitFor(() => expect(markedSent).toEqual(['comm-1']));
  });

  it('leaves the row a draft when the parent says "Not yet"', async () => {
    const onClose = vi.fn();
    sheet({ onClose });
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    fireEvent.click(sendButton());

    fireEvent.click(await screen.findByLabelText('Not yet'));
    expect(markedSent).toHaveLength(0);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('the Gmail route', () => {
  beforeEach(() => { gmailScope = true; });

  it('sends through Gmail against the draft row, so a reply can find its thread', async () => {
    const onSent = vi.fn();
    sheet({ onSent });
    await screen.findByLabelText('Send through Gmail');
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    fireEvent.click(sendButton());

    await waitFor(() => expect(gmailSends).toHaveLength(1));
    expect(gmailSends[0].to).toBe('ana@altaregional.org');
    // The edge function marks the row sent AND stores the thread id — the
    // client must hand it the id rather than flipping the status itself.
    expect(gmailSends[0].communicationId).toBe('comm-1');
    expect(logged[0].entry.status).toBe('draft');
    expect(markedSent).toHaveLength(0);
    await waitFor(() => expect(onSent).toHaveBeenCalledWith('comm-1'));
  });

  it('falls back to the mail app when Gmail refuses, and still does not claim a send', async () => {
    gmailSendOk = false;
    sheet();
    await screen.findByLabelText('Send through Gmail');
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    fireEvent.click(sendButton());

    await waitFor(() => expect(opened).toHaveLength(1));
    expect(await screen.findByText(/Gmail said no/)).toBeInTheDocument();
    expect(markedSent).toHaveLength(0);
    expect(logged[0].entry.status).toBe('draft');
  });
});

describe('reopening the sheet', () => {
  it('does not inherit the previous recipient', async () => {
    const { rerender } = sheet();
    fireEvent.click(screen.getByLabelText('Send to Ana Diaz'));
    expect(screen.getByLabelText('Recipient email address')).toHaveValue('ana@altaregional.org');

    rerender(
      <TrackedEmailModal
        visible={false}
        familyId="fam-1"
        title="Email about this step"
        defaultSubject="Mateo — speech assessment"
        body="x"
        contacts={CONTACTS}
        onClose={() => {}}
      />
    );
    rerender(
      <TrackedEmailModal
        visible
        familyId="fam-1"
        title="Email about this step"
        defaultSubject="Mateo — speech assessment"
        body="x"
        contacts={CONTACTS}
        onClose={() => {}}
      />
    );
    expect(screen.getByLabelText('Recipient email address')).toHaveValue('');
  });
});
