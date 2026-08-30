/**
 * Home triage engine (Roadmap/Home-Redesign-Concepts.md — concept A,
 * "The Next Right Thing"). Home stops being a dashboard and becomes a
 * decision: this module ranks everything Waypoint knows and returns the
 * ONE thing to lead with, plus the queue behind it.
 *
 * Pure — no react-native, no supabase — so the ladder is unit-testable and
 * the screen stays dumb.
 *
 * The rules the 20-persona audit turned into law:
 * - **One published order.** The ladder below is fixed and the same every
 *   day. Waypoint shows the highest thing that is TRUE right now, never a
 *   guess about what the family cares about.
 * - **Provenance, not praise.** Every kicker says what class this is and
 *   where it came from ("NEW REPLY — RECEIVED YESTERDAY"), never
 *   "WAYPOINT NOTICED" — a confirmed audit failure, because the same
 *   eyebrow on contradictory cards is what made them contradictory.
 * - **Never assert without evidence.** A class only appears when its
 *   evidence exists; an opportunity carries its citation and its
 *   "because you told us…" reason.
 * - **Deferral is honest.** "Not today" always states when the item comes
 *   back, and every set-aside item stays listed (with Undo) instead of
 *   vanishing — the old permanent ✕ was the audit's #6 failure.
 * - **Calm is earned.** The calm state distinguishes finished from set
 *   aside from genuinely clear, and never invents a card to fill space.
 */
import type { FamilyRequest } from '@/hooks/useRequests';
import type { Communication } from '@/hooks/useCommunications';
import type { FunnelLocale } from '@/lib/eligibility';
import type { RcStatus, IepStatus } from '@/types/database';
import { deadlineFor } from '@/lib/requestClocks';
import { buildRequestCase, activeRequestForReply } from '@/lib/requestCase';
import { findUnansweredReply } from '@/lib/replyInbox';
import { deriveHomeInsight } from '@/lib/insights';
import { deriveStackInsight } from '@/lib/resourceStack';
import type { BenefitStatus } from '@/types/database';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/** The published order. Lower rank wins; the array IS the contract. */
export const TRIAGE_LADDER = [
  'resume',
  'crisis',
  'overdue',
  'reply',
  'today',
  'clock',
  'question',
  'opportunity',
] as const;

export type TriageClass = (typeof TRIAGE_LADDER)[number];

export const TRIAGE_RANK: Record<TriageClass, number> = TRIAGE_LADDER.reduce(
  (acc, cls, i) => { acc[cls] = i; return acc; },
  {} as Record<TriageClass, number>
);

/** Days inside which a running statutory clock is worth leading with. */
const CLOCK_WINDOW_DAYS = 10;
/** A phoned ask with nothing in writing this long is stale, not escalating. */
const TODAY_HOUR_CUTOFF = 24;
/**
 * A draft is only "work you left" while it is warm. Older than this it is an
 * abandoned letter, and letting it sit at rung 0 would park it above a passed
 * statutory deadline every morning until the family deleted it.
 */
const RESUME_FRESH_HOURS = 48;

export interface TriageAction {
  /** 'answer' renders the answers inline; the others leave Home. */
  kind: 'navigate' | 'call' | 'answer';
  label: string;
  screen?: string;
  params?: Record<string, string>;
  /** Cross-tab destinations (the agenda lives in the Plan tab). */
  tab?: string;
  /** Digits only — a call action IS a tel: link, never a printed number. */
  tel?: string;
}

export interface TriageAnswer {
  label: string;
  /** What answering teaches Waypoint; the screen persists it. */
  value: string;
}

export interface TriageItem {
  /** Stable across renders so a deferral sticks to the right thing. */
  id: string;
  cls: TriageClass;
  rank: number;
  /** Honest class + provenance, e.g. "NEW REPLY — RECEIVED YESTERDAY". */
  kicker: string;
  title: string;
  /** One sentence naming the evidence this was chosen from. */
  why: string;
  citation?: string;
  action: TriageAction;
  answers?: TriageAnswer[];
  /** How long "Not today" sets it aside, and what the app promises. */
  deferDays: number;
  deferLabel: string;
}

export interface LaterItem {
  id: string;
  title: string;
  /** ISO date this returns; the UI shows it verbatim. */
  returnsOn: string;
  returnLabel: string;
}

export interface CalmState {
  /**
   * Which quiet this is — the copy must not claim the wrong one, and
   * 'unavailable' is not quiet at all: it is Waypoint saying it could not
   * look. An empty list because the network failed must never read as calm.
   */
  kind: 'done' | 'set_aside' | 'clear' | 'first_run' | 'unavailable';
  title: string;
  body: string;
}

/**
 * The provenance contract (grafted from Caseboard, owner-approved): what
 * Waypoint actually checked and when. Never claims a check that did not
 * happen — that is the whole point of showing it.
 */
export interface SensorLine {
  text: string;
  /** False when something could not be checked, so the UI can mark it. */
  ok: boolean;
}

export interface TriageDraft {
  id: string;
  /** Letter template key, so resuming lands in the right editor. */
  templateKey: string | null;
  subject: string;
  /** The saved text. Resuming without it would silently start over. */
  body: string | null;
  savedAt: string;
}

export interface TriageAppointment {
  id: string;
  title: string;
  /** ISO datetime. */
  startTime: string;
}

/** A dated obligation from the deadlines table (IEP reviews, auth expiry). */
export interface TriageDeadline {
  id: string;
  title: string;
  /** ISO calendar date. */
  dueOn: string;
  kind: string;
}

/**
 * A plan action (the family's to-do items). The ladder was blind to these
 * (task #34): a family with five overdue actions and nothing else saw
 * "Nothing needs you today", and no overdue action ever reached the card.
 * The classification here MIRRORS lib/agenda.ts exactly — same open statuses,
 * same overdue/today split — so the card and the Plan tab's "5 overdue · 1
 * today" line can never disagree about the same actions.
 */
export interface TriageActionItem {
  id: string;
  title: string;
  /** ActionStatus; only 'not_started' and 'in_progress' are ever surfaced. */
  status: string;
  /** ActionPriority; orders which overdue action leads. */
  priority: string;
  /** due_date's calendar date, or null. An undated action is not surfaced. */
  dueOn: string | null;
  category: string;
}

/** Something the family told Waypoint happened today (crisis intake). */
export interface TriageCrisis {
  id: string;
  title: string;
  reportedAt: string;
}

export interface TriageInput {
  locale?: FunnelLocale;
  now?: Date;
  childName?: string | null;
  ageYears?: number | null;
  rcStatus?: RcStatus | null;
  iepStatus?: IepStatus | null;
  hasDiagnosis?: boolean;
  /** Benefit-stack state — the opportunity rung prefers a stack unlock. */
  mediCalStatus?: BenefitStatus | null;
  ihssStatus?: BenefitStatus | null;
  ssiStatus?: BenefitStatus | null;
  sdpStep?: number | null;
  /** An open tracked deeming request reads as applied. */
  mediCalRequested?: boolean;
  requests?: FamilyRequest[];
  communications?: Communication[];
  /** The dated obligations the family tracks outside request clocks. */
  deadlines?: TriageDeadline[];
  /** Plan actions — overdue and due-today ones reach the ladder (task #34). */
  actions?: TriageActionItem[];
  appointments?: TriageAppointment[];
  drafts?: TriageDraft[];
  crisis?: TriageCrisis | null;
  /** id → ISO date it returns. Items still inside their window are skipped. */
  deferrals?: Record<string, string>;
  /** id → true for things finished today, so calm can say "done". */
  completed?: Record<string, boolean>;
  gmail?: {
    connected: boolean;
    lastCheckedAt?: string | null;
    /** Could not reach Gmail — never the same as "not connected". */
    failed?: boolean;
    /** Still checking; the sensor says so rather than guessing. */
    checking?: boolean;
  };
  /**
   * True while the family's records are still loading, and true when a fetch
   * failed. Absence of data is not absence of obligations: with either set,
   * the engine refuses to claim a calm day.
   */
  loading?: boolean;
  dataFailed?: boolean;
  /** True before the family has any tracked history at all. */
  firstRun?: boolean;
  /** The child these child-scoped items belong to (ids are scoped by it). */
  childId?: string | null;
}

export interface TriageResult {
  /** The One Thing, or null when the calm state leads. */
  item: TriageItem | null;
  /** Everything live and ranked, so "Not today" can advance in place. */
  queue: TriageItem[];
  calm: CalmState | null;
  later: LaterItem[];
  sensor: SensorLine;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local calendar date — never a UTC slice, or "today" drifts by a day. */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDay(iso: string, locale: FunnelLocale): string {
  return new Date(iso).toLocaleDateString(
    locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US',
    { month: 'short', day: 'numeric' }
  );
}

function fmtTime(iso: string, locale: FunnelLocale): string {
  return new Date(iso).toLocaleTimeString(
    locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US',
    { hour: 'numeric', minute: '2-digit' }
  );
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (60 * 60 * 1000);
}

/** "yesterday" / "Aug 28" — provenance a parent can check against reality. */
function relativeDay(iso: string, now: Date, locale: FunnelLocale): string {
  const L = picker(locale);
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);
  if (days <= 0) return L('today', 'hoy', 'hôm nay');
  if (days === 1) return L('yesterday', 'ayer', 'hôm qua');
  return fmtDay(iso, locale);
}

function addDaysISO(now: Date, days: number): string {
  return localDay(new Date(now.getTime() + days * MS_PER_DAY));
}

// ─── the ladder, one class per builder ──────────────────────────────────────

function resumeItem(input: Required<Pick<TriageInput, 'drafts'>> & { now: Date; locale: FunnelLocale }): TriageItem | null {
  const L = picker(input.locale);
  const newest = [...input.drafts].sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
  if (!newest) return null;
  if (hoursBetween(new Date(newest.savedAt), input.now) > RESUME_FRESH_HOURS) return null;
  return {
    id: `resume:${newest.id}`,
    cls: 'resume',
    rank: TRIAGE_RANK.resume,
    kicker: L(
      `You stopped partway — saved ${relativeDay(newest.savedAt, input.now, input.locale)}`,
      `Se detuvo a medias — guardado ${relativeDay(newest.savedAt, input.now, input.locale)}`,
      `Quý vị dừng giữa chừng — đã lưu ${relativeDay(newest.savedAt, input.now, input.locale)}`
    ).toUpperCase(),
    title: L(
      `Finish the letter you started: ${newest.subject}`,
      `Termine la carta que empezó: ${newest.subject}`,
      `Hoàn tất lá thư quý vị đã bắt đầu: ${newest.subject}`
    ),
    why: L(
      'Because your draft is saved and unsent. Picking it up beats starting over.',
      'Porque su borrador está guardado y sin enviar. Retomarlo es mejor que empezar de nuevo.',
      'Vì bản nháp của quý vị đã lưu và chưa gửi. Tiếp tục tốt hơn bắt đầu lại.'
    ),
    action: {
      kind: 'navigate',
      label: L('Open the draft', 'Abrir el borrador', 'Mở bản nháp'),
      screen: 'Letters',
      // The saved text goes with it. Without draftBody the editor resets to
      // the template's generic ask — "picking it up" would start over.
      params: {
        ...(newest.templateKey ? { template: newest.templateKey } : {}),
        ...(newest.body ? { draftBody: newest.body } : {}),
      },
    },
    deferDays: 1,
    deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
  };
}

function crisisItem(crisis: TriageCrisis, locale: FunnelLocale): TriageItem {
  const L = picker(locale);
  return {
    id: `crisis:${crisis.id}`,
    cls: 'crisis',
    rank: TRIAGE_RANK.crisis,
    kicker: L('Happened today — you told us', 'Ocurrió hoy — usted nos dijo', 'Xảy ra hôm nay — quý vị đã báo').toUpperCase(),
    title: crisis.title,
    why: L(
      'Because you told us this happened today. Putting it on the record now, while it is fresh, is what protects you later.',
      'Porque nos dijo que esto pasó hoy. Dejarlo por escrito ahora, mientras está fresco, es lo que le protege después.',
      'Vì quý vị cho biết việc này xảy ra hôm nay. Ghi lại ngay khi còn mới là điều bảo vệ quý vị về sau.'
    ),
    action: {
      kind: 'navigate',
      label: L('See what you can ask for today', 'Ver qué puede pedir hoy', 'Xem quý vị có thể yêu cầu gì hôm nay'),
      screen: 'EscalationLadder',
    },
    deferDays: 1,
    deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
  };
}

/** Overdue and running clocks, from the same tracked requests. */
function clockItems(
  requests: FamilyRequest[],
  now: Date,
  locale: FunnelLocale,
  childName: string | null
): TriageItem[] {
  const L = picker(locale);
  const out: TriageItem[] = [];
  const open = requests.filter((r) => r.status === 'requested' || r.status === 'in_progress');

  for (const r of open) {
    const dl = deadlineFor(r.request_type, r.requested_on, now);
    if (!dl) continue;
    const who = childName ? ` (${childName})` : '';
    if (dl.overdue) {
      out.push({
        id: `overdue:${r.id}`,
        cls: 'overdue',
        rank: TRIAGE_RANK.overdue,
        kicker: L(
          `Deadline passed — ${-dl.daysRemaining} days ago`,
          `Plazo vencido — hace ${-dl.daysRemaining} días`,
          `Quá hạn — ${-dl.daysRemaining} ngày trước`
        ).toUpperCase(),
        // Neutral by owner decision (Aug 2026): Home states the status of
        // the answer, not an actor who failed. The tone a family carries
        // into the call is set here, and it starts collaborative.
        title: L(
          `An answer on ${r.title}${who} is past due`,
          `La respuesta sobre ${r.title}${who} está vencida`,
          `Câu trả lời về ${r.title}${who} đã quá hạn`
        ),
        why: L(
          `Because you asked on ${fmtDay(`${r.requested_on}T12:00:00`, locale)} and the law gave them until ${fmtDay(`${dl.dueOn}T12:00:00`, locale)}. A follow-up that cites the date is the next step.`,
          `Porque pidió el ${fmtDay(`${r.requested_on}T12:00:00`, locale)} y la ley les daba hasta el ${fmtDay(`${dl.dueOn}T12:00:00`, locale)}. El siguiente paso es un seguimiento que cite la fecha.`,
          `Vì quý vị đã đề nghị ngày ${fmtDay(`${r.requested_on}T12:00:00`, locale)} và luật cho họ đến ${fmtDay(`${dl.dueOn}T12:00:00`, locale)}. Bước tiếp theo là thư nhắc có nêu ngày.`
        ),
        citation: dl.citation,
        action: {
          kind: 'navigate',
          label: L('Open this request', 'Abrir esta solicitud', 'Mở yêu cầu này'),
          screen: 'RequestCase',
          params: { requestId: r.id },
        },
        deferDays: 1,
        deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
      });
    } else if (dl.daysRemaining <= CLOCK_WINDOW_DAYS) {
      out.push({
        id: `clock:${r.id}`,
        cls: 'clock',
        rank: TRIAGE_RANK.clock,
        kicker: L(
          `Clock running — ${dl.daysRemaining} days left`,
          `Plazo en marcha — quedan ${dl.daysRemaining} días`,
          `Đồng hồ đang chạy — còn ${dl.daysRemaining} ngày`
        ).toUpperCase(),
        title: L(
          `An answer on ${r.title} is due ${fmtDay(`${dl.dueOn}T12:00:00`, locale)}`,
          `La respuesta sobre ${r.title} vence el ${fmtDay(`${dl.dueOn}T12:00:00`, locale)}`,
          `Câu trả lời về ${r.title} đến hạn ngày ${fmtDay(`${dl.dueOn}T12:00:00`, locale)}`
        ),
        why: L(
          `Because you asked on ${fmtDay(`${r.requested_on}T12:00:00`, locale)} and the law gives them a fixed window.`,
          `Porque pidió el ${fmtDay(`${r.requested_on}T12:00:00`, locale)} y la ley les da un plazo fijo.`,
          `Vì quý vị đã đề nghị ngày ${fmtDay(`${r.requested_on}T12:00:00`, locale)} và luật cho họ một khoảng thời gian cố định.`
        ),
        citation: dl.citation,
        action: {
          kind: 'navigate',
          label: L('See the request', 'Ver la solicitud', 'Xem yêu cầu'),
          screen: 'RequestCase',
          params: { requestId: r.id },
        },
        deferDays: 3,
        deferLabel: L('Back in 3 days', 'Vuelve en 3 días', 'Quay lại sau 3 ngày'),
      });
    }
  }
  // Most overdue first, then soonest due.
  return out.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

/**
 * The dated obligations that are NOT request clocks: IEP annual reviews and
 * triennials, insurance authorization expiries, SSI redeterminations. The
 * deleted Home banner was their only prominent surface — without this the
 * ladder cannot see them at all, and a triennial ten days out shows nowhere.
 */
const DEADLINE_WINDOW_DAYS = 14;

function deadlineItems(
  deadlines: TriageDeadline[],
  now: Date,
  locale: FunnelLocale
): TriageItem[] {
  const L = picker(locale);
  const today = localDay(now);
  const out: TriageItem[] = [];

  for (const d of deadlines) {
    const days = Math.round(
      (new Date(`${d.dueOn}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
        MS_PER_DAY
    );
    if (days > DEADLINE_WINDOW_DAYS) continue;
    const due = fmtDay(`${d.dueOn}T12:00:00`, locale);
    const overdue = days < 0;
    out.push({
      id: `${overdue ? 'overdue' : 'clock'}:deadline:${d.id}`,
      cls: overdue ? 'overdue' : 'clock',
      rank: overdue ? TRIAGE_RANK.overdue : TRIAGE_RANK.clock,
      kicker: (overdue
        ? L(`Date passed — ${-days} days ago`, `Fecha pasada — hace ${-days} días`, `Đã qua — ${-days} ngày trước`)
        : days === 0
          ? L('Due today', 'Vence hoy', 'Đến hạn hôm nay')
          : L(`Coming up — ${days} days`, `Próximo — ${days} días`, `Sắp đến — ${days} ngày`)
      ).toUpperCase(),
      title: d.title,
      why: L(
        `Because you have this dated ${due} in Waypoint.`,
        `Porque tiene esto con fecha del ${due} en Waypoint.`,
        `Vì quý vị có mục này với ngày ${due} trong Waypoint.`
      ),
      action: {
        kind: 'navigate',
        label: L('Open the calendar', 'Abrir el calendario', 'Mở lịch'),
        screen: 'CalendarMain',
        tab: 'Calendar',
      },
      deferDays: overdue ? 1 : 3,
      deferLabel: overdue
        ? L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai')
        : L('Back in 3 days', 'Vuelve en 3 días', 'Quay lại sau 3 ngày'),
    });
  }
  return out;
}

/**
 * Open plan actions that are overdue or due today (task #34). The ladder used
 * to be blind to these entirely: `agenda.ts` counted "5 overdue · 1 today" on
 * the Plan tab, but the card never saw an action, so a family with only overdue
 * actions was told "Nothing needs you today". The open-status and overdue/today
 * split MIRROR `agenda.ts` so the two surfaces can never disagree.
 *
 * Undated and future-dated actions are deliberately NOT surfaced here — the
 * ladder leads with what is due now; everything else lives on the Plan tab.
 */
const ACTION_OPEN_STATUSES = new Set(['not_started', 'in_progress']);

function actionItems(
  actions: TriageActionItem[],
  now: Date,
  locale: FunnelLocale
): TriageItem[] {
  const L = picker(locale);
  const today = localDay(now);
  const out: TriageItem[] = [];

  for (const a of actions) {
    if (!ACTION_OPEN_STATUSES.has(a.status) || !a.dueOn) continue;
    const days = Math.round(
      (new Date(`${a.dueOn}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
        MS_PER_DAY
    );
    // A malformed date yields NaN; never let that fall through and misclassify
    // the action as "due today". (The date column makes this unreachable, but
    // the card must not assert a due date it couldn't parse.)
    if (Number.isNaN(days)) continue;
    // Overdue or due today only. A future action is Plan-tab work, not the
    // one thing for today.
    if (days > 0) continue;
    const overdue = days < 0;
    const due = fmtDay(`${a.dueOn}T12:00:00`, locale);
    out.push({
      // Stable id so a "Not today" deferral sticks to this action.
      id: `${overdue ? 'overdue' : 'today'}:action:${a.id}`,
      cls: overdue ? 'overdue' : 'today',
      rank: overdue ? TRIAGE_RANK.overdue : TRIAGE_RANK.today,
      kicker: (overdue
        ? L(`Overdue — ${-days} days ago`, `Atrasado — hace ${-days} días`, `Quá hạn — ${-days} ngày trước`)
        : L('Due today', 'Vence hoy', 'Đến hạn hôm nay')
      ).toUpperCase(),
      title: a.title,
      why: overdue
        ? L(
            `Because this was due ${due} and isn't checked off yet. It's on your plan.`,
            `Porque esto vencía el ${due} y aún no está marcado. Está en su plan.`,
            `Vì mục này đến hạn ${due} và chưa được đánh dấu xong. Nó nằm trong kế hoạch của quý vị.`
          )
        : L(
            `Because it's due today and it's on your plan.`,
            `Porque vence hoy y está en su plan.`,
            `Vì mục này đến hạn hôm nay và nằm trong kế hoạch của quý vị.`
          ),
      action: {
        kind: 'navigate',
        label: L('Open this action', 'Abrir esta acción', 'Mở việc này'),
        // ActionDetail lives in the Tracker stack, a sibling of Home's — the
        // call must name the tab or the navigate bubbles to Home's parent and
        // resolves nowhere.
        tab: 'Tracker',
        screen: 'ActionDetail',
        params: { actionId: a.id },
      },
      deferDays: 1,
      deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
    });
  }
  return out;
}

function replyItem(
  requests: FamilyRequest[],
  communications: Communication[],
  now: Date,
  locale: FunnelLocale
): TriageItem | null {
  const L = picker(locale);
  const unanswered = findUnansweredReply(communications);
  if (!unanswered) return null;
  const { reply, senderName } = unanswered;
  const when = reply.sent_at ?? reply.occurred_at;
  const owner = activeRequestForReply(reply, requests, communications);

  return {
    id: `reply:${reply.id}`,
    cls: 'reply',
    rank: TRIAGE_RANK.reply,
    kicker: L(
      `New reply — received ${relativeDay(when, now, locale)}`,
      `Nueva respuesta — recibida ${relativeDay(when, now, locale)}`,
      `Trả lời mới — nhận ${relativeDay(when, now, locale)}`
    ).toUpperCase(),
    title: owner
      ? L(
          `${senderName} replied about ${owner.title}`,
          `${senderName} respondió sobre ${owner.title}`,
          `${senderName} đã trả lời về ${owner.title}`
        )
      : L(
          `${senderName} replied: ${reply.subject}`,
          `${senderName} respondió: ${reply.subject}`,
          `${senderName} đã trả lời: ${reply.subject}`
        ),
    why: `${
      unanswered.snippet
        ? L(
            `They wrote: “${unanswered.snippet}…” `,
            `Escribieron: “${unanswered.snippet}…” `,
            `Họ viết: “${unanswered.snippet}…” `
          )
        : ''
    }${L(
      `It arrived from ${senderName}'s email and the ball is in your court. Nothing sends until you press Send.`,
      `Llegó del correo de ${senderName} y la pelota está en su tejado. Nada se envía hasta que usted pulse Enviar.`,
      `Thư đến từ email của ${senderName} và giờ đến lượt quý vị. Không có gì được gửi cho đến khi quý vị bấm Gửi.`
    )}`,
    action: {
      kind: 'navigate',
      label: L(`Read ${senderName}'s reply`, `Leer la respuesta de ${senderName}`, `Đọc thư trả lời của ${senderName}`),
      // A reply on a tracked request belongs to its case; strays to the trail.
      screen: owner ? 'RequestCase' : 'CommunicationLog',
      params: owner ? { requestId: owner.id } : { openReplyId: reply.id },
    },
    deferDays: 1,
    deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
  };
}

function todayItems(
  appointments: TriageAppointment[],
  now: Date,
  locale: FunnelLocale
): TriageItem[] {
  const L = picker(locale);
  const key = localDay(now);
  return appointments
    .filter((a) => localDay(new Date(a.startTime)) === key)
    .filter((a) => hoursBetween(new Date(a.startTime), now) <= TODAY_HOUR_CUTOFF)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((a) => ({
      id: `today:${a.id}`,
      cls: 'today' as TriageClass,
      rank: TRIAGE_RANK.today,
      kicker: L(`Today — ${fmtTime(a.startTime, locale)}`, `Hoy — ${fmtTime(a.startTime, locale)}`, `Hôm nay — ${fmtTime(a.startTime, locale)}`).toUpperCase(),
      title: a.title,
      why: L(
        'Because it is on your Waypoint calendar, today.',
        'Porque está en su calendario de Waypoint, hoy.',
        'Vì nó nằm trên lịch Waypoint của quý vị, hôm nay.'
      ),
      action: {
        kind: 'navigate' as const,
        label: L('See today', 'Ver hoy', 'Xem hôm nay'),
        screen: 'CalendarMain',
        tab: 'Calendar',
      },
      deferDays: 1,
      deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
    }));
}

/** Typed so an answer can never carry a value the column would reject. */
const rcAnswer = (label: string, value: RcStatus): TriageAnswer => ({ label, value });
const iepAnswer = (label: string, value: IepStatus): TriageAnswer => ({ label, value });

/**
 * One question — asked only when the answer changes what Waypoint does
 * next. Never a survey, never a profile-completion nag (the audit's #8).
 */
function questionItem(input: TriageInput, locale: FunnelLocale): TriageItem | null {
  const L = picker(locale);
  const name = input.childName || L('your child', 'su hijo/a', 'con quý vị');
  // Scoped to the child, or a skip for one sibling silently answers for the
  // other — and the calm state credits work done on a different child.
  const scope = input.childId ? `:${input.childId}` : '';

  if (input.rcStatus == null || input.rcStatus === 'unknown') {
    return {
      id: `question:rc_status${scope}`,
      cls: 'question',
      rank: TRIAGE_RANK.question,
      kicker: L('A question — 20 seconds', 'Una pregunta — 20 segundos', 'Một câu hỏi — 20 giây').toUpperCase(),
      title: L(
        `Does ${name} already get Regional Center services?`,
        `¿${name} ya recibe servicios del Centro Regional?`,
        `${name} đã nhận dịch vụ của Trung tâm Khu vực chưa?`
      ),
      why: L(
        "Your answer decides Waypoint's first step. Not sure is fine — most families are, and Waypoint will help you find out.",
        'Su respuesta decide el primer paso de Waypoint. No saberlo está bien — a la mayoría le pasa, y Waypoint le ayuda a averiguarlo.',
        'Câu trả lời quyết định bước đầu của Waypoint. Không chắc cũng được — hầu hết gia đình đều vậy, và Waypoint sẽ giúp quý vị tìm hiểu.'
      ),
      action: { kind: 'answer', label: L('Answer', 'Responder', 'Trả lời') },
      // Values are written straight to children.rc_status, so they must be
      // legal statuses — "no, not yet" is 'known' (aware, no case open).
      answers: [
        rcAnswer(L('Yes, we have a case', 'Sí, tenemos un caso', 'Có, chúng tôi có hồ sơ'), 'active'),
        rcAnswer(
          L('We applied, still waiting', 'Solicitamos, seguimos esperando', 'Đã nộp đơn, đang chờ'),
          'applied'
        ),
        // 'known' means "I know which center serves us, no case open" — the
        // same meaning it carries in onboarding and the profile. The label
        // has to say that, or the answer records a claim never made.
        rcAnswer(
          L('No — I know the center, no case', 'No — conozco el centro, sin caso', 'Chưa — tôi biết trung tâm, chưa có hồ sơ'),
          'known'
        ),
        rcAnswer(L("I'm not sure", 'No lo sé con certeza', 'Tôi không chắc'), 'unknown'),
      ],
      deferDays: 1,
      deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
    };
  }

  if (input.iepStatus == null || input.iepStatus === 'unknown') {
    return {
      id: `question:iep_status${scope}`,
      cls: 'question',
      rank: TRIAGE_RANK.question,
      kicker: L('A question — 20 seconds', 'Una pregunta — 20 segundos', 'Một câu hỏi — 20 giây').toUpperCase(),
      title: L(
        `Does ${name} have an IEP in place right now?`,
        `¿${name} tiene un IEP vigente ahora mismo?`,
        `${name} hiện có IEP không?`
      ),
      why: L(
        'Your answer decides which deadline Waypoint watches next.',
        'Su respuesta decide qué plazo vigila Waypoint después.',
        'Câu trả lời quyết định thời hạn nào Waypoint theo dõi tiếp theo.'
      ),
      action: { kind: 'answer', label: L('Answer', 'Responder', 'Trả lời') },
      answers: [
        iepAnswer(
          L(`Yes, ${name} has one`, 'Sí, tiene uno', 'Có'),
          'active'
        ),
        iepAnswer(L('No, not yet', 'No, todavía no', 'Chưa'), 'no'),
        iepAnswer(L("I'm not sure", 'No lo sé con certeza', 'Tôi không chắc'), 'unknown'),
      ],
      deferDays: 1,
      deferLabel: L('Back tomorrow morning', 'Vuelve mañana por la mañana', 'Quay lại sáng mai'),
    };
  }
  return null;
}

/**
 * One verified opportunity, from the shipped insight derivation — with the
 * audit's honesty gate: it carries its citation and says what it was
 * derived FROM, and its kicker never reads "WAYPOINT NOTICED".
 */
function opportunityItem(input: TriageInput, locale: FunnelLocale): TriageItem | null {
  const L = picker(locale);
  // The benefit-stack unlock wins the rung when one exists — the same
  // precedence the shipped Home cards had, so nothing regressed when the
  // stack card folded into the ladder. Its own eyebrow is discarded:
  // the kicker below states the class, never "Waypoint noticed".
  const stack = deriveStackInsight(
    {
      ageYears: input.ageYears ?? null,
      rcStatus: input.rcStatus ?? null,
      iepStatus: input.iepStatus ?? null,
      mediCalStatus: input.mediCalStatus ?? null,
      ihssStatus: input.ihssStatus ?? null,
      ssiStatus: input.ssiStatus ?? null,
      sdpStep: input.sdpStep ?? null,
      mediCalRequested: input.mediCalRequested,
    },
    locale,
    input.childName ?? null
  );
  const insight = stack
    ? {
        // Keyed on the LAYER only. With the mode in the id, sending the
        // request flipped 'unlock' to 'in_motion', no deferral matched, and
        // an item set aside for a week came back the next morning.
        key: `stack_${stack.guide.layerKey}`,
        // The stack card's own headline ("using 1 of 5 benefit layers") was
        // written to sit above a five-bar chart. Without the bars it is a
        // claim with its evidence removed, so the guide's own title leads
        // and the count moves into the body, where it is explained.
        title: stack.guide.title,
        body: `${stack.body} ${stack.guide.how}`,
        citation: stack.citation,
        ctaLabel: stack.ctaLabel,
        target: {
          // 'unlock' opened the stack; 'in_motion' opened the tracker.
          screen: stack.mode === 'in_motion' ? 'RequestTracker' : 'ResourceStack',
          params: undefined as Record<string, string> | undefined,
        },
      }
    : deriveHomeInsight(
        {
          ageYears: input.ageYears ?? null,
          rcStatus: input.rcStatus ?? null,
          iepStatus: input.iepStatus ?? null,
          hasDiagnosis: !!input.hasDiagnosis,
          childName: input.childName ?? null,
        },
        locale
      );
  if (!insight) return null;

  // Name the evidence that actually drove the pick. Crediting the diagnosis
  // for an IHSS or deeming unlock points a parent at the wrong record.
  const because = stack
    ? L(
        `Because of the benefit layers you have told us about — ${stack.securedCount} of ${stack.totalCount} are in place.`,
        `Por las capas de beneficios que nos ha contado — ${stack.securedCount} de ${stack.totalCount} están en su sitio.`,
        `Dựa trên các tầng quyền lợi quý vị đã cho biết — ${stack.securedCount}/${stack.totalCount} đã có.`
      )
    : input.hasDiagnosis
    ? L(
        `Because you told us about ${input.childName || 'your child'}'s diagnosis and where you are with the Regional Center.`,
        `Porque nos contó sobre el diagnóstico de ${input.childName || 'su hijo/a'} y en qué punto está con el Centro Regional.`,
        `Vì quý vị đã cho biết chẩn đoán của ${input.childName || 'con quý vị'} và tình hình với Trung tâm Khu vực.`
      )
    : L(
        'Because of what you told us in your profile.',
        'Por lo que nos contó en su perfil.',
        'Dựa trên những gì quý vị đã cung cấp trong hồ sơ.'
      );

  return {
    id: `opportunity:${insight.key}${input.childId ? `:${input.childId}` : ''}`,
    cls: 'opportunity',
    rank: TRIAGE_RANK.opportunity,
    kicker: L('Worth checking — 2 minutes', 'Vale la pena revisar — 2 minutos', 'Đáng kiểm tra — 2 phút').toUpperCase(),
    title: insight.title,
    why: `${because} ${insight.body}`,
    citation: insight.citation,
    action: {
      kind: 'navigate',
      label: insight.ctaLabel,
      screen: insight.target.screen,
      params: insight.target.params,
    },
    deferDays: 7,
    deferLabel: L('Back next week', 'Vuelve la próxima semana', 'Quay lại tuần sau'),
  };
}

// ─── the sensor line (Caseboard graft) ──────────────────────────────────────

/**
 * What Waypoint actually checked, and when. An honest "couldn't check" is
 * the point — a promise to watch the clocks is only believable if the app
 * says when it last looked.
 */
export function sensorLine(input: TriageInput): SensorLine {
  const locale = input.locale ?? 'en';
  const L = picker(locale);
  const now = input.now ?? new Date();
  const g = input.gmail;
  const parts: string[] = [];
  let ok = true;

  if (g?.checking) {
    // Still looking. Saying "not connected" here told connected families
    // their Gmail was disconnected on every cold start.
    parts.push(L('Checking Gmail…', 'Revisando Gmail…', 'Đang kiểm tra Gmail…'));
  } else if (g?.failed) {
    parts.push(L("Couldn't check Gmail", 'No se pudo revisar Gmail', 'Không kiểm tra được Gmail'));
    ok = false;
  } else if (g?.connected && g.lastCheckedAt) {
    // A time with no date reads as today. Anything not from today says which
    // day it was, so a three-day-old check cannot pass for this morning's.
    const checked = new Date(g.lastCheckedAt);
    const sameDay = localDay(checked) === localDay(now);
    const when = sameDay
      ? fmtTime(g.lastCheckedAt, locale)
      : `${fmtDay(g.lastCheckedAt, locale)}, ${fmtTime(g.lastCheckedAt, locale)}`;
    parts.push(L(`Gmail checked ${when}`, `Gmail revisado ${when}`, `Đã kiểm tra Gmail ${when}`));
    if (!sameDay) ok = false;
  } else if (g?.connected) {
    parts.push(L(
      'Gmail connected — not checked yet today',
      'Gmail conectado — aún no revisado hoy',
      'Gmail đã kết nối — hôm nay chưa kiểm tra'
    ));
  } else {
    parts.push(L(
      'Gmail not connected — replies stay outside Waypoint',
      'Gmail no conectado — las respuestas quedan fuera de Waypoint',
      'Chưa kết nối Gmail — thư trả lời nằm ngoài Waypoint'
    ));
    ok = false;
  }

  if (input.dataFailed) {
    parts.push(L(
      "Couldn't reach your records",
      'No se pudo acceder a sus registros',
      'Không truy cập được hồ sơ của quý vị'
    ));
    ok = false;
  } else {
    // Says what Waypoint does, not where the bytes live — the old line
    // claimed deadlines were "stored on your phone", which is false: they
    // are in your Waypoint account.
    parts.push(L(
      'Clocks counted from your records',
      'Plazos contados desde sus registros',
      'Thời hạn được tính từ hồ sơ của quý vị'
    ));
  }
  return { text: parts.join(' · '), ok };
}

// ─── calm ───────────────────────────────────────────────────────────────────

function calmState(
  input: TriageInput,
  locale: FunnelLocale,
  laterCount: number,
  nextClock: { dueOn: string } | null
): CalmState {
  const L = picker(locale);
  const doneToday = Object.values(input.completed ?? {}).some(Boolean);
  // Waypoint does NOT send notifications yet (Home-Rebuild-Plan phase 7), so
  // the calm state cannot promise to tell anyone anything. Until the push
  // loop ships, it says what is true: the date is tracked, come back and
  // look. Restore the promise in the same PR that makes it keepable.
  const watching = nextClock
    ? L(
        `${fmtDay(`${nextClock.dueOn}T12:00:00`, locale)} is the next date Waypoint is counting to. Check back — it will be here.`,
        `El ${fmtDay(`${nextClock.dueOn}T12:00:00`, locale)} es la próxima fecha que Waypoint cuenta. Vuelva a mirar — estará aquí.`,
        `${fmtDay(`${nextClock.dueOn}T12:00:00`, locale)} là ngày kế tiếp Waypoint đang đếm tới. Hãy quay lại xem — nó sẽ ở đây.`
      )
    : L(
        'Waypoint keeps counting the clocks on your open requests.',
        'Waypoint sigue contando los plazos de sus solicitudes abiertas.',
        'Waypoint tiếp tục đếm thời hạn cho các yêu cầu đang mở của quý vị.'
      );

  // An empty screen because nothing could be read is not a calm day. This
  // must come first: firstRun and "done" both read an empty list as fact.
  if (input.dataFailed || input.loading) {
    return {
      kind: 'unavailable',
      title: input.loading
        ? L('Checking your records…', 'Revisando sus registros…', 'Đang kiểm tra hồ sơ của quý vị…')
        : L(
            "Waypoint couldn't reach your records.",
            'Waypoint no pudo acceder a sus registros.',
            'Waypoint không truy cập được hồ sơ của quý vị.'
          ),
      body: input.loading
        ? L(
            'One moment — Waypoint is counting the clocks.',
            'Un momento — Waypoint está contando los plazos.',
            'Chờ một chút — Waypoint đang đếm thời hạn.'
          )
        : L(
            'This is a connection problem, not an all-clear. Nothing has been lost; pull down to try again when you have a signal.',
            'Es un problema de conexión, no una señal de que todo está bien. No se ha perdido nada; deslice hacia abajo para reintentar cuando tenga señal.',
            'Đây là sự cố kết nối, không phải dấu hiệu mọi thứ ổn. Không có gì bị mất; hãy kéo xuống để thử lại khi có mạng.'
          ),
    };
  }

  if (input.firstRun) {
    return {
      kind: 'first_run',
      title: L(
        `Waypoint checked ${input.childName || 'your child'}'s basics.`,
        `Waypoint revisó lo básico de ${input.childName || 'su hijo/a'}.`,
        `Waypoint đã kiểm tra thông tin cơ bản của ${input.childName || 'con quý vị'}.`
      ),
      body: L(
        'Nothing needs you today. When you ask an agency for something, its clock starts here.',
        'Nada requiere su atención hoy. Cuando pida algo a una agencia, su plazo empieza aquí.',
        'Hôm nay chưa cần quý vị. Khi quý vị đề nghị điều gì với cơ quan, đồng hồ của nó bắt đầu ở đây.'
      ),
    };
  }
  if (doneToday) {
    return {
      kind: 'done',
      title: L(
        'Done. That was the most important thing today.',
        'Listo. Eso era lo más importante de hoy.',
        'Xong. Đó là điều quan trọng nhất hôm nay.'
      ),
      body: `${watching} ${L('Nothing else needs you right now.', 'Nada más requiere su atención ahora.', 'Hiện không còn việc gì cần quý vị.')}`,
    };
  }
  if (laterCount > 0) {
    return {
      kind: 'set_aside',
      title: L("That's everything for today.", 'Eso es todo por hoy.', 'Vậy là hết cho hôm nay.'),
      body: L(
        'The rest is set aside, not gone — it is in your plan with the day each one comes back, and Undo if you want it now.',
        'El resto está apartado, no perdido — está en su plan con el día en que vuelve cada cosa, y Deshacer si lo quiere ahora.',
        'Phần còn lại được để sang bên, không mất — nằm trong kế hoạch với ngày quay lại, và có Hoàn tác nếu quý vị muốn ngay.'
      ),
    };
  }
  return {
    kind: 'clear',
    title: L(
      'Nothing has a clock on it today.',
      'Nada tiene plazo hoy.',
      'Hôm nay không có gì đến hạn.'
    ),
    body: `${watching} ${L('Nothing else needs you right now.', 'Nada más requiere su atención ahora.', 'Hiện không còn việc gì cần quý vị.')}`,
  };
}

// ─── the engine ─────────────────────────────────────────────────────────────

/**
 * Rank everything Waypoint knows and return the one thing to lead with.
 * Deterministic: same inputs, same order, every time.
 */
export function triageHome(input: TriageInput): TriageResult {
  const locale = input.locale ?? 'en';
  const now = input.now ?? new Date();
  const requests = input.requests ?? [];
  const communications = input.communications ?? [];
  const deferrals = input.deferrals ?? {};
  const completed = input.completed ?? {};
  const today = localDay(now);

  const candidates: TriageItem[] = [];
  const draft = resumeItem({ drafts: input.drafts ?? [], now, locale });
  if (draft) candidates.push(draft);
  if (input.crisis) candidates.push(crisisItem(input.crisis, locale));
  candidates.push(...clockItems(requests, now, locale, input.childName ?? null));
  candidates.push(...deadlineItems(input.deadlines ?? [], now, locale));
  candidates.push(...actionItems(input.actions ?? [], now, locale));
  const reply = replyItem(requests, communications, now, locale);
  if (reply) candidates.push(reply);
  candidates.push(...todayItems(input.appointments ?? [], now, locale));
  const question = questionItem(input, locale);
  if (question) candidates.push(question);
  const opportunity = opportunityItem(input, locale);
  if (opportunity) candidates.push(opportunity);

  // Set-aside items stay listed with their return date; they never vanish.
  const later: LaterItem[] = [];
  const live: TriageItem[] = [];
  for (const item of candidates) {
    if (completed[item.id]) continue;
    const returnsOn = deferrals[item.id];
    if (returnsOn && returnsOn > today) {
      later.push({
        id: item.id,
        title: item.title,
        returnsOn,
        returnLabel: item.deferLabel,
      });
      continue;
    }
    live.push(item);
  }

  live.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

  const nextClock = requests
    .filter((r) => r.status === 'requested' || r.status === 'in_progress')
    .map((r) => deadlineFor(r.request_type, r.requested_on, now))
    .filter((d): d is NonNullable<typeof d> => d != null && !d.overdue)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0] ?? null;

  return {
    item: live[0] ?? null,
    queue: live,
    calm: live.length === 0 ? calmState(input, locale, later.length, nextClock) : null,
    later,
    sensor: sensorLine({ ...input, locale, now }),
  };
}

/** The ISO date a "Not today" tap should store for this item. */
export function deferUntil(item: TriageItem, now = new Date()): string {
  return addDaysISO(now, item.deferDays);
}

/**
 * A case-aware reply badge for the Requests tool, reusing the shipped
 * derivation so Home and the tool can never disagree.
 */
export function openCaseCount(requests: FamilyRequest[], communications: Communication[], now = new Date()): number {
  return requests
    .filter((r) => r.status === 'requested' || r.status === 'in_progress')
    .filter((r) => {
      const c = buildRequestCase(r, communications, 'en', now);
      return c.unansweredReply != null || c.deadline?.overdue === true;
    }).length;
}
