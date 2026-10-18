/**
 * The Paper-trail export is a Premium action (E3). Its handler is memoized,
 * and the Premium guard it calls changes identity when the family's
 * entitlement resolves or changes — so the handler must be rebuilt with it.
 * Left out of the dependency list, it kept the guard it first saw: a handler
 * built while entitlements were loading (the guard fails open) kept letting a
 * free family export, and one built while the family was free kept blocking
 * them after they upgraded.
 *
 * Everything else the handler depends on is held stable here on purpose. The
 * other screen tests build a new `family` object every render, which would
 * rebuild the handler and hide this.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ allowed: true }));

const FAMILY = { id: 'fam1', parent_first_name: 'Sam' };
const ROWS = [
  {
    id: 'o1', family_id: 'fam1', child_id: null, kind: 'email', direction: 'outgoing',
    contact: null, organization: 'school', subject: 'IPP Meeting Request', body: 'Body',
    template_key: null, status: 'sent', sent_at: '2026-10-07T20:13:00Z',
    occurred_at: '2026-10-07T20:13:00Z', gmail_thread_id: 't1', gmail_message_id: 'm1',
    request_id: null, read_at: null, created_at: '2026-10-07T20:13:00Z',
  },
];
const TOAST = { showToast: () => {} };
const COMMS = {
  communications: ROWS,
  loading: false,
  addCommunication: vi.fn(),
  deleteCommunication: vi.fn(),
  markSent: vi.fn(),
  markRead: vi.fn(),
  markSettled: vi.fn(),
  refetch: vi.fn(),
};

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: FAMILY }),
  useChildren: () => ({ children: [] }),
}));
vi.mock('@/hooks/useRequests', () => ({ useRequests: () => ({ requests: [] }) }));
vi.mock('@/hooks/useContacts', () => ({ useContacts: () => ({ contacts: [] }) }));
vi.mock('@/hooks/useCommunications', () => ({ useCommunications: () => COMMS }));
vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ connected: false, gmail: false, email: null }),
  gmailSyncReplies: vi.fn(),
  autoSyncReplies: vi.fn(),
}));
vi.mock('@/lib/googleAuth', () => ({ connectGmailWeb: vi.fn() }));
vi.mock('@/components/GmailReplyModal', () => ({ default: () => null }));
vi.mock('@/components/Toast', () => ({ useToast: () => TOAST }));
// Like the real hook, `guard` changes identity only when the entitlement does.
vi.mock('@/hooks/usePremiumGuard', async () => {
  const { useCallback } = await import('react');
  return {
    usePremiumGuard: () => {
      const allowed = h.allowed;
      const guard = useCallback(() => allowed, [allowed]);
      return { isPremium: allowed, guard };
    },
  };
});

import CommunicationLogScreen from './CommunicationLogScreen';
import { routeParams } from '../../../vitest.setup.ui';

const share = vi.fn(async () => {});

beforeEach(() => {
  share.mockClear();
  (navigator as unknown as { share: typeof share }).share = share;
  for (const k of Object.keys(routeParams)) delete routeParams[k];
});

afterEach(() => {
  delete (navigator as unknown as { share?: unknown }).share;
});

const pressShare = () => fireEvent.click(screen.getByRole('button', { name: 'Share this log' }));

describe('Paper-trail export Premium gate', () => {
  it('exports for a Premium family', async () => {
    h.allowed = true;
    render(<CommunicationLogScreen />);
    pressShare();
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  });

  it('blocks a free family from the start', async () => {
    h.allowed = false;
    render(<CommunicationLogScreen />);
    pressShare();
    await new Promise((r) => setTimeout(r, 20));
    expect(share).not.toHaveBeenCalled();
  });

  it('blocks the export once entitlements resolve to free, even though the screen mounted while the guard let everyone through', async () => {
    h.allowed = true; // loading: the guard fails open
    const { rerender } = render(<CommunicationLogScreen />);
    h.allowed = false; // resolved: this family is free
    rerender(<CommunicationLogScreen />);
    pressShare();
    await new Promise((r) => setTimeout(r, 20));
    expect(share).not.toHaveBeenCalled();
  });

  it('lets a family export right after they upgrade, without leaving the screen', async () => {
    h.allowed = false;
    const { rerender } = render(<CommunicationLogScreen />);
    pressShare();
    await new Promise((r) => setTimeout(r, 20));
    expect(share).not.toHaveBeenCalled();
    h.allowed = true; // upgraded
    rerender(<CommunicationLogScreen />);
    pressShare();
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  });
});
