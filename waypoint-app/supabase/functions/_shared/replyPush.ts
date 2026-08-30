/**
 * MUST MIRROR waypoint-app/src/lib/replyPush.ts — the selection rule and the
 * trilingual copy are identical by contract. The app-side file is the tested
 * canonical version; this Deno copy is what actually ships in the `push-send`
 * Edge Function (Deno cannot import app code). `replyPush.mirror.test.ts` fails
 * if the localized strings here drift from the canonical file.
 *
 * Tone: status of the answer, never the actor (owner rule, Aug 2026).
 */

export type PushLocale = 'en' | 'es' | 'vi';

export interface ReplyRow {
  id: string;
  family_id: string;
  direction: 'incoming' | 'outgoing' | null;
  gmail_thread_id: string | null;
  occurred_at: string | null;
  notified_at: string | null;
}

export function pushLocale(raw: string | null | undefined): PushLocale {
  const s = (raw ?? '').toLowerCase();
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('vi')) return 'vi';
  return 'en';
}

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
    if (!r.gmail_thread_id) return true;
    const answeredAt = laterOutgoingByThread.get(r.gmail_thread_id);
    if (answeredAt === undefined) return true;
    const inAt = Date.parse(r.occurred_at ?? '');
    if (Number.isNaN(inAt)) return true;
    return answeredAt <= inAt;
  });
}

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
