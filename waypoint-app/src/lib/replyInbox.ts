/**
 * Reply inbox derivation (owner decisions, Aug 27): which synced agency
 * reply deserves the Home spotlight. Pure logic — an incoming message is
 * "unanswered" while no newer outgoing message exists on its thread.
 */
import type { Communication } from '@/hooks/useCommunications';
import { localDayISO } from '@/lib/dateOnly';

export interface UnansweredReply {
  reply: Communication;
  /** "Lilia Talavera <lilia@rceb.org>" → "Lilia Talavera" */
  senderName: string;
  /** First ~140 chars of the body for the Home card. */
  snippet: string;
  /** True when the body ran past the snippet, so the card shows "…". */
  truncated: boolean;
}

const SNIPPET_LENGTH = 140;

function nameOf(contact: string | null): string {
  if (!contact) return 'The agency';
  const angle = contact.indexOf('<');
  const name = (angle > 0 ? contact.slice(0, angle) : contact.includes('@') ? '' : contact)
    .replace(/["']/g, '')
    .trim();
  return name || contact.replace(/[<>]/g, '').trim() || 'The agency';
}

function when(c: Communication): string {
  return c.sent_at ?? c.occurred_at;
}

/**
 * The correspondence block Waypoint hands the model when it drafts a reply.
 *
 * Every entry is dated on the DEVICE's calendar. `sent_at` and `occurred_at`
 * are both `timestamptz`, so taking the first ten characters dated a message
 * the parent sent at 6pm Pacific to the following day — and the model then
 * reasoned from that date, and sometimes repeated it, in a letter going to an
 * agency where dates decide whether a request was timely.
 *
 * Lives here rather than in the modal so it is a pure function the timezone
 * suites can actually pin; the component only renders the result.
 */
export function formatThreadForDraft(thread: Communication[]): string {
  return thread
    .map((c) => {
      const who =
        c.direction === 'incoming' ? `FROM ${c.contact ?? 'the agency'}` : 'FROM the parent';
      const at = when(c);
      // A timestamptz always parses, and `occurred_at` is NOT NULL, so this
      // guard is for data that should not exist. It still has to hold: the
      // prompt asks the model to restate the dates it is given, and
      // `new Date(null)` is the EPOCH rather than an Invalid Date — an
      // unguarded parse would confidently tell the model "1969-12-31".
      const parsed = new Date(at ?? '');
      const day = Number.isNaN(parsed.getTime())
        ? (at || 'undated').slice(0, 10)
        : localDayISO(parsed);
      return `--- ${who} · ${day} ---\n${c.subject}\n\n${c.body ?? ''}`;
    })
    .join('\n\n');
}

function isAnswered(reply: Communication, communications: Communication[]): boolean {
  return communications.some(
    (c) =>
      c.direction === 'outgoing' &&
      c.gmail_thread_id === reply.gmail_thread_id &&
      when(c) > when(reply)
  );
}

function toUnanswered(reply: Communication): UnansweredReply {
  const text = (reply.body ?? '').replace(/\s+/g, ' ').trim();
  return {
    reply,
    senderName: nameOf(reply.contact),
    snippet: text.slice(0, SNIPPET_LENGTH),
    truncated: text.length > SNIPPET_LENGTH,
  };
}

/** Synced replies on tracked threads, newest first. */
function trackedReplies(communications: Communication[]): Communication[] {
  return communications
    .filter((c) => c.direction === 'incoming' && c.gmail_thread_id)
    .sort((a, b) => when(b).localeCompare(when(a)));
}

/** The newest incoming reply not yet answered on its thread, if any. */
export function findUnansweredReply(
  communications: Communication[]
): UnansweredReply | null {
  for (const reply of trackedReplies(communications)) {
    if (!isAnswered(reply, communications)) return toUnanswered(reply);
  }
  return null;
}

/**
 * How long a reply can be "new". Matches migration 062's backfill, and also
 * covers replies synced late — a weeks-old message pulled in after Gmail is
 * reconnected is part of the record, not news. One window for every surface:
 * the Home strip and the paper trail's NEW marker never disagree.
 */
export const NEW_REPLY_DAYS = 14;

/**
 * Whether this synced reply is new to the family (062): not opened, and from
 * the last NEW_REPLY_DAYS. Migrations are applied by hand, so the app cannot
 * assume 062: before it, rows simply have no `read_at` key, and treating that
 * as "unread" would pin every reply with no way to clear it — so an absent
 * key is never new.
 */
export function isUnreadReply(c: Communication, now: Date): boolean {
  if (c.direction !== 'incoming' || !c.gmail_thread_id || !('read_at' in c) || c.read_at != null) {
    return false;
  }
  return new Date(when(c)).getTime() >= now.getTime() - NEW_REPLY_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Replies new to the family and not yet answered, newest first — what the
 * Home "New reply" strip announces. Answering a reply from Waypoint clears it
 * even if it was never opened, matching the One Thing reply card.
 */
export function unreadReplies(communications: Communication[], now: Date): UnansweredReply[] {
  return trackedReplies(communications)
    .filter((c) => isUnreadReply(c, now) && !isAnswered(c, communications))
    .map(toUnanswered);
}
