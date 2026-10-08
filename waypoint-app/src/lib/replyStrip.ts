/**
 * The Home "New reply" strip (owner report, 2026-10-08).
 *
 * Home leads with ONE card from a fixed ladder, and an overdue task outranks
 * every reply — so a reply that came in this morning sat unseen in the paper
 * trail. The strip announces unread replies under the One Thing card without
 * touching the ladder: it says a reply arrived, never what the family owes.
 *
 * Pure: the screen renders the model and navigates where it says.
 */
import type { Communication } from '@/hooks/useCommunications';
import type { FunnelLocale } from '@/lib/eligibility';
import { relativeDay } from '@/lib/homeTriage';
import { unreadReplies } from '@/lib/replyInbox';

export interface ReplyStripModel {
  /** The newest unread reply — the one a single-reply tap opens. */
  replyId: string;
  count: number;
  kicker: string;
  title: string;
  detail: string;
  cta: string;
  accessibilityLabel: string;
  /** Paper Trail params: one reply opens expanded; several open the Replies filter. */
  params: { filter: 'replies'; highlightId?: string };
}

export interface ReplyStripInput {
  communications: Communication[];
  /** The One Thing card's item id, e.g. "reply:<uuid>" — that reply is already announced. */
  leadingItemId?: string | null;
  now: Date;
  locale: FunnelLocale;
}

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/** The strip for this family right now, or null when there is nothing unread to announce. */
export function replyStrip(input: ReplyStripInput): ReplyStripModel | null {
  const L = picker(input.locale);
  const leading = input.leadingItemId?.startsWith('reply:') ? input.leadingItemId.slice(6) : null;
  const unread = unreadReplies(input.communications).filter((u) => u.reply.id !== leading);
  if (unread.length === 0) return null;

  const [first] = unread;
  const count = unread.length;
  const when = relativeDay(first.reply.sent_at ?? first.reply.occurred_at, input.now, input.locale);
  const others = count - 1;

  const kicker = (
    count === 1
      ? L(`New reply · ${when}`, `Nueva respuesta · ${when}`, `Thư trả lời mới · ${when}`)
      : L('New replies', 'Respuestas nuevas', 'Thư trả lời mới')
  ).toUpperCase();
  const title =
    count === 1
      ? L(`${first.senderName} replied`, `${first.senderName} respondió`, `${first.senderName} đã trả lời`)
      : L(`${count} new replies`, `${count} respuestas nuevas`, `${count} thư trả lời mới`);
  const quoted = first.snippet
    ? `“${first.snippet}${first.truncated ? '…' : ''}”`
    : first.reply.subject;
  const detail =
    count === 1
      ? quoted
      : others === 1
        ? L(
            `${first.senderName} and 1 other`,
            `${first.senderName} y 1 más`,
            `${first.senderName} và 1 người khác`
          )
        : L(
            `${first.senderName} and ${others} others`,
            `${first.senderName} y ${others} más`,
            `${first.senderName} và ${others} người khác`
          );
  const cta = L('Read', 'Leer', 'Đọc');

  return {
    replyId: first.reply.id,
    count,
    kicker,
    title,
    detail,
    cta,
    accessibilityLabel: `${title}. ${detail}. ${L(
      'Opens your paper trail.',
      'Abre su registro de comunicaciones.',
      'Mở nhật ký liên lạc của quý vị.'
    )}`,
    params: count === 1 ? { filter: 'replies', highlightId: first.reply.id } : { filter: 'replies' },
  };
}
