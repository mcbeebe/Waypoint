/**
 * The pure brain of the server-initiated "you have a reply" push (phase 7,
 * Lane B — initiative 003). Decides, from communications rows alone, which
 * incoming replies still owe the family a push, and writes the tone-correct,
 * trilingual copy for it.
 *
 * Pure and node-tested. The Edge Functions (`push-send`, Deno) cannot import
 * app code, so `functions/_shared/replyPush.ts` HAND-MIRRORS this file; the
 * copy and the selection rule must stay identical. `replyPush.mirror.test.ts`
 * fails if the localized strings drift apart — the same discipline the
 * classifier prompt already relies on, but guarded by a test rather than a
 * comment.
 *
 * Tone: status of the answer, never the actor (owner rule, Aug 2026). "A reply
 * came in on your request" — not "they replied" or "they finally got back to
 * you". The push is the first framing a family reads; it starts neutral.
 */

export type PushLocale = 'en' | 'es' | 'vi';

/** Only the columns the decision needs — a subset of `communications`. */
export interface ReplyRow {
  id: string;
  family_id: string;
  direction: 'incoming' | 'outgoing' | null;
  gmail_thread_id: string | null;
  /** ISO timestamp the message occurred (`occurred_at`). */
  occurred_at: string | null;
  /** ISO timestamp a reply push already fired, or null if never. */
  notified_at: string | null;
}

/** Normalize any locale-ish string to the three the app speaks. */
export function pushLocale(raw: string | null | undefined): PushLocale {
  const s = (raw ?? '').toLowerCase();
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('vi')) return 'vi';
  return 'en';
}

/**
 * The incoming replies that still owe a push: never notified, and not already
 * answered. "Answered" = a later outgoing message exists on the same Gmail
 * thread — if the family already wrote back (app was open, they saw it), a
 * "you have a reply" push would be stale, so we suppress it. An incoming row
 * with no thread id can't be matched to an answer, so it counts as pending.
 *
 * `rows` may span families; the caller groups the result with `groupByFamily`.
 */
export function pendingReplyPushes(rows: ReplyRow[]): ReplyRow[] {
  const laterOutgoingByThread = new Map<string, number>();
  for (const r of rows) {
    if (r.direction !== 'outgoing' || !r.gmail_thread_id) continue;
    const t = Date.parse(r.occurred_at ?? '');
    if (Number.isNaN(t)) continue;
    const prev = laterOutgoingByThread.get(r.gmail_thread_id);
    if (prev === undefined || t > prev) laterOutgoingByThread.set(r.gmail_thread_id, t);
  }

  return rows.filter((r) => {
    if (r.direction !== 'incoming') return false;
    if (r.notified_at) return false;
    if (!r.gmail_thread_id) return true; // unmatchable → still a reply to surface
    const answeredAt = laterOutgoingByThread.get(r.gmail_thread_id);
    if (answeredAt === undefined) return true;
    const inAt = Date.parse(r.occurred_at ?? '');
    if (Number.isNaN(inAt)) return true;
    // Answered only if the outgoing is strictly after this incoming.
    return answeredAt <= inAt;
  });
}

/** Group pending rows by family, preserving input order within each family. */
export function groupByFamily(rows: ReplyRow[]): Map<string, ReplyRow[]> {
  const out = new Map<string, ReplyRow[]>();
  for (const r of rows) {
    const list = out.get(r.family_id);
    if (list) list.push(r);
    else out.set(r.family_id, [r]);
  }
  return out;
}

interface Copy {
  title: string;
  body: string;
}

/**
 * The notification copy for a family with `count` pending replies (count ≥ 1).
 * Status-framed and trilingual; the singular and plural are distinct so the
 * push never reads "1 replies".
 */
export function replyCopy(count: number, locale: PushLocale): Copy {
  const n = Math.max(1, Math.floor(count));
  const one = n === 1;
  switch (locale) {
    case 'es':
      return {
        title: one ? 'Tiene una respuesta' : `Tiene ${n} respuestas nuevas`,
        body: one
          ? 'Llegó una respuesta a una de sus solicitudes. Abra Waypoint para leerla y decidir el siguiente paso.'
          : `Llegaron ${n} respuestas. Abra Waypoint para leerlas y decidir el siguiente paso.`,
      };
    case 'vi':
      return {
        title: one ? 'Quý vị có một thư trả lời' : `Quý vị có ${n} thư trả lời mới`,
        body: one
          ? 'Đã có thư trả lời cho một yêu cầu của quý vị. Mở Waypoint để đọc và quyết định bước tiếp theo.'
          : `Đã có ${n} thư trả lời. Mở Waypoint để đọc và quyết định bước tiếp theo.`,
      };
    default:
      return {
        title: one ? 'You have a reply' : `You have ${n} new replies`,
        body: one
          ? 'A reply came in on one of your requests. Open Waypoint to read it and pick your next step.'
          : `${n} replies came in on your requests. Open Waypoint to read them and pick your next step.`,
      };
  }
}
