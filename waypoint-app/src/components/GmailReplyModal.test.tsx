/**
 * The Paper Trail reply composer keeps the people who were copied
 * (initiative 014, PR B). Asserts what reaches gmailSend.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Communication } from '@/hooks/useCommunications';

const h = vi.hoisted(() => ({
  send: vi.fn(async (_input: Record<string, unknown>) => ({ ok: true }) as { ok: boolean; error?: string }),
}));
vi.mock('@/lib/gmail', () => ({
  gmailSend: h.send,
  draftGmailReply: vi.fn(async () => ({ ok: true, reply: 'Thanks!' })),
}));
vi.mock('@/lib/letters', () => ({ analyzeEmail: vi.fn(async () => ({ analysis: null })) }));

import GmailReplyModal from './GmailReplyModal';

function comm(over: Partial<Communication>): Communication {
  return {
    id: 'c1', family_id: 'fam', child_id: null, kind: 'email', direction: 'outgoing',
    contact: 'ana@rc.org', organization: 'regional_center', subject: 'IPP Meeting Request',
    body: 'Hello', template_key: null, status: 'sent', sent_at: '2026-10-01T10:00:00Z',
    occurred_at: '2026-10-01T10:00:00Z', gmail_thread_id: 't1', gmail_message_id: 'm1',
    request_id: null, created_at: '2026-10-01T10:00:00Z', ...over,
  } as Communication;
}

const thread = [
  comm({ id: 'o1', cc: ['sam@home.net'] }),
  comm({
    id: 'r1', direction: 'incoming', contact: 'Ana Rivera <ana@rc.org>', gmail_message_id: 'm2',
    sent_at: '2026-10-08T10:00:00Z', occurred_at: '2026-10-08T10:00:00Z',
    cc: ['sam@home.net', 'advocate@example.org'],
  }),
];

const props = { visible: true, thread, onClose: vi.fn(), onSent: vi.fn() };

beforeEach(() => {
  h.send.mockClear();
});

async function writeAndSend() {
  fireEvent.change(screen.getByPlaceholderText(/Your reply/), { target: { value: 'Any afternoon works.' } });
  fireEvent.click(screen.getByLabelText('Send the reply with Gmail'));
}

describe('GmailReplyModal — reply all (014 PR B)', () => {
  it('starts with everyone else who was on the reply, and sends to them', async () => {
    render(<GmailReplyModal {...props} />);
    expect(screen.getByText('sam@home.net')).toBeTruthy();
    expect(screen.getByText('advocate@example.org')).toBeTruthy();
    expect(screen.getByText(/Kept from the thread, like Reply all/)).toBeTruthy();
    await writeAndSend();
    await waitFor(() => expect(h.send).toHaveBeenCalledTimes(1));
    expect(h.send.mock.calls[0][0]).toMatchObject({
      to: 'ana@rc.org',
      cc: ['sam@home.net', 'advocate@example.org'],
      replyToCommunicationId: 'o1',
    });
  });

  it('a removed person is not sent; a typed one is added; a half-typed one blocks Send', async () => {
    render(<GmailReplyModal {...props} />);
    fireEvent.click(screen.getByLabelText('Remove advocate@example.org from Cc'));
    fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'grandma@example.org' } });
    await writeAndSend();
    expect(screen.getByText(/Tap Add to copy that address/)).toBeTruthy();
    expect(h.send).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Add to Cc'));
    fireEvent.click(screen.getByLabelText('Send the reply with Gmail'));
    await waitFor(() => expect(h.send).toHaveBeenCalledTimes(1));
    expect(h.send.mock.calls[0][0]).toMatchObject({ cc: ['sam@home.net', 'grandma@example.org'] });
  });

  it('refuses what is not one address, and the addressee cannot also be copied', () => {
    render(<GmailReplyModal {...props} />);
    fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'a@x.com, b@y.com' } });
    fireEvent.click(screen.getByLabelText('Add to Cc'));
    expect(screen.getByText('That doesn’t look like one email address.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Cc email address'), { target: { value: 'ANA@rc.org' } });
    fireEvent.click(screen.getByLabelText('Add to Cc'));
    expect(screen.getByText('They’re already on this email.')).toBeTruthy();
  });

  it('a thread with nobody recorded starts with no one copied and no "kept" note', () => {
    render(<GmailReplyModal {...props} thread={[comm({ id: 'o1' }), comm({ id: 'r1', direction: 'incoming', gmail_message_id: 'm2', sent_at: '2026-10-08T10:00:00Z' })]} />);
    expect(screen.getByText('No one')).toBeTruthy();
    expect(screen.queryByText(/Kept from the thread/)).toBeNull();
  });
});
