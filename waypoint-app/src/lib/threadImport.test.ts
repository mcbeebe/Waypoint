/**
 * Adding a Gmail thread to the paper trail (supabase/functions/_shared/
 * threadImport.ts). The gmail Edge Function has no CI, so the pure rules are
 * pinned here.
 */
import { describe, it, expect } from 'vitest';
import {
  parseGmailInput,
  planImport,
  summarizeThread,
  displayName,
  isFromFamily,
  MAX_IMPORT_MESSAGES,
  IMPORT_NEW_REPLY_DAYS,
  type ImportMessage,
} from '../../supabase/functions/_shared/threadImport';
import { NEW_REPLY_DAYS } from './replyInbox';

const SELF = 'parent@gmail.com';
const NOW = new Date('2026-10-09T18:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function msg(over: Partial<ImportMessage>): ImportMessage {
  return {
    id: 'm1',
    internalDate: NOW.getTime() - 3 * DAY,
    from: 'Ana Rivera <ana@rc.org>',
    to: 'Parent <parent@gmail.com>',
    cc: '',
    subject: 'IPP Meeting Request — Jordan Lee',
    text: 'Body',
    labelIds: ['INBOX'],
    ...over,
  };
}

describe('parseGmailInput', () => {
  it('opens an older-style Gmail link or a bare thread id directly', () => {
    expect(parseGmailInput('https://mail.google.com/mail/u/0/#inbox/18C2F3A9B0D1E2F3')).toEqual({
      kind: 'thread',
      id: '18c2f3a9b0d1e2f3',
    });
    expect(parseGmailInput('https://mail.google.com/mail/u/1/#label/School%2FIEP/18c2f3a9b0d1e2f3')).toEqual({
      kind: 'thread',
      id: '18c2f3a9b0d1e2f3',
    });
    expect(parseGmailInput('mail.google.com/mail/?th=18c2f3a9b0d1e2f3')).toEqual({
      kind: 'thread',
      id: '18c2f3a9b0d1e2f3',
    });
    expect(parseGmailInput(' 18c2f3a9b0d1e2f3 ')).toEqual({ kind: 'thread', id: '18c2f3a9b0d1e2f3' });
    expect(parseGmailInput('https://mail.google.com/mail/u/0/?ik=x&view=pt&permthid=thread-f%3A1784256312533705459')).toEqual({
      kind: 'thread',
      id: '18c2f3a9b0d1e2f3',
    });
  });

  it('a claim or case number typed alone is searched for, not taken as a thread id', () => {
    expect(parseGmailInput('123456789012')).toEqual({ kind: 'search', q: '123456789012' });
    expect(parseGmailInput('1234567890123456')).toEqual({ kind: 'search', q: '1234567890123456' });
  });

  it('reads the decimal thread-f form, and treats thread-a links (what Gmail hands apps) as unreadable', () => {
    expect(parseGmailInput('https://mail.google.com/mail/u/0/#inbox/thread-f:1784256312533705459')).toEqual({
      kind: 'thread',
      id: '18c2f3a9b0d1e2f3',
    });
    expect(
      parseGmailInput('https://mail.google.com/mail/u/0/#inbox/thread-f:1784256312533705459|msg-f:1784256312533705459')
    ).toEqual({ kind: 'thread', id: '18c2f3a9b0d1e2f3' });
    expect(
      parseGmailInput('https://mail.google.com/mail/?authuser=parent@gmail.com#all/thread-a:r-6624789553520419400')
    ).toEqual({ kind: 'opaque', reason: 'gmail_token' });
  });

  it('reports today’s encrypted Gmail links as unreadable instead of searching for them', () => {
    expect(parseGmailInput('https://mail.google.com/mail/u/0/#inbox/FMfcgzQXJWDsKmzLpBqvZrTnHhRwMxVb')).toEqual({
      kind: 'opaque',
      reason: 'gmail_token',
    });
  });

  it('a link that is not Gmail is unreadable too', () => {
    expect(parseGmailInput('https://outlook.live.com/mail/0/inbox/id/AAQk')).toEqual({
      kind: 'opaque',
      reason: 'not_gmail',
    });
    expect(parseGmailInput('https://mail.google.com.evil.example/#inbox/18c2f3a9b0d1e2f3')).toEqual({
      kind: 'opaque',
      reason: 'not_gmail',
    });
  });

  it('anything else is search words, bounded', () => {
    expect(parseGmailInput('IPP meeting Rivera')).toEqual({ kind: 'search', q: 'IPP meeting Rivera' });
    expect(parseGmailInput('x'.repeat(500))).toEqual({ kind: 'search', q: 'x'.repeat(200) });
    expect(parseGmailInput('   ')).toEqual({ kind: 'empty' });
  });
});

describe('isFromFamily', () => {
  it('is the SENT label or the connected address under any Gmail spelling', () => {
    expect(isFromFamily({ from: 'Ana <ana@rc.org>', labelIds: ['SENT'] }, SELF)).toBe(true);
    expect(isFromFamily({ from: 'Me <Par.ent+iep@gmail.com>', labelIds: [] }, SELF)).toBe(true);
    expect(isFromFamily({ from: 'Ana <ana@rc.org>', labelIds: ['INBOX'] }, SELF)).toBe(false);
  });
});

describe('planImport', () => {
  const base = { threadId: 't1', self: SELF, knownIds: new Set<string>(), organization: 'regional_center', now: NOW };

  it('files the family’s messages as sent and the agency’s as replies, with the chosen label', () => {
    const rows = planImport({
      ...base,
      requestId: 'req1',
      messages: [
        msg({ id: 'a', internalDate: NOW.getTime() - 9 * DAY, from: 'Parent <parent@gmail.com>', to: 'Ana Rivera <ana@rc.org>', cc: 'Sam <sam@home.net>', labelIds: ['SENT'] }),
        msg({ id: 'b', internalDate: NOW.getTime() - 1 * DAY, cc: 'sam@home.net' }),
      ],
    });
    expect(rows.map((r) => [r.gmail_message_id, r.direction])).toEqual([
      ['a', 'outgoing'],
      ['b', 'incoming'],
    ]);
    expect(rows[0]).toMatchObject({
      contact: 'Ana Rivera <ana@rc.org>',
      cc: ['sam@home.net'],
      organization: 'regional_center',
      request_id: 'req1',
      gmail_thread_id: 't1',
      status: 'sent',
    });
    expect(rows[1]).toMatchObject({ contact: 'Ana Rivera <ana@rc.org>', cc: ['sam@home.net'] });
  });

  it('only a fresh, newest message from them is left unread — everything else is history', () => {
    const fresh = planImport({
      ...base,
      messages: [
        msg({ id: 'old', internalDate: NOW.getTime() - 30 * DAY }),
        msg({ id: 'mine', internalDate: NOW.getTime() - 20 * DAY, labelIds: ['SENT'], from: SELF }),
        msg({ id: 'new', internalDate: NOW.getTime() - 2 * DAY }),
      ],
    });
    expect(fresh.find((r) => r.gmail_message_id === 'old')?.read_at).toBe(NOW.toISOString());
    expect(fresh.find((r) => r.gmail_message_id === 'mine')?.read_at).toBeNull();
    expect(fresh.find((r) => r.gmail_message_id === 'new')?.read_at).toBeNull();

    const stale = planImport({ ...base, messages: [msg({ id: 'x', internalDate: NOW.getTime() - 15 * DAY })] });
    expect(stale[0].read_at).toBe(NOW.toISOString());

    // The newest is the family's own: nothing waits on them.
    const answered = planImport({
      ...base,
      messages: [msg({ id: 'r', internalDate: NOW.getTime() - 3 * DAY }), msg({ id: 's', internalDate: NOW.getTime() - 1 * DAY, labelIds: ['SENT'] })],
    });
    expect(answered.find((r) => r.gmail_message_id === 'r')?.read_at).toBe(NOW.toISOString());
  });

  it('adding the same thread twice adds nothing, and empty messages are skipped', () => {
    const messages = [msg({ id: 'a' }), msg({ id: 'b', text: '   ' })];
    expect(planImport({ ...base, messages, knownIds: new Set(['a']) })).toEqual([]);
  });

  it('a very long thread keeps its first message — the ask — and the newest after it', () => {
    const messages = Array.from({ length: 70 }, (_, i) => msg({ id: `m${i}`, internalDate: NOW.getTime() - (70 - i) * 60_000 }));
    const rows = planImport({ ...base, messages });
    expect(rows).toHaveLength(MAX_IMPORT_MESSAGES);
    expect(rows[0].gmail_message_id).toBe('m0');
    expect(rows[1].gmail_message_id).toBe('m21');
    expect(rows[rows.length - 1].gmail_message_id).toBe('m69');
  });

  it('never imports a Gmail draft as a sent letter, nor anything in the trash (adversarial review)', () => {
    const rows = planImport({
      ...base,
      messages: [
        msg({ id: 'ask', internalDate: NOW.getTime() - 3 * DAY }),
        msg({ id: 'draft', internalDate: NOW.getTime() - 1 * DAY, from: SELF, labelIds: ['DRAFT'] }),
        msg({ id: 'binned', internalDate: NOW.getTime() - 2 * DAY, labelIds: ['TRASH'] }),
      ],
    });
    expect(rows.map((r) => r.gmail_message_id)).toEqual(['ask']);
    // So the agency's message is still the newest — and still news.
    expect(rows[0]).toMatchObject({ read_at: null, settled_at: null });
  });

  it('history is settled as well as read, so no screen asks for an answer to it (065)', () => {
    const rows = planImport({
      ...base,
      messages: [
        msg({ id: 'old', internalDate: NOW.getTime() - 30 * DAY }),
        msg({ id: 'mine', internalDate: NOW.getTime() - 20 * DAY, labelIds: ['SENT'], from: SELF }),
        msg({ id: 'new', internalDate: NOW.getTime() - 2 * DAY }),
      ],
    });
    const by = Object.fromEntries(rows.map((r) => [r.gmail_message_id, r]));
    expect(by.old).toMatchObject({ read_at: NOW.toISOString(), settled_at: NOW.toISOString() });
    expect(by.mine).toMatchObject({ read_at: null, settled_at: null });
    expect(by.new).toMatchObject({ read_at: null, settled_at: null });
  });

  it('uses the same 14-day window as the app’s NEW marker', () => {
    expect(IMPORT_NEW_REPLY_DAYS).toBe(NEW_REPLY_DAYS);
  });
});

describe('summarizeThread', () => {
  it('lists who is on it, oldest first, with the family as "You", and decodes the snippet', () => {
    const c = summarizeThread({
      threadId: 't1',
      snippet: 'Thanks — I&#39;ll check the calendar &amp; get back to you',
      self: SELF,
      tracked: new Set(['t9']),
      messages: [
        { from: 'Parent <parent@gmail.com>', subject: 'IPP Meeting Request', internalDate: 1, labelIds: ['SENT'] },
        { from: '"Ana Rivera" <ana@rc.org>', subject: 'Re: IPP Meeting Request', internalDate: 2, labelIds: ['INBOX'] },
      ],
    });
    expect(c).toMatchObject({
      subject: 'IPP Meeting Request',
      participants: ['You', 'Ana Rivera'],
      messageCount: 2,
      lastFrom: 'Ana Rivera',
      lastFromFamily: false,
      snippet: 'Thanks — I’ll check the calendar & get back to you'.replace('’', "'"),
      alreadyTracked: false,
    });
  });

  it('counts and attributes only delivered messages — a draft is not "yours, newest"', () => {
    const c = summarizeThread({
      threadId: 't1',
      snippet: '',
      self: SELF,
      tracked: new Set(),
      messages: [
        { from: 'Ana <ana@rc.org>', subject: 'Consent form', internalDate: 1, labelIds: ['INBOX'] },
        { from: SELF, subject: 'Re: Consent form', internalDate: 2, labelIds: ['DRAFT'] },
      ],
    });
    expect(c).toMatchObject({ messageCount: 1, lastFrom: 'Ana', lastFromFamily: false });
  });

  it('marks a thread already in the paper trail, and an empty thread is skipped', () => {
    expect(
      summarizeThread({ threadId: 't9', snippet: '', self: SELF, tracked: new Set(['t9']), messages: [msg({})] })?.alreadyTracked
    ).toBe(true);
    expect(summarizeThread({ threadId: 't0', snippet: '', self: SELF, tracked: new Set(), messages: [] })).toBeNull();
  });
});

describe('displayName', () => {
  it('prefers the display name and falls back to the address', () => {
    expect(displayName('"Rivera, Ana" <ana@rc.org>')).toBe('Rivera, Ana');
    expect(displayName('ana@rc.org')).toBe('ana@rc.org');
  });
});
