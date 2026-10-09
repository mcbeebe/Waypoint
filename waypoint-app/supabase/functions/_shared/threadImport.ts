/**
 * Adding an existing Gmail thread to the paper trail (initiative 014, PR D).
 *
 * PURE — no Deno globals, no fetch — so `src/lib/threadImport.test.ts` covers
 * it. The gmail Edge Function does the I/O around it and has no tests of its
 * own.
 *
 * Why a link alone is not enough: today's Gmail web links
 * (`#inbox/FMfcgz…`) are opaque per-account tokens that the Gmail API cannot
 * open and never returns (googleworkspace/cli#858). Only the older form,
 * `#inbox/<16 hex>`, carries the API thread id. So the find box takes a link
 * OR search words, and an unreadable link says so instead of failing quietly.
 */
import { addressesIn, mailboxKey, otherRecipients } from './recipients.ts';

/**
 * Most messages copied from one thread: its first (the ask that may have
 * started a statutory clock) and the newest after it.
 */
export const MAX_IMPORT_MESSAGES = 50;
/** Most threads a search lists. */
export const MAX_FIND_RESULTS = 10;
/** Must equal NEW_REPLY_DAYS in src/lib/replyInbox.ts (a test holds them equal). */
export const IMPORT_NEW_REPLY_DAYS = 14;

const THREAD_ID_RE = /^[0-9a-f]{12,16}$/i;

/** What the find box was given. */
export type GmailInput =
  | { kind: 'empty' }
  | { kind: 'thread'; id: string }
  | { kind: 'opaque'; reason: 'gmail_token' | 'not_gmail' }
  | { kind: 'search'; q: string };

/** Whether `id` has the shape of a Gmail API thread id. */
export function isThreadId(id: unknown): boolean {
  return typeof id === 'string' && THREAD_ID_RE.test(id);
}

/**
 * Read the find box: a legacy Gmail link or bare thread id opens that thread;
 * any other link is reported as unreadable (never searched for as text);
 * anything else is Gmail search words.
 */
export function parseGmailInput(raw: string): GmailInput {
  const text = raw.trim();
  if (!text) return { kind: 'empty' };
  // Bare, it must look like an id and not like a claim or case number: a
  // 12–16 digit number typed alone is searched for.
  if (isThreadId(text) && /[a-f]/i.test(text)) return { kind: 'thread', id: text.toLowerCase() };
  if (!/^https?:\/\//i.test(text) && !/^mail\.google\.com\//i.test(text)) {
    return { kind: 'search', q: text.slice(0, 200) };
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { kind: 'opaque', reason: 'not_gmail' };
  }
  if (url.hostname.toLowerCase() !== 'mail.google.com') return { kind: 'opaque', reason: 'not_gmail' };
  const th = url.searchParams.get('th');
  if (th && isThreadId(th)) return { kind: 'thread', id: th.toLowerCase() };
  // The print view: ?view=pt&permthid=thread-f:<decimal>
  const permthid = fromDecimal(url.searchParams.get('permthid') ?? '');
  if (permthid) return { kind: 'thread', id: permthid };
  let hash = url.hash.replace(/^#/, '');
  try {
    hash = decodeURIComponent(hash);
  } catch {
    // keep the raw fragment
  }
  const last = hash.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  if (isThreadId(last)) return { kind: 'thread', id: last.toLowerCase() };
  // `thread-f:<decimal>` is the same 64-bit id written in decimal (IMAP's
  // X-GM-THRID). `thread-a:r-…` and `FMfcgz…` are not: they are opaque
  // tokens, and the viewUrl the Gmail API itself hands out is a `thread-a`
  // one (checked against a real mailbox, 2026-10-09). A wrong conversion
  // would only find nothing — the function opens the id, it never trusts it.
  const decimal = fromDecimal(last);
  if (decimal) return { kind: 'thread', id: decimal };
  return { kind: 'opaque', reason: 'gmail_token' };
}

/** `thread-f:<decimal>` (optionally `|msg-f:…`) → the hex thread id, or null. */
function fromDecimal(value: string): string | null {
  const match = value.match(/^thread-f:(\d{1,20})(?:\|.*)?$/);
  if (!match) return null;
  const hex = BigInt(match[1]).toString(16);
  return isThreadId(hex) ? hex : null;
}

/** One message of a thread, as the function reads it from the Gmail API. */
export interface ImportMessage {
  id: string;
  /** Gmail's internalDate, in ms. */
  internalDate: number;
  from: string;
  to: string;
  cc: string;
  subject: string;
  text: string;
  labelIds: string[];
}

/**
 * Whether a message in a thread is a real, delivered one. A Gmail DRAFT has
 * the family's From address and would read as a letter they sent; a TRASH
 * message is one they threw away. Neither belongs in an evidence trail.
 */
export function isLiveMessage(msg: Pick<ImportMessage, 'labelIds'>): boolean {
  return !msg.labelIds.includes('DRAFT') && !msg.labelIds.includes('TRASH');
}

/** Whether a message is the family's own — Gmail's SENT label, or From the connected address. */
export function isFromFamily(msg: Pick<ImportMessage, 'from' | 'labelIds'>, self: string): boolean {
  if (msg.labelIds.includes('SENT')) return true;
  if (!self) return false;
  const me = mailboxKey(self);
  return addressesIn(msg.from).some((a) => mailboxKey(a) === me);
}

/** A paper-trail row for one imported message (the caller adds family_id). */
export interface ImportRow {
  kind: 'email';
  direction: 'outgoing' | 'incoming';
  subject: string;
  body: string;
  organization: string;
  contact: string | null;
  status: 'sent';
  sent_at: string;
  occurred_at: string;
  gmail_thread_id: string;
  gmail_message_id: string;
  request_id?: string;
  cc: string[] | null;
  read_at: string | null;
  /** History needs no answer (065); null on the one message left as news. */
  settled_at: string | null;
}

/**
 * The rows to insert for a thread being added. Drafts and trash are left out;
 * messages already in the paper trail are skipped (so adding twice adds
 * nothing); a thread longer than MAX_IMPORT_MESSAGES keeps its first message
 * and the newest after it.
 *
 * Read state follows the owner's choice (2026-10-09): every incoming message
 * is filed as history — read, and settled (065) so no surface asks for an
 * answer to it — except the newest message when it is theirs and from the
 * last IMPORT_NEW_REPLY_DAYS. That one is left as news: unread and open.
 */
export function planImport(input: {
  threadId: string;
  messages: ImportMessage[];
  self: string;
  knownIds: ReadonlySet<string>;
  organization: string;
  requestId?: string | null;
  now: Date;
}): ImportRow[] {
  const live = [...input.messages]
    .filter((m) => isLiveMessage(m) && m.text.trim())
    .sort((a, b) => a.internalDate - b.internalDate);
  const ordered =
    live.length > MAX_IMPORT_MESSAGES ? [live[0], ...live.slice(-(MAX_IMPORT_MESSAGES - 1))] : live;
  const newest = ordered[ordered.length - 1];
  const fresh = (m: ImportMessage) =>
    m.internalDate >= input.now.getTime() - IMPORT_NEW_REPLY_DAYS * 24 * 60 * 60 * 1000;
  const nowIso = input.now.toISOString();
  const rows: ImportRow[] = [];
  for (const m of ordered) {
    if (input.knownIds.has(m.id)) continue;
    const outgoing = isFromFamily(m, input.self);
    const at = new Date(m.internalDate).toISOString();
    const cc = outgoing
      ? (() => {
          const list = addressesIn(m.cc);
          return list.length > 0 ? list : null;
        })()
      : otherRecipients({ to: m.to, cc: m.cc, from: m.from, self: input.self });
    rows.push({
      kind: 'email',
      direction: outgoing ? 'outgoing' : 'incoming',
      subject: m.subject || '(no subject)',
      body: m.text.slice(0, 20_000),
      organization: input.organization,
      contact: (outgoing ? m.to : m.from) || null,
      status: 'sent',
      sent_at: at,
      occurred_at: at,
      gmail_thread_id: input.threadId,
      gmail_message_id: m.id,
      ...(input.requestId ? { request_id: input.requestId } : {}),
      cc,
      ...(() => {
        const news = outgoing || (m === newest && fresh(m));
        return { read_at: news ? null : nowIso, settled_at: outgoing || news ? null : nowIso };
      })(),
    });
  }
  return rows;
}

/** A thread as the find step lists it. */
export interface ThreadCandidate {
  threadId: string;
  subject: string;
  /** Display names, oldest first; the family is "You". */
  participants: string[];
  messageCount: number;
  /** ISO time of the newest message. */
  lastAt: string;
  /** Who sent the newest message ("You" for the family). */
  lastFrom: string;
  lastFromFamily: boolean;
  snippet: string;
  alreadyTracked: boolean;
}

// Gmail's thread snippet arrives HTML-escaped ("I&#39;ll get back to you").
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** "Ana Rivera <ana@rc.org>" → "Ana Rivera"; a bare address stays an address. */
export function displayName(from: string): string {
  const angle = from.indexOf('<');
  const name = (angle > 0 ? from.slice(0, angle) : '').replace(/["']/g, '').trim();
  return name || addressesIn(from)[0] || from.trim() || 'Unknown sender';
}

/** Summarise a thread's metadata for the pick list. */
export function summarizeThread(input: {
  threadId: string;
  messages: Pick<ImportMessage, 'from' | 'subject' | 'internalDate' | 'labelIds'>[];
  snippet: string;
  self: string;
  tracked: ReadonlySet<string>;
}): ThreadCandidate | null {
  const ordered = input.messages.filter(isLiveMessage).sort((a, b) => a.internalDate - b.internalDate);
  if (ordered.length === 0) return null;
  const who = (m: (typeof ordered)[number]) => (isFromFamily(m, input.self) ? 'You' : displayName(m.from));
  const participants: string[] = [];
  for (const m of ordered) {
    const name = who(m);
    if (!participants.includes(name)) participants.push(name);
  }
  const last = ordered[ordered.length - 1];
  return {
    threadId: input.threadId,
    subject: ordered[0].subject || '(no subject)',
    participants,
    messageCount: ordered.length,
    lastAt: new Date(last.internalDate).toISOString(),
    lastFrom: who(last),
    lastFromFamily: isFromFamily(last, input.self),
    snippet: decodeEntities(input.snippet).slice(0, 160),
    alreadyTracked: input.tracked.has(input.threadId),
  };
}
