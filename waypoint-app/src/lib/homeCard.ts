/**
 * Presentation derivations for the One Thing card (Roadmap/Home-Rebuild-Plan.md
 * phase 2). The ladder itself lives in `homeTriage.ts`; this module turns a
 * `TriageResult` into the things the card and its sheet actually show.
 *
 * Pure — no react-native, no supabase — so the copy and the state machine are
 * unit-testable and `OneThingCard` stays a renderer.
 *
 * Two rules from the 20-persona audit live here:
 * - **The order is published.** "How Waypoint decides" shows the whole ladder,
 *   the rung that fired, and what is sitting on each other rung — so a parent
 *   can check the app's reasoning instead of trusting it.
 * - **Done means done.** An item only counts as finished when the family acted
 *   on it AND it stopped being true. Tapping a button is not completion.
 */
import type { FunnelLocale } from '@/lib/eligibility';
import {
  TRIAGE_LADDER,
  TRIAGE_RANK,
  type TriageClass,
  type TriageItem,
  type TriageResult,
  type LaterItem,
} from '@/lib/homeTriage';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/** Every triage id is `<class>:<key>`; the prefix is the class. */
export function classOfItemId(id: string): TriageClass | null {
  const prefix = id.split(':')[0];
  return prefix in TRIAGE_RANK ? (prefix as TriageClass) : null;
}

export type LadderRowState = 'now' | 'queued' | 'later' | 'done' | 'clear';

export interface LadderRow {
  /** null on the calm row, which sits below the numbered rungs. */
  cls: TriageClass | null;
  /** 1-based rung number, or null for the calm row. */
  position: number | null;
  name: string;
  state: LadderRowState;
  stateLabel: string;
}

export interface LadderSheet {
  title: string;
  intro: string;
  rows: LadderRow[];
  dismissLabel: string;
}

function ladderName(cls: TriageClass, locale: FunnelLocale): string {
  const L = picker(locale);
  switch (cls) {
    case 'resume':
      return L('Unfinished work you left', 'Trabajo que dejó a medias', 'Việc quý vị làm dở');
    case 'crisis':
      return L(
        'Something you told us happened today',
        'Algo que nos dijo que pasó hoy',
        'Điều quý vị cho biết đã xảy ra hôm nay'
      );
    case 'overdue':
      return L('A legal deadline that has passed', 'Un plazo legal ya vencido', 'Thời hạn luật định đã qua');
    case 'reply':
      return L(
        'An agency replied and is waiting on you',
        'Una agencia respondió y espera su respuesta',
        'Cơ quan đã trả lời và đang chờ quý vị'
      );
    case 'today':
      return L('Something happening today', 'Algo que ocurre hoy', 'Việc diễn ra hôm nay');
    case 'clock':
      return L(
        'A clock inside its warning window',
        'Un plazo dentro de su ventana de aviso',
        'Đồng hồ đang trong khoảng cảnh báo'
      );
    case 'question':
      return L('One question we need answered', 'Una pregunta que necesitamos', 'Một câu hỏi chúng tôi cần');
    case 'opportunity':
      return L(
        'One verified thing you may be owed',
        'Algo verificado que quizá le corresponde',
        'Một quyền lợi đã xác minh quý vị có thể được hưởng'
      );
  }
}

function stateLabel(state: LadderRowState, locale: FunnelLocale): string {
  const L = picker(locale);
  switch (state) {
    case 'now':
      return L('showing now', 'mostrando ahora', 'đang hiển thị');
    case 'queued':
      return L('in the queue', 'en la fila', 'trong hàng chờ');
    case 'later':
      return L('set aside', 'apartado', 'để sang bên');
    case 'done':
      return L('done today', 'hecho hoy', 'xong hôm nay');
    case 'clear':
      return '—';
  }
}

export interface LadderSheetInput {
  result: TriageResult;
  locale?: FunnelLocale;
  /** Item ids finished today, from `resolveCompleted`. */
  completedIds?: string[];
}

/**
 * The "How Waypoint decides what comes first" sheet: the published order with
 * live state on every rung, so the pick is checkable rather than magic.
 */
export function buildLadderSheet(input: LadderSheetInput): LadderSheet {
  const locale = input.locale ?? 'en';
  const L = picker(locale);
  const { result } = input;
  const leading = result.item?.cls ?? null;
  const queued = new Set(result.queue.map((i) => i.cls));
  const later = new Set(
    result.later.map((l) => classOfItemId(l.id)).filter((c): c is TriageClass => c != null)
  );
  const done = new Set(
    (input.completedIds ?? []).map(classOfItemId).filter((c): c is TriageClass => c != null)
  );

  const rows: LadderRow[] = TRIAGE_LADDER.map((cls, i) => {
    let state: LadderRowState = 'clear';
    if (cls === leading) state = 'now';
    else if (queued.has(cls)) state = 'queued';
    else if (later.has(cls)) state = 'later';
    else if (done.has(cls)) state = 'done';
    return {
      cls,
      position: i + 1,
      name: ladderName(cls, locale),
      state,
      stateLabel: stateLabel(state, locale),
    };
  });

  const calmState: LadderRowState = result.item ? 'clear' : 'now';
  rows.push({
    cls: null,
    position: null,
    name: L(
      'Nothing time-bound — the calm state',
      'Nada con plazo — el estado de calma',
      'Không có gì gấp — trạng thái yên'
    ),
    state: calmState,
    stateLabel: stateLabel(calmState, locale),
  });

  return {
    title: L(
      'How Waypoint decides what comes first',
      'Cómo decide Waypoint qué va primero',
      'Cách Waypoint quyết định điều gì trước'
    ),
    intro: L(
      'One published order, the same every day. Waypoint shows the highest thing that is true right now — never a guess about what you care about.',
      'Un orden publicado, igual todos los días. Waypoint muestra lo más alto que es cierto ahora mismo — nunca una suposición sobre lo que a usted le importa.',
      'Một thứ tự được công bố, giống nhau mỗi ngày. Waypoint hiển thị điều cao nhất đang đúng ngay lúc này — không phải phỏng đoán về điều quý vị quan tâm.'
    ),
    rows,
    dismissLabel: L('Got it', 'Entendido', 'Đã hiểu'),
  };
}

/**
 * Which of today's taps actually finished something.
 *
 * An id counts as completed only when the family acted on it and it is no
 * longer live and not merely set aside — so "Done. That was the most
 * important thing today" is never printed over an item that is still true.
 * Call it against a triage run made WITHOUT completions, then re-run.
 */
export function resolveCompleted(
  actedIds: string[],
  liveIds: string[],
  laterIds: string[] = []
): Record<string, boolean> {
  const live = new Set(liveIds);
  const later = new Set(laterIds);
  const out: Record<string, boolean> = {};
  for (const id of actedIds) {
    if (!live.has(id) && !later.has(id)) out[id] = true;
  }
  return out;
}

export interface CardLabels {
  notToday: string;
  howWeDecide: string;
  expand: string;
  collapse: string;
  readAloud: string;
  undo: string;
  laterHeading: string;
  whyHeading: string;
}

export function cardLabels(locale: FunnelLocale = 'en'): CardLabels {
  const L = picker(locale);
  return {
    notToday: L(
      'Not today — show the next thing',
      'Hoy no — muéstreme lo siguiente',
      'Hôm nay thì không — cho tôi xem việc kế tiếp'
    ),
    howWeDecide: L(
      'How Waypoint decides what comes first',
      'Cómo decide Waypoint qué va primero',
      'Cách Waypoint quyết định điều gì trước'
    ),
    expand: L('Expand this card', 'Ampliar esta tarjeta', 'Mở rộng thẻ này'),
    collapse: L('Collapse this card', 'Contraer esta tarjeta', 'Thu gọn thẻ này'),
    readAloud: L('Read this card aloud', 'Leer esta tarjeta en voz alta', 'Đọc to thẻ này'),
    undo: L('Undo', 'Deshacer', 'Hoàn tác'),
    laterHeading: L('Later', 'Más tarde', 'Để sau'),
    whyHeading: L('Why this', 'Por qué esto', 'Vì sao điều này'),
  };
}

/**
 * What the app promises when something is set aside. When the deferral could
 * not be shared with the family it says so — a co-parent who cannot see the
 * skip must not be told the skip is theirs too (audit finding #10).
 */
export function deferNotice(
  item: Pick<TriageItem, 'deferLabel'>,
  opts: { shared: boolean },
  locale: FunnelLocale = 'en'
): string {
  const L = picker(locale);
  if (opts.shared) return item.deferLabel;
  return `${item.deferLabel} · ${L(
    'on this device only',
    'solo en este dispositivo',
    'chỉ trên thiết bị này'
  )}`;
}

/** "Comes back Sep 5" — the set-aside list never hides its return date. */
export function laterLine(later: LaterItem, locale: FunnelLocale = 'en'): string {
  const L = picker(locale);
  const when = new Date(`${later.returnsOn}T12:00:00`).toLocaleDateString(
    locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US',
    { month: 'short', day: 'numeric' }
  );
  return L(`Comes back ${when}`, `Vuelve el ${when}`, `Quay lại ngày ${when}`);
}
