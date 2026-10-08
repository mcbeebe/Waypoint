import { describe, it, expect } from 'vitest';
import { replyStrip } from './replyStrip';
import { isUnreadReply, unreadReplies } from './replyInbox';
import type { Communication } from '@/hooks/useCommunications';

let seq = 0;
/** A row as Supabase returns it once 062 is applied: `read_at` is present. */
function comm(over: Partial<Communication>): Communication {
  seq += 1;
  return {
    id: `c${seq}`, family_id: 'fam', child_id: null, kind: 'email', direction: 'outgoing',
    contact: null, organization: 'school', subject: 'Subject', body: 'Body',
    template_key: null, status: 'sent', sent_at: '2026-10-07T20:13:00Z',
    occurred_at: '2026-10-07T20:13:00Z', gmail_thread_id: 't', gmail_message_id: `m${seq}`,
    request_id: null, read_at: null, created_at: '2026-10-07T20:13:00Z',
    ...over,
  } as Communication;
}
function reply(over: Partial<Communication> = {}): Communication {
  return comm({
    direction: 'incoming', contact: 'Dana Reyes <dana@example.org>',
    subject: 'Re: IPP Meeting Request — Teddy Rivera',
    body: 'Thanks for the note — I’ll look into it and follow up by Friday.',
    sent_at: '2026-10-08T17:01:09Z', occurred_at: '2026-10-08T17:01:09Z', ...over,
  });
}
const NOW = new Date('2026-10-08T18:42:00Z');
const strip = (communications: Communication[], extra: { leadingItemId?: string; locale?: 'en' | 'es' | 'vi' } = {}) =>
  replyStrip({ communications, now: NOW, locale: extra.locale ?? 'en', leadingItemId: extra.leadingItemId });

describe('unread replies', () => {
  it('an unopened reply on a tracked thread is unread; opening it clears it', () => {
    const letter = comm({});
    const r = reply();
    expect(unreadReplies([letter, r], NOW).map((u) => u.reply.id)).toEqual([r.id]);
    expect(unreadReplies([letter, { ...r, read_at: '2026-10-08T18:00:00Z' }], NOW)).toEqual([]);
  });

  it('answering a reply clears it even if it was never opened', () => {
    const r = reply();
    const answer = comm({ sent_at: '2026-10-08T19:00:00Z', occurred_at: '2026-10-08T19:00:00Z' });
    expect(unreadReplies([r, answer], NOW)).toEqual([]);
  });

  it('before migration 062, nothing is unread — a reply is never pinned with no way to clear it', () => {
    const { read_at: _drop, ...pre062 } = reply();
    void _drop;
    const rows = [pre062 as Communication];
    expect(isUnreadReply(rows[0], NOW)).toBe(false);
    expect(unreadReplies(rows, NOW)).toEqual([]);
    expect(strip(rows)).toBeNull();
  });

  it('outgoing rows, untracked notes and hand-logged incoming entries are never "new replies"', () => {
    expect(isUnreadReply(comm({}), NOW)).toBe(false);
    expect(isUnreadReply(reply({ gmail_thread_id: null }), NOW)).toBe(false);
  });

  it('a reply older than two weeks is the record, not news — even if synced today', () => {
    expect(isUnreadReply(reply({ sent_at: '2026-09-20T09:00:00Z', occurred_at: '2026-09-20T09:00:00Z' }), NOW)).toBe(false);
    const late = reply({ sent_at: '2026-09-20T09:00:00Z', occurred_at: '2026-09-20T09:00:00Z' });
    expect(unreadReplies([late], NOW)).toEqual([]);
    const edge = reply({ sent_at: '2026-09-25T09:00:00Z', occurred_at: '2026-09-25T09:00:00Z' });
    expect(unreadReplies([edge], NOW).length).toBe(1);
  });

  it('newest first', () => {
    const older = reply({ id: 'old', sent_at: '2026-10-06T09:00:00Z', occurred_at: '2026-10-06T09:00:00Z', gmail_thread_id: 'a' });
    const newer = reply({ id: 'new', gmail_thread_id: 'b' });
    expect(unreadReplies([older, newer], NOW).map((u) => u.reply.id)).toEqual(['new', 'old']);
  });
});

describe('replyStrip', () => {
  it("announces the owner's 2026-10-08 case: one reply, quoted, opening that reply", () => {
    const r = reply();
    const s = strip([comm({}), r])!;
    expect(s.count).toBe(1);
    expect(s.kicker).toBe('NEW REPLY · TODAY');
    expect(s.title).toBe('Dana Reyes replied');
    expect(s.detail).toBe('“Thanks for the note — I’ll look into it and follow up by Friday.”');
    expect(s.cta).toBe('Read');
    expect(s.params).toEqual({ filter: 'replies', highlightId: r.id });
  });

  it('several replies: a count, the newest sender, and the Replies filter', () => {
    const a = reply({ id: 'a', gmail_thread_id: 'a' });
    const b = reply({ id: 'b', gmail_thread_id: 'b', contact: 'Lilia <l@rceb.org>', sent_at: '2026-10-07T09:00:00Z', occurred_at: '2026-10-07T09:00:00Z' });
    const c = reply({ id: 'c', gmail_thread_id: 'c', contact: 'Front Desk <fd@x.org>', sent_at: '2026-10-06T09:00:00Z', occurred_at: '2026-10-06T09:00:00Z' });
    expect(strip([a, b])!.detail).toBe('Dana Reyes and 1 other');
    const s = strip([a, b, c])!;
    expect(s.title).toBe('3 new replies');
    expect(s.detail).toBe('Dana Reyes and 2 others');
    expect(s.kicker).toBe('NEW REPLIES');
    expect(s.params).toEqual({ filter: 'replies' });
  });

  it('does not repeat the reply the One Thing card already shows', () => {
    const r = reply();
    expect(strip([r], { leadingItemId: `reply:${r.id}` })).toBeNull();
    const other = reply({ id: 'x', gmail_thread_id: 'x' });
    expect(strip([r, other], { leadingItemId: `reply:${r.id}` })!.replyId).toBe('x');
    // A non-reply lead (the overdue IHSS task) hides nothing.
    expect(strip([r], { leadingItemId: 'overdue:action:ihss' })!.replyId).toBe(r.id);
  });

  it('quotes a short reply whole, marks a cut one, and falls back to the subject when empty', () => {
    expect(strip([reply({ body: 'OK.' })])!.detail).toBe('“OK.”');
    expect(strip([reply({ body: 'x'.repeat(200) })])!.detail).toBe(`“${'x'.repeat(140)}…”`);
    expect(strip([reply({ body: '' })])!.detail).toBe('Re: IPP Meeting Request — Teddy Rivera');
  });

  it('a reply from yesterday says so', () => {
    const r = reply({ sent_at: '2026-10-07T12:00:00Z', occurred_at: '2026-10-07T12:00:00Z' });
    expect(strip([r])!.kicker).toBe('NEW REPLY · YESTERDAY');
  });

  it('is translated, never blames, and never says the family owes an answer', () => {
    const owes = /ball is in your court|your turn|waiting (on|for) you|\bowes?\b|pelota|le toca|espera su respuesta|đến lượt quý vị|chờ quý vị/i;
    const many = [reply({ id: 'a', gmail_thread_id: 'a' }), reply({ id: 'b', gmail_thread_id: 'b' })];
    const en = strip(many)!;
    for (const loc of ['en', 'es', 'vi'] as const) {
      for (const rows of [[reply()], many]) {
        const s = strip(rows, { locale: loc })!;
        for (const text of [s.kicker, s.title, s.detail, s.cta, s.accessibilityLabel]) {
          expect(text).not.toMatch(owes);
        }
      }
      if (loc !== 'en') {
        const s = strip(many, { locale: loc })!;
        expect(s.title).not.toBe(en.title);
        expect(s.cta).not.toBe(en.cta);
      }
    }
  });
});
