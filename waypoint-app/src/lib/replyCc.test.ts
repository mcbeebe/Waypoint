import { describe, it, expect } from 'vitest';
import { replyAllCc } from './replyCc';
import type { Communication } from '@/hooks/useCommunications';

let seq = 0;
function comm(over: Partial<Communication>): Communication {
  seq += 1;
  return {
    id: `c${seq}`,
    family_id: 'fam',
    child_id: null,
    kind: 'email',
    direction: 'incoming',
    contact: 'Ana Rivera <ana@rc.org>',
    organization: 'regional_center',
    subject: 'Re: IPP',
    body: 'Body',
    template_key: null,
    status: 'sent',
    sent_at: '2026-10-08T10:00:00Z',
    occurred_at: '2026-10-08T10:00:00Z',
    gmail_thread_id: 't1',
    gmail_message_id: `m${seq}`,
    request_id: null,
    created_at: '2026-10-08T10:00:00Z',
    ...over,
  } as Communication;
}

describe('replyAllCc', () => {
  it('keeps everyone else who was on the newest reply, never the addressee', () => {
    const r = replyAllCc(
      [
        comm({ direction: 'outgoing', cc: ['old@x.org'], sent_at: '2026-10-01T10:00:00Z' }),
        comm({ cc: ['sam@home.net', 'ana@rc.org', 'supervisor@rc.org'] }),
      ],
      'Ana@RC.org'
    );
    expect(r).toEqual({ cc: ['sam@home.net', 'supervisor@rc.org'], leftOff: 0, fromThread: true });
  });

  it('a thread recorded before 064 falls back to the family’s newest letter’s Cc', () => {
    const r = replyAllCc(
      [
        comm({ direction: 'outgoing', cc: ['first@x.org'], sent_at: '2026-10-01T10:00:00Z' }),
        comm({ direction: 'outgoing', cc: ['sam@home.net'], sent_at: '2026-10-05T10:00:00Z' }),
        comm({}),
      ],
      'ana@rc.org'
    );
    expect(r.cc).toEqual(['sam@home.net']);
  });

  it('starts empty when nobody was copied or nothing was recorded', () => {
    expect(replyAllCc([comm({})], 'ana@rc.org')).toEqual({ cc: [], leftOff: 0, fromThread: false });
  });

  it('copies at most five and says how many were left off; drops what the server would refuse', () => {
    const many = Array.from({ length: 7 }, (_, i) => `p${i}@list.org`);
    const r = replyAllCc([comm({ cc: ['not an address', ...many] })], 'ana@rc.org');
    expect(r.cc).toEqual(many.slice(0, 5));
    expect(r.leftOff).toBe(2);
  });
});
