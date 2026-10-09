import { describe, it, expect } from 'vitest';
import { findUnansweredReply, unreadReplies } from './replyInbox';
import type { Communication } from '@/hooks/useCommunications';

function comm(over: Partial<Communication>): Communication {
  return {
    id: Math.random().toString(36).slice(2),
    family_id: 'fam',
    child_id: null,
    kind: 'email',
    direction: 'outgoing',
    contact: null,
    organization: 'regional_center',
    subject: 'Subject',
    body: 'Body',
    template_key: null,
    status: 'sent',
    sent_at: '2026-08-26T10:00:00Z',
    occurred_at: '2026-08-26T10:00:00Z',
    gmail_thread_id: 't1',
    gmail_message_id: null,
    created_at: '2026-08-26T10:00:00Z',
    ...over,
  } as Communication;
}

describe('findUnansweredReply', () => {
  it('surfaces the newest incoming reply with no newer outgoing on its thread', () => {
    const r = findUnansweredReply([
      comm({ direction: 'outgoing', sent_at: '2026-08-26T10:00:00Z' }),
      comm({
        direction: 'incoming',
        contact: 'Lilia Talavera <lilia@rceb.org>',
        body: '  Happy to   help. To start the referral…  ',
        sent_at: '2026-08-28T09:00:00Z',
      }),
    ]);
    expect(r).not.toBeNull();
    expect(r!.senderName).toBe('Lilia Talavera');
    expect(r!.snippet).toBe('Happy to help. To start the referral…');
  });

  it('goes quiet once the family replied after the incoming message', () => {
    const r = findUnansweredReply([
      comm({ direction: 'incoming', sent_at: '2026-08-28T09:00:00Z' }),
      comm({ direction: 'outgoing', sent_at: '2026-08-28T11:00:00Z' }),
    ]);
    expect(r).toBeNull();
  });

  it('threads are independent: an answer on one does not silence another', () => {
    const r = findUnansweredReply([
      comm({ direction: 'incoming', gmail_thread_id: 't1', sent_at: '2026-08-28T09:00:00Z' }),
      comm({ direction: 'outgoing', gmail_thread_id: 't1', sent_at: '2026-08-28T11:00:00Z' }),
      comm({
        direction: 'incoming',
        gmail_thread_id: 't2',
        contact: 'records@district.org',
        sent_at: '2026-08-27T09:00:00Z',
      }),
    ]);
    expect(r).not.toBeNull();
    expect(r!.reply.gmail_thread_id).toBe('t2');
  });

  it('ignores non-Gmail entries and returns null when nothing is waiting', () => {
    expect(
      findUnansweredReply([
        comm({ direction: 'incoming', gmail_thread_id: null }),
        comm({ direction: 'outgoing' }),
      ])
    ).toBeNull();
    expect(findUnansweredReply([])).toBeNull();
  });
});

describe('a settled message needs no answer (065, initiative 014)', () => {
  it('history brought in by adding a thread never takes the Home card or the strip', () => {
    const settled = comm({
      direction: 'incoming',
      sent_at: '2026-07-01T09:00:00Z',
      read_at: null,
      settled_at: '2026-10-09T18:00:00Z',
    });
    expect(findUnansweredReply([settled])).toBeNull();
    expect(unreadReplies([settled], new Date('2026-07-02T09:00:00Z'))).toEqual([]);
  });

  it('the unsettled newest message on that added thread still does', () => {
    const r = findUnansweredReply([
      comm({ id: 'old', direction: 'incoming', sent_at: '2026-07-01T09:00:00Z', settled_at: '2026-10-09T18:00:00Z' }),
      comm({ id: 'new', direction: 'incoming', sent_at: '2026-10-08T09:00:00Z', settled_at: null }),
    ]);
    expect(r?.reply.id).toBe('new');
  });

  it('a reply synced weeks late is still news — lateness alone settles nothing (adversarial review)', () => {
    const r = findUnansweredReply([
      comm({ direction: 'incoming', sent_at: '2026-09-01T09:00:00Z', created_at: '2026-09-20T09:00:00Z' }),
    ]);
    expect(r).not.toBeNull();
  });

  it('before 065 the key is absent and nothing is settled', () => {
    const r = findUnansweredReply([comm({ direction: 'incoming', sent_at: '2026-09-01T09:00:00Z' })]);
    expect(r).not.toBeNull();
  });
});
