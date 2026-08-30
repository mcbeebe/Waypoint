import { describe, it, expect } from 'vitest';
import {
  pendingReplyPushes,
  groupByFamily,
  replyCopy,
  pushLocale,
  type ReplyRow,
} from './replyPush';

const row = (over: Partial<ReplyRow>): ReplyRow => ({
  id: Math.random().toString(36).slice(2),
  family_id: 'famA',
  direction: 'incoming',
  gmail_thread_id: 't1',
  occurred_at: '2026-08-30T12:00:00Z',
  notified_at: null,
  ...over,
});

describe('pendingReplyPushes', () => {
  it('a fresh incoming reply is pending', () => {
    expect(pendingReplyPushes([row({})])).toHaveLength(1);
  });

  it('an already-notified reply is not pending (fire exactly once)', () => {
    expect(pendingReplyPushes([row({ notified_at: '2026-08-30T13:00:00Z' })])).toEqual([]);
  });

  it('outgoing rows are never pending', () => {
    expect(pendingReplyPushes([row({ direction: 'outgoing' })])).toEqual([]);
  });

  it('a reply the family already answered is suppressed', () => {
    // incoming at noon, the family wrote back at 1pm on the same thread
    const rows = [
      row({ id: 'in', direction: 'incoming', occurred_at: '2026-08-30T12:00:00Z' }),
      row({ id: 'out', direction: 'outgoing', occurred_at: '2026-08-30T13:00:00Z' }),
    ];
    expect(pendingReplyPushes(rows)).toEqual([]);
  });

  it('an earlier outgoing does NOT count as answering a later reply', () => {
    // the family wrote first (their request), the reply came after → still owed
    const rows = [
      row({ id: 'out', direction: 'outgoing', occurred_at: '2026-08-30T10:00:00Z' }),
      row({ id: 'in', direction: 'incoming', occurred_at: '2026-08-30T12:00:00Z' }),
    ];
    expect(pendingReplyPushes(rows).map((r) => r.id)).toEqual(['in']);
  });

  it('an answer on a DIFFERENT thread does not suppress the reply', () => {
    const rows = [
      row({ id: 'in', gmail_thread_id: 't1', occurred_at: '2026-08-30T12:00:00Z' }),
      row({ id: 'out', direction: 'outgoing', gmail_thread_id: 't2', occurred_at: '2026-08-30T13:00:00Z' }),
    ];
    expect(pendingReplyPushes(rows).map((r) => r.id)).toEqual(['in']);
  });

  it('a reply with no thread id is pending (unmatchable to an answer)', () => {
    expect(pendingReplyPushes([row({ gmail_thread_id: null })])).toHaveLength(1);
  });
});

describe('groupByFamily', () => {
  it('splits pending rows per family, preserving order', () => {
    const rows = [
      row({ id: '1', family_id: 'A' }),
      row({ id: '2', family_id: 'B' }),
      row({ id: '3', family_id: 'A' }),
    ];
    const g = groupByFamily(rows);
    expect([...g.keys()]).toEqual(['A', 'B']);
    expect(g.get('A')!.map((r) => r.id)).toEqual(['1', '3']);
  });
});

describe('pushLocale', () => {
  it('normalizes to the three the app speaks', () => {
    expect(pushLocale('es')).toBe('es');
    expect(pushLocale('es-MX')).toBe('es');
    expect(pushLocale('vi')).toBe('vi');
    expect(pushLocale('en-US')).toBe('en');
    expect(pushLocale(null)).toBe('en');
    expect(pushLocale('fr')).toBe('en');
  });
});

describe('replyCopy', () => {
  it('never reads "1 replies" — singular and plural are distinct', () => {
    expect(replyCopy(1, 'en').title).toBe('You have a reply');
    expect(replyCopy(3, 'en').title).toBe('You have 3 new replies');
  });

  it('is status-framed, never blame — no "they" in any locale', () => {
    for (const loc of ['en', 'es', 'vi'] as const) {
      for (const n of [1, 2]) {
        const { title, body } = replyCopy(n, loc);
        expect(`${title} ${body}`.toLowerCase()).not.toMatch(/\bthey\b|\bellos\b|\bhọ\b/);
      }
    }
  });

  it('speaks all three languages', () => {
    expect(replyCopy(1, 'es').title).toBe('Tiene una respuesta');
    expect(replyCopy(1, 'vi').title).toBe('Quý vị có một thư trả lời');
  });

  it('clamps a nonsensical count to at least one', () => {
    expect(replyCopy(0, 'en').title).toBe('You have a reply');
  });
});
