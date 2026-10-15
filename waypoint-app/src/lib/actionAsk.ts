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
import { INTL_TAG } from '@/lib/actionFreshness';

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
 * The context pill on the chat side: what this conversation is anchored to,
 * and the way to open it. Trilingual for the same reason the button is — a
 * parent who taps "Hỏi về việc này" and reads a Vietnamese hint should not
 * land on an English pill in the middle of their own flow.
 */
export function actionAnchorLabel(title: string, locale: ActionLocale = 'en'): string {
  return picker(locale)(`About: ${title}`, `Sobre: ${title}`, `Về: ${title}`);
}

export function actionAnchorOpen(locale: ActionLocale = 'en'): string {
  return picker(locale)('Open', 'Abrir', 'Mở');
}

export function actionAnchorA11y(title: string, locale: ActionLocale = 'en'): string {
  return picker(locale)(
    `This chat is about ${title}. Open it.`,
    `Esta conversación es sobre ${title}. Abrirlo.`,
    `Cuộc trò chuyện này là về ${title}. Mở ra.`
  );
}

/**
 * A calendar-day label for a Postgres `date` or a timestamp — localized, and
 * carrying the YEAR whenever the day is not in the current one.
 *
 * Both halves of that are load-bearing, and the first build of this module got
 * both wrong. Without the year, a deadline from last August and one from this
 * August produce byte-identical sentences, so the model is told a 14-month-old
 * action was due seven weeks ago — in this domain the difference between "the
 * intake clock just lapsed, call them" and "you are near the two-year
 * due-process limit". Without the locale, an English month sits inside a
 * Spanish sentence. `formatAddedOn` on this same screen already does both, so
 * this follows it rather than inventing a third rule.
 */
function dayLabel(value: string, locale: ActionLocale, todayYear: number): string {
  const d = parseDateLocal(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(INTL_TAG[locale] ?? INTL_TAG.en, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() === todayYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Titles are parent-written and unbounded (`ActionFormModal` sets no
 * maxLength). The composer caps at 2000 characters, and on native it clamps a
 * long value by CUTTING it — taking the trailing space, and whatever the
 * parent then types runs straight into the context. So the title is bounded
 * here, where the sentence is built.
 */
const MAX_TITLE = 120;
function quoteTitle(raw: string): string {
  const title = raw.trim().replace(/\s+/g, ' ');
  const clipped = title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1).trimEnd()}…` : title;
  // Curly quotes around the title, so a title that itself contains a straight
  // quote ("She said "no"") does not read as three broken fragments.
  return `\u201C${clipped.replace(/[\u201C\u201D"]/g, "'")}\u201D`;
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
  const title = quoteTitle(action.title);
  const todayYear = Number(today.slice(0, 4));
  const day = (value: string) => dayLabel(value, locale, todayYear);

  const subject = childFirstName
    ? L(
        `About ${title} for ${childFirstName}`,
        `Sobre ${title} para ${childFirstName}`,
        `Về ${title} cho ${childFirstName}`
      )
    : L(`About ${title}`, `Sobre ${title}`, `Về ${title}`);

  const total = action.steps?.length ?? 0;
  const done = action.steps?.filter((s) => s.done).length ?? 0;

  const dueSuffix = (() => {
    if (!action.due_date) return '';
    const d = day(action.due_date);
    return hasPassed(action.due_date, today)
      ? L(
          ` It was due ${d}, and that date has passed.`,
          ` Vencía el ${d}, y esa fecha ya pasó.`,
          ` Hạn là ${d}, và ngày đó đã qua.`
        )
      : L(` It's due ${d}.`, ` Vence el ${d}.`, ` Hạn là ${d}.`);
  })();

  // `completed`: the screenshot's case, and the one the owner asked for.
  if (action.status === 'completed') {
    const when = action.completed_at ? ` (${day(action.completed_at)})` : '';
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
    // Three cases, not one. `toggleStep` never auto-completes an action, and
    // the status is set by its own control, so "part-way through, 3 of 3" and
    // "part-way through, 0 of 2" are both reachable — and both hand the model
    // a sentence that contradicts itself about the one thing this feature
    // exists to tell it.
    const progress = (() => {
      if (total === 0) {
        return L(
          `${subject} — I've started it.`,
          `${subject}: ya lo empecé.`,
          `${subject} — tôi đã bắt đầu.`
        );
      }
      if (done === 0) {
        return L(
          `${subject} — I've started it, but none of its ${total} steps are checked off yet.`,
          `${subject}: ya lo empecé, pero todavía no he marcado ninguno de sus ${total} pasos.`,
          `${subject} — tôi đã bắt đầu, nhưng chưa đánh dấu bước nào trong ${total} bước.`
        );
      }
      if (done >= total) {
        return L(
          `${subject} — I've worked through all ${total} of its steps, but it isn't marked done.`,
          `${subject}: completé los ${total} pasos, pero no está marcado como hecho.`,
          `${subject} — tôi đã làm xong cả ${total} bước, nhưng chưa đánh dấu hoàn thành.`
        );
      }
      return L(
        `${subject} — I'm part-way through it, ${done} of ${total} steps done.`,
        `${subject}: voy a mitad de camino, ${done} de ${total} pasos hechos.`,
        `${subject} — tôi đang làm dở, xong ${done} trong ${total} bước.`
      );
    })();
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
