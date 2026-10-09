/**
 * "Add an email thread" (initiative 014, PR D), rendered. Asserts what
 * reaches gmailFindThreads / gmailImportThread, not only what is on screen.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { GmailThreadCandidate } from '@/lib/gmail';

const h = vi.hoisted(() => ({
  find: vi.fn(),
  importThread: vi.fn(),
}));
vi.mock('@/lib/gmail', () => ({
  gmailFindThreads: h.find,
  gmailImportThread: h.importThread,
}));

import AddThreadModal from './AddThreadModal';

const RECENT = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
function candidate(over: Partial<GmailThreadCandidate> = {}): GmailThreadCandidate {
  return {
    threadId: '18c2f3a9b0d1e2f3',
    subject: 'IPP Meeting Request — Jordan Lee',
    participants: ['You', 'Ana Rivera'],
    messageCount: 4,
    lastAt: RECENT,
    lastFrom: 'Ana Rivera',
    lastFromFamily: false,
    snippet: 'Thanks — I’ll check the calendar',
    alreadyTracked: false,
    ...over,
  };
}

const props = {
  visible: true,
  onClose: vi.fn(),
  gmailConnected: true,
  onConnectGmail: vi.fn(),
  requests: [{ id: 'req1', title: 'IPP review meeting' }],
  onAdded: vi.fn(),
};

beforeEach(() => {
  h.find.mockReset();
  h.importThread.mockReset();
  h.importThread.mockResolvedValue({ ok: true, imported: 4 });
  props.onClose.mockReset();
  props.onAdded.mockReset();
  props.onConnectGmail.mockReset();
});

async function search(text: string) {
  fireEvent.change(screen.getByLabelText('Gmail link or words from the email'), { target: { value: text } });
  fireEvent.click(screen.getByLabelText('Find in Gmail'));
  await waitFor(() => expect(h.find).toHaveBeenCalledWith(text));
}

describe('AddThreadModal', () => {
  it('searches, lists matches, and adds the picked thread under the chosen label', async () => {
    h.find.mockResolvedValue({
      ok: true,
      candidates: [candidate(), candidate({ threadId: '18c2f3a9b0d1e2f4', subject: 'Intake appointment', alreadyTracked: true })],
    });
    render(<AddThreadModal {...props} />);
    await search('IPP meeting Rivera');

    expect(await screen.findByText('2 matches in your Gmail')).toBeTruthy();
    // A thread already tracked cannot be added twice.
    expect(screen.getByText('Already in your Paper Trail')).toBeTruthy();
    expect(screen.getByLabelText('Intake appointment — already in your Paper Trail').getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(screen.getByLabelText('Add IPP Meeting Request — Jordan Lee, 4 messages'));
    expect(screen.getByText('Add this thread?')).toBeTruthy();
    // Nothing is said about what Add does until the label is chosen…
    expect(screen.queryByTestId('add-thread-steps')).toBeNull();
    expect(screen.getByLabelText('Add this thread to your paper trail').getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(screen.getByLabelText('This thread is with Regional Center'));
    const steps = screen.getByTestId('add-thread-steps').textContent ?? '';
    expect(steps).toContain('All 4 messages are copied into your Paper Trail under Regional Center. Nothing is sent');
    expect(steps).toContain('shows on Home now as a reply');

    fireEvent.click(screen.getByLabelText('File under IPP review meeting'));
    fireEvent.click(screen.getByLabelText('Add this thread to your paper trail'));
    await waitFor(() => expect(props.onAdded).toHaveBeenCalledWith(4));
    expect(h.importThread).toHaveBeenCalledWith({
      threadId: '18c2f3a9b0d1e2f3',
      organization: 'regional_center',
      requestId: 'req1',
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('a link Gmail will not let apps open is explained, with search offered instead', async () => {
    h.find.mockResolvedValue({ ok: false, error: 'opaque_link', reason: 'gmail_token' });
    render(<AddThreadModal {...props} />);
    await search('https://mail.google.com/mail/u/0/#inbox/FMfcgzQXJWDsKmzLpBqvZrTnHhRwMxVb');
    expect(await screen.findByText(/Gmail doesn’t let other apps open this kind of link/)).toBeTruthy();
    expect(screen.getByLabelText('Gmail link or words from the email')).toBeTruthy();
    expect(h.importThread).not.toHaveBeenCalled();
  });

  it('an older-style link that names one thread goes straight to confirm', async () => {
    h.find.mockResolvedValue({ ok: true, candidates: [candidate()] });
    render(<AddThreadModal {...props} />);
    await search('https://mail.google.com/mail/u/0/#inbox/18c2f3a9b0d1e2f3');
    expect(await screen.findByText('Add this thread?')).toBeTruthy();
  });

  it('opened from a case, the thread is filed under that request', async () => {
    h.find.mockResolvedValue({ ok: true, candidates: [candidate()] });
    render(<AddThreadModal {...props} presetRequestId="req1" />);
    await search('IPP');
    fireEvent.click(await screen.findByLabelText('Add IPP Meeting Request — Jordan Lee, 4 messages'));
    fireEvent.click(screen.getByLabelText('This thread is with School'));
    fireEvent.click(screen.getByLabelText('Add this thread to your paper trail'));
    await waitFor(() => expect(h.importThread).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req1', organization: 'school' })));
  });

  it('a failed add keeps the sheet open and says why', async () => {
    h.find.mockResolvedValue({ ok: true, candidates: [candidate()] });
    h.importThread.mockResolvedValue({ ok: false, error: 'Couldn’t add the thread — try again.' });
    render(<AddThreadModal {...props} />);
    await search('IPP');
    fireEvent.click(await screen.findByLabelText('Add IPP Meeting Request — Jordan Lee, 4 messages'));
    fireEvent.click(screen.getByLabelText('This thread is with School'));
    fireEvent.click(screen.getByLabelText('Add this thread to your paper trail'));
    expect(await screen.findByText('Couldn’t add the thread — try again.')).toBeTruthy();
    expect(props.onAdded).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('no matches says so; without Gmail connected it offers the connection', async () => {
    h.find.mockResolvedValue({ ok: true, candidates: [] });
    const { unmount } = render(<AddThreadModal {...props} />);
    await search('nothing like this');
    expect(await screen.findByText(/No matching emails in your Gmail/)).toBeTruthy();
    unmount();

    render(<AddThreadModal {...props} gmailConnected={false} />);
    fireEvent.click(screen.getByLabelText('Connect Gmail'));
    expect(props.onConnectGmail).toHaveBeenCalled();
    expect(screen.queryByLabelText('Find in Gmail')).toBeNull();
  });
});
