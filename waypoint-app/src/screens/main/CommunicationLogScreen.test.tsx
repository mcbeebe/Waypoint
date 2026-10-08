/**
 * Paper Trail read state (062): the unread marker, the Replies filter, and
 * that opening a reply — by tapping it, or by arriving from the Home strip —
 * records it as read. The hook is stubbed; the screen is real.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  rows: [] as any[],
  markRead: null as any,
}));

function comm(over: Record<string, unknown>) {
  return {
    id: 'c?', family_id: 'fam1', child_id: null, kind: 'email', direction: 'outgoing',
    contact: null, organization: 'school', subject: 'IPP Meeting Request — Teddy Beebe',
    body: 'Body', template_key: null, status: 'sent', sent_at: '2026-10-07T20:13:00Z',
    occurred_at: '2026-10-07T20:13:00Z', gmail_thread_id: 't1', gmail_message_id: 'm1',
    request_id: null, read_at: null, created_at: '2026-10-07T20:13:00Z',
    ...over,
  };
}
const reply = (over: Record<string, unknown> = {}) =>
  comm({
    id: 'r1', direction: 'incoming', subject: 'Re: IPP Meeting Request — Teddy Beebe',
    contact: 'Caitriona Leonard <c@x.com>', gmail_message_id: 'm2',
    occurred_at: '2026-10-08T17:01:09Z', sent_at: '2026-10-08T17:01:09Z', ...over,
  });

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', parent_first_name: 'Mike' } }),
  useChildren: () => ({ children: [] }),
}));
vi.mock('@/hooks/useRequests', () => ({ useRequests: () => ({ requests: [] }) }));
vi.mock('@/hooks/useCommunications', () => ({
  useCommunications: () => ({
    communications: h.rows,
    loading: false,
    addCommunication: vi.fn(),
    deleteCommunication: vi.fn(),
    markSent: vi.fn(),
    markRead: h.markRead,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ connected: false, gmail: false, email: null }),
  gmailSyncReplies: vi.fn(),
  autoSyncReplies: vi.fn(),
}));
vi.mock('@/lib/googleAuth', () => ({ connectGmailWeb: vi.fn() }));
vi.mock('@/components/GmailReplyModal', () => ({ default: () => null }));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: () => {} }) }));
vi.mock('@/hooks/usePremiumGuard', () => ({ usePremiumGuard: () => ({ guard: () => true }) }));

import CommunicationLogScreen from './CommunicationLogScreen';
import { routeParams } from '../../../vitest.setup.ui';

beforeEach(() => {
  h.markRead = vi.fn(async () => true);
  h.rows = [comm({ id: 'o1' }), reply()];
  for (const k of Object.keys(routeParams)) delete routeParams[k];
});

describe('Paper Trail read state', () => {
  it('marks an unread reply NEW and counts it on the Replies filter', () => {
    render(<CommunicationLogScreen />);
    expect(screen.getByTestId('unread-r1')).toBeTruthy();
    expect(screen.getByText('💬 Replies (1 new)')).toBeTruthy();
    // A screen reader hears it too, not only a colour.
    expect(screen.getByRole('button', { name: /^New reply, unread\. Email: Re: IPP Meeting/ })).toBeTruthy();
  });

  it('a read reply carries no marker, and the filter drops the count', () => {
    h.rows = [comm({ id: 'o1' }), reply({ read_at: '2026-10-08T18:00:00Z' })];
    render(<CommunicationLogScreen />);
    expect(screen.queryByTestId('unread-r1')).toBeNull();
    expect(screen.getByText('💬 Replies')).toBeTruthy();
  });

  it('opening an unread reply records it as read — once, and never for a letter', () => {
    render(<CommunicationLogScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Email: IPP Meeting Request/ }));
    expect(h.markRead).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Email: Re: IPP Meeting/ }));
    expect(h.markRead).toHaveBeenCalledWith('r1');
    expect(h.markRead).toHaveBeenCalledTimes(1);
  });

  it('the Home strip lands on Replies with its reply open, and that reads it', async () => {
    routeParams.filter = 'replies';
    routeParams.highlightId = 'r1';
    render(<CommunicationLogScreen />);
    await waitFor(() => expect(h.markRead).toHaveBeenCalledWith('r1'));
    // Only replies are listed: the outgoing letter is filtered out.
    expect(screen.queryByRole('button', { name: /Email: IPP Meeting Request/ })).toBeNull();
    // The reply is expanded: its body is on screen.
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('before migration 062 there is no read state: no marker, no count, no write', () => {
    const { read_at: _a, ...letter } = comm({ id: 'o1' });
    const { read_at: _b, ...pre062 } = reply();
    void _a; void _b;
    h.rows = [letter, pre062];
    render(<CommunicationLogScreen />);
    expect(screen.queryByTestId('unread-r1')).toBeNull();
    expect(screen.getByText('💬 Replies')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Email: Re: IPP Meeting/ }));
    expect(h.markRead).not.toHaveBeenCalled();
  });
});
