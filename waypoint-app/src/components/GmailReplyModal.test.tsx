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

function write(text = 'Any afternoon works.') {
  fireEvent.change(screen.getByPlaceholderText(/Your reply/), { target: { value: text } });
}

/** Write, review, and confirm — the two-step send. */
async function writeAndSend() {
  write();
  fireEvent.click(screen.getByLabelText('Review and send the reply with Gmail'));
  fireEvent.click(await screen.findByLabelText('Send now'));
}

describe('GmailReplyModal — reply all (014 PR B)', () => {
  it('starts with everyone else who was on the reply, and sends to them', async () => {
    render(<GmailReplyModal {...props} />);
    expect(screen.getByText('sam@home.net')).toBeTruthy();
    expect(screen.getByText('advocate@example.org')).toBeTruthy();
    expect(screen.getByText(/Copied as on the email you’re answering, like Reply all/)).toBeTruthy();
    write();
    fireEvent.click(screen.getByLabelText('Review and send the reply with Gmail'));
    // The last look names who it goes to and who is copied, before anything is sent.
    const review = screen.getByTestId('reply-review');
    expect(review.textContent).toContain('To: ana@rc.org');
    expect(review.textContent).toContain('Cc: sam@home.net, advocate@example.org');
    expect(h.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Send now'));
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
    write();
    fireEvent.click(screen.getByLabelText('Review and send the reply with Gmail'));
    expect(screen.getByText(/Tap Add to copy that address/)).toBeTruthy();
    expect(screen.queryByTestId('reply-review')).toBeNull();

    fireEvent.click(screen.getByLabelText('Add to Cc'));
    fireEvent.click(screen.getByLabelText('Review and send the reply with Gmail'));
    fireEvent.click(await screen.findByLabelText('Send now'));
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

  it('a sender who wrote to the family alone is answered alone, even if the thread once had others', () => {
    const t = [
      comm({ id: 'o1', cc: ['sam@home.net'] }),
      comm({ id: 'r0', direction: 'incoming', gmail_message_id: 'm2', sent_at: '2026-10-05T10:00:00Z', cc: ['supervisor@rc.org'] }),
      comm({ id: 'r1', direction: 'incoming', gmail_message_id: 'm3', sent_at: '2026-10-08T10:00:00Z', cc: null }),
    ];
    render(<GmailReplyModal {...props} thread={t} />);
    expect(screen.getByText('No one')).toBeTruthy();
    expect(screen.queryByText(/like Reply all/)).toBeNull();
  });

  it('past five, everyone else is named and can be swapped in (adversarial review)', () => {
    const many = Array.from({ length: 7 }, (_, i) => `staff${i}@rc.org`);
    const t = [comm({ id: 'o1' }), comm({ id: 'r1', direction: 'incoming', gmail_message_id: 'm2', sent_at: '2026-10-08T10:00:00Z', cc: many })];
    render(<GmailReplyModal {...props} thread={t} />);
    expect(screen.getByText(/Also on that email, not copied/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Copy staff6@rc.org too'));
    expect(screen.getByText('You can copy up to 5 people — remove someone first.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove staff0@rc.org from Cc'));
    fireEvent.click(screen.getByLabelText('Copy staff6@rc.org too'));
    expect(screen.getByLabelText('Remove staff6@rc.org from Cc')).toBeTruthy();
  });

  it('an address the send cannot carry is named, and Enter on an empty Cc box says nothing', () => {
    const t = [comm({ id: 'o1' }), comm({ id: 'r1', direction: 'incoming', gmail_message_id: 'm2', sent_at: '2026-10-08T10:00:00Z', cc: ['josé@escuela.org'] })];
    render(<GmailReplyModal {...props} thread={t} />);
    expect(screen.getByText(/josé@escuela\.org\. Waypoint can’t send to that address/)).toBeTruthy();
    fireEvent.keyDown(screen.getByLabelText('Cc email address'), { key: 'Enter', code: 'Enter' });
    expect(screen.queryByText('That doesn’t look like one email address.')).toBeNull();
  });

  it('a different thread starts clean — no chips or draft carried over', () => {
    const { rerender } = render(<GmailReplyModal {...props} />);
    write('Reply for thread one');
    rerender(<GmailReplyModal {...props} visible={false} />);
    const other = [
      comm({ id: 'o9', gmail_thread_id: 't9', gmail_message_id: 'm9' }),
      comm({ id: 'r9', direction: 'incoming', gmail_thread_id: 't9', gmail_message_id: 'm10', sent_at: '2026-10-08T10:00:00Z' }),
    ];
    rerender(<GmailReplyModal {...props} thread={other} visible />);
    expect(screen.queryByText('sam@home.net')).toBeNull();
    expect((screen.getByPlaceholderText(/Your reply/) as HTMLTextAreaElement).value).toBe('');
  });
});
