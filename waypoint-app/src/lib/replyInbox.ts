/**
 * Reply inbox derivation (owner decisions, Aug 27): which synced agency
 * reply deserves the Home spotlight. Pure logic — an incoming message is
 * "unanswered" while no newer outgoing message exists on its thread.
 */
import type { Communication } from '@/hooks/useCommunications';

export interface UnansweredReply {
  reply: Communication;
  /** "Lilia Talavera <lilia@rceb.org>" → "Lilia Talavera" */
  senderName: string;
  /** First ~140 chars of the body for the Home card. */
  snippet: string;
}

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

/** The newest incoming reply not yet answered on its thread, if any. */
export function findUnansweredReply(
  communications: Communication[]
): UnansweredReply | null {
  const incoming = communications
    .filter((c) => c.direction === 'incoming' && c.gmail_thread_id)
    .sort((a, b) => when(b).localeCompare(when(a)));
  for (const reply of incoming) {
    const answered = communications.some(
      (c) =>
        c.direction === 'outgoing' &&
        c.gmail_thread_id === reply.gmail_thread_id &&
        when(c) > when(reply)
    );
    if (!answered) {
      return {
        reply,
        senderName: nameOf(reply.contact),
        snippet: (reply.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 140),
      };
    }
  }
  return null;
}
