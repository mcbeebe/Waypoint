/**
 * The bridge from one action to the Navigator (owner request, Oct 14 2026).
 *
 * A parent who has just marked "Apply for Medi-Cal" done no longer has a TASK
 * question — they have a WAITING question: what happens next, how long, what
 * should I watch for. Before this, asking it meant switching to the Navigator
 * tab and retyping everything the app already knew.
 *
 * ── How the context reaches the model ──────────────────────────────────────
 * It rides in the composer, not in the payload. The Navigator's system prompt
 * is built SERVER-SIDE in `ai-proxy` from DB family context (Wave 1
 * hardening); the client sends only messages, tone and ragContext, so there is
 * no client-side context slot to fill. The alternative — a new field on the
 * ai-proxy payload — means changing an Edge Function, and no CI covers those
 * eight. So the action's state becomes the opening words of the parent's own
 * message, exactly the way `journeyActions.entityStepQuestion` already does it
 * for a journey step.
 *
 * That has a property worth keeping: the parent can SEE what Waypoint thinks
 * their situation is, and fix it before they send. The owner's call (Oct 14)
 * was to prefill and focus rather than auto-send for that reason — one button,
 * no starter chips, the question stays theirs to write.
 *
 * ── Tone ───────────────────────────────────────────────────────────────────
 * These strings are family-facing copy that ALSO steers the answer, so the
 * escalation rule binds them twice. Every sentence states the status of the
 * answer, never an actor who failed: "an answer is past due", never "they
 * missed the deadline" or "they owe you". A parent carries the framing they
 * read here into the phone call they make next. `actionAsk.test.ts` pins the
 * banned phrasings the way `homeTriage.test.ts` pins Home.
 *
 * Nothing here blames the PARENT either. A date that has gone by is reported
 * as a fact about the date ("that date has passed"), not as a verdict on them.
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest project,
 * and because "has the date passed?" is a calendar-day question it is pinned
 * in BOTH timezone suites by `actionAsk.tz.test.ts`.
 */

import type { ActionStatus, ActionStep } from '@/types/database';
import type { ActionLocale } from '@/lib/actionMeta';
import { localDayISO, parseDateLocal } from '@/lib/dateOnly';

/** The fields of an `Action` this needs; a real `Action` satisfies it. */
export interface ActionAskInput {
  title: string;
  status: ActionStatus;
  due_date: string | null;
  completed_at: string | null;
  steps: ActionStep[] | null;
  follow_up_date: string | null;
}

export interface ActionAskOptions {
  locale?: ActionLocale;
  /** The child this action is attached to, when it names one. */
  childFirstName?: string | null;
  /** `YYYY-MM-DD` local day key; defaults to the device's own. */
  today?: string;
}

function picker(locale: ActionLocale) {
  return <T>(en: T, es: T, vi: T): T => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/** The button's label. */
export function actionAskLabel(locale: ActionLocale = 'en'): string {
  return picker(locale)('Ask about this', 'Preguntar sobre esto', 'Hỏi về việc này');
}

/** The line under the button — what the parent is about to hand over. */
export function actionAskHint(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'Opens the Navigator with where this stands already filled in — your question goes after it.',
    'Abre el Navegador con la situación ya escrita — su pregunta va después.',
    'Mở Navigator với tình trạng hiện tại đã điền sẵn — câu hỏi của quý vị viết tiếp theo.'
  );
}

/**
 * A short calendar-day label (`Aug 24`) for a Postgres `date`. Month names
 * are kept English in every locale on purpose: `formatDate` on the detail
 * screen does the same, so the sentence and the chip above it agree.
 */
function dayLabel(value: string): string {
  const d = parseDateLocal(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Has a date-only column's day gone by on the family's calendar? */
function hasPassed(value: string | null, today: string): boolean {
  if (!value) return false;
  // Lexicographic on `YYYY-MM-DD` is calendar order; a date-only column and a
  // local day key compare directly. A day that IS today has not passed — the
  // family still has it (same judgment as `deadlineStatus.newlyOverdue`).
  const day = value.length > 10 ? localDayISO(parseDateLocal(value)) : value;
  return day < today;
}

/**
 * The opening words of the parent's message: what this action is and where it
 * stands. Ends with a trailing space so the composer's caret sits ready for
 * the question itself.
 *
 * Deliberately NOT included: the parent's notes (`action_notes`). They are a
 * private running log, arbitrarily long, and may hold things a parent would
 * not choose to hand to a model. If they are ever wanted here it should be an
 * explicit opt-in, not a default (recorded in `Roadmap/Action-Ask-Plan.md`,
 * under "What goes into the sentence"). That cross-reference is spelled out
 * rather than numbered on purpose: `statuteAudit` reads a section mark
 * followed by a number, on a line that names no code, as a legal claim with
 * nothing behind it — and it is right to, because this is prose that ships.
 */
export function actionAskPrefill(
  action: ActionAskInput,
  options: ActionAskOptions = {}
): string {
  const { locale = 'en', childFirstName, today = localDayISO() } = options;
  const L = picker(locale);
  const title = action.title.trim();

  const subject = childFirstName
    ? L(
        `About "${title}" for ${childFirstName}`,
        `Sobre "${title}" para ${childFirstName}`,
        `Về "${title}" cho ${childFirstName}`
      )
    : L(`About "${title}"`, `Sobre "${title}"`, `Về "${title}"`);

  const total = action.steps?.length ?? 0;
  const done = action.steps?.filter((s) => s.done).length ?? 0;

  const dueSuffix = (() => {
    if (!action.due_date) return '';
    const day = dayLabel(action.due_date);
    return hasPassed(action.due_date, today)
      ? L(
          ` It was due ${day}, and that date has passed.`,
          ` Vencía el ${day}, y esa fecha ya pasó.`,
          ` Hạn là ${day}, và ngày đó đã qua.`
        )
      : L(` It's due ${day}.`, ` Vence el ${day}.`, ` Hạn là ${day}.`);
  })();

  // `completed`: the screenshot's case, and the one the owner asked for.
  if (action.status === 'completed') {
    const when = action.completed_at ? ` (${dayLabel(action.completed_at)})` : '';
    const head = L(
      `${subject} — I've marked it done${when}.`,
      `${subject}: lo marqué como hecho${when}.`,
      `${subject} — tôi đã đánh dấu hoàn thành${when}.`
    );
    // The one place an agency owes something. State the ANSWER's status, never
    // an actor: "an answer is past due", not "they missed the deadline".
    const waiting = hasPassed(action.follow_up_date, today)
      ? L(
          ' An answer on it is past due.',
          ' Una respuesta sobre esto está atrasada.',
          ' Một câu trả lời về việc này đã quá hạn.'
        )
      : '';
    return `${head}${waiting} `;
  }

  if (action.status === 'dismissed') {
    return (
      L(
        `${subject} — I took it off my plan.`,
        `${subject}: lo quité de mi plan.`,
        `${subject} — tôi đã bỏ nó khỏi kế hoạch.`
      ) + ' '
    );
  }

  if (action.status === 'in_progress') {
    const progress =
      total > 0
        ? L(
            `${subject} — I'm part-way through it, ${done} of ${total} steps done.`,
            `${subject}: voy a mitad de camino, ${done} de ${total} pasos hechos.`,
            `${subject} — tôi đang làm dở, xong ${done} trong ${total} bước.`
          )
        : L(
            `${subject} — I've started it.`,
            `${subject}: ya lo empecé.`,
            `${subject} — tôi đã bắt đầu.`
          );
    return `${progress}${dueSuffix} `;
  }

  // `not_started`
  const head =
    total > 0
      ? L(
          `${subject} — I haven't started it yet; it has ${total} steps.`,
          `${subject}: todavía no lo he empezado; tiene ${total} pasos.`,
          `${subject} — tôi chưa bắt đầu; có ${total} bước.`
        )
      : L(
          `${subject} — I haven't started it yet.`,
          `${subject}: todavía no lo he empezado.`,
          `${subject} — tôi chưa bắt đầu.`
        );
  return `${head}${dueSuffix} `;
}
