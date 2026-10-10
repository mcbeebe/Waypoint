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
  it('keeps everyone else who was on the email being answered, never the addressee', () => {
    const answering = comm({ cc: ['sam@home.net', 'ana@rc.org', 'supervisor@rc.org'] });
    expect(replyAllCc(answering, [answering], 'Ana@RC.org')).toEqual({
      cc: ['sam@home.net', 'supervisor@rc.org'],
      more: [],
      unsendable: [],
    });
  });

  it('a sender who answered the family alone is answered alone — earlier lists never come back (adversarial review)', () => {
    const earlier = comm({ cc: ['advocate@x.org', 'supervisor@rc.org'], sent_at: '2026-10-01T10:00:00Z' });
    const ourLetter = comm({ direction: 'outgoing', cc: ['ex-advocate@x.org'], sent_at: '2026-10-02T10:00:00Z' });
    const privateReply = comm({ cc: null });
    expect(replyAllCc(privateReply, [earlier, ourLetter, privateReply], 'ana@rc.org').cc).toEqual([]);
    expect(replyAllCc(undefined, [earlier], 'ana@rc.org').cc).toEqual([]);
  });

  it('past five, the family’s own earlier Cc comes first and everyone else is named, not lost', () => {
    const colleagues = Array.from({ length: 6 }, (_, i) => `staff${i}@rc.org`);
    const ourLetter = comm({ direction: 'outgoing', cc: ['advocate@example.org'] });
    const answering = comm({ cc: [...colleagues, 'advocate@example.org'] });
    const r = replyAllCc(answering, [ourLetter, answering], 'ana@rc.org');
    expect(r.cc[0]).toBe('advocate@example.org');
    expect(r.cc).toHaveLength(5);
    expect(r.more).toEqual(['staff4@rc.org', 'staff5@rc.org']);
  });

  it('a draft that never went out does not count as someone the family copied', () => {
    const draft = comm({ direction: 'outgoing', status: 'draft', cc: ['p6@x.org'] });
    const answering = comm({ cc: ['p1@x.org', 'p2@x.org', 'p3@x.org', 'p4@x.org', 'p5@x.org', 'p6@x.org'] });
    expect(replyAllCc(answering, [draft, answering], 'ana@rc.org').more).toEqual(['p6@x.org']);
  });

  it('an address the send cannot carry is named, never dropped silently', () => {
    const answering = comm({ cc: ['josé@escuela.org', 'sam@home.net'] });
    expect(replyAllCc(answering, [answering], 'ana@rc.org')).toEqual({
      cc: ['sam@home.net'],
      more: [],
      unsendable: ['josé@escuela.org'],
    });
  });
});
