/**
 * notificationPolicy — the pure brain of the outbound loop (initiative 003,
 * Home-Rebuild-Plan phase 7, Lane A).
 *
 * Given the same date-bearing evidence the Home ladder already reads — open
 * requests (with their statutory clocks), deadline rows, and plan actions — it
 * returns the exact set of on-device reminders a phone should hold. The screen
 * layer (useNotifications) only schedules/cancels what this returns; every
 * decision about WHEN a reminder fires and WHAT it says lives here, so it is
 * node-testable and can never drift from the ladder's own date math.
 *
 * Two rules this module exists to keep:
 *  1. **The promise.** The calm state may say "Waypoint will tell you if Sep 12
 *     passes" only because THIS produces the reminder that keeps it. The
 *     load-bearing spec is the day-after-due "past due" reminder.
 *  2. **Escalation tone.** Every string states the status of the answer — "An
 *     answer on X is past due" — never an actor who failed. Pinned by tests.
 *
 * Pure: no expo-notifications, no react-native, no Date.now() reads beyond the
 * `now` passed in. `deadlineFor` is imported as a value — it is itself pure.
 */
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestType } from '@/lib/requestClocks';
import type { FunnelLocale } from '@/lib/eligibility';

/** What a family can independently switch on. `reply` is delivered by Lane B
 *  server push, not scheduled here, but it lives in prefs so one settings
 *  screen governs the whole loop. */
export type NotifCategory = 'deadline' | 'action';

export interface NotifPrefs {
  /** Master switch. When false, no reminders at all. */
  enabled: boolean;
  deadlines: boolean;
  actions: boolean;
  /** Quiet-hours window in local hours [start, end); a fire inside it is
   *  pushed to `quietEndHour`. Default 21→8. Set equal to disable. */
  quietStartHour: number;
  quietEndHour: number;
}

export const DEFAULT_PREFS: NotifPrefs = {
  enabled: false,
  deadlines: true,
  actions: true,
  quietStartHour: 21,
  quietEndHour: 8,
};

/** iOS keeps only ~64 pending local notifications per app; stay well under so
 *  a busy family never silently loses the soonest ones. */
export const MAX_SCHEDULED = 60;
/** The civil hour a date-based reminder fires at (local). */
export const FIRE_HOUR = 9;

export interface ReminderSpec {
  /** Stable dedupe key — the scheduler cancels/reschedules by this. */
  key: string;
  category: NotifCategory;
  /** Local wall-clock instant to fire, as an ISO string. */
  fireAt: string;
  title: string;
  body: string;
  /** Routed into the notification payload; taps deep-link Home. */
  data: { type: string; requestId?: string; actionId?: string };
}

/** The minimal request shape the policy needs. */
export interface PolicyRequest {
  id: string;
  request_type: RequestType;
  title: string;
  requested_on: string;
  status: 'requested' | 'in_progress' | 'granted' | 'denied' | 'withdrawn';
}
/** The minimal deadline-row shape. */
export interface PolicyDeadline {
  id: string;
  title: string;
  due_date: string; // ISO date (YYYY-MM-DD or full ISO)
  status: string;
}
/** The minimal action shape (dueOn already normalized to YYYY-MM-DD | null). */
export interface PolicyAction {
  id: string;
  title: string;
  status: string;
  dueOn: string | null;
}

export interface PolicyInput {
  requests: PolicyRequest[];
  deadlines: PolicyDeadline[];
  actions: PolicyAction[];
  now: Date;
  locale: FunnelLocale;
  prefs: NotifPrefs;
}

// ─── trilingual helper ───────────────────────────────────────────────────────
const pick =
  (locale: FunnelLocale) =>
  (en: string, es: string, vi: string): string =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;

const MONTHS: Record<FunnelLocale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  vi: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
};

/** Format a YYYY-MM-DD (or ISO) date as a short local label, never via Date's
 *  own locale — the same reason requestClocks builds dates at local noon. */
export function fmtDate(iso: string, locale: FunnelLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[locale][Number(m[2]) - 1] ?? m[2];
  const day = Number(m[3]);
  return locale === 'vi' ? `${day} ${month}` : `${month} ${day}`;
}

// ─── date math (local-calendar, TZ-safe) ─────────────────────────────────────
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A Date at local FIRE_HOUR on the given YYYY-MM-DD, shifted `offsetDays`. */
function fireInstant(dateYMD: string, offsetDays: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateYMD);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + offsetDays, FIRE_HOUR, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Push a fire instant out of quiet hours to quietEndHour. */
function applyQuietHours(when: Date, prefs: NotifPrefs): Date {
  const { quietStartHour: qs, quietEndHour: qe } = prefs;
  if (qs === qe) return when; // quiet hours disabled
  const h = when.getHours();
  const inQuiet = qs < qe ? h >= qs && h < qe : h >= qs || h < qe;
  if (!inQuiet) return when;
  const out = new Date(when);
  // If we're in the pre-dawn tail (h < qe), same morning; else next morning.
  if (!(qs < qe) && h >= qs) out.setDate(out.getDate() + 1);
  out.setHours(qe, 0, 0, 0);
  return out;
}

const ACTION_OPEN = new Set(['not_started', 'in_progress']);
const REQUEST_OPEN = new Set(['requested', 'in_progress']);

/**
 * The plan: every reminder a device should hold right now, soonest first,
 * capped at MAX_SCHEDULED. Only future instants are returned — a reminder in
 * the past is never scheduled.
 */
export function reminderPlan(input: PolicyInput): ReminderSpec[] {
  const { requests, deadlines, actions, now, locale, prefs } = input;
  if (!prefs.enabled) return [];
  const L = pick(locale);
  const specs: ReminderSpec[] = [];

  const push = (
    key: string,
    category: NotifCategory,
    when: Date | null,
    title: string,
    body: string,
    data: ReminderSpec['data']
  ) => {
    if (!when) return;
    const fire = applyQuietHours(when, prefs);
    if (fire.getTime() <= now.getTime()) return; // never schedule the past
    specs.push({ key, category, fireAt: fire.toISOString(), title, body, data });
  };

  // ── Request clocks — the statutory dates that produce most "Sep 12" moments.
  if (prefs.deadlines) {
    for (const r of requests) {
      if (!REQUEST_OPEN.has(r.status)) continue;
      const dl = deadlineFor(r.request_type, r.requested_on, now);
      if (!dl) continue;
      const dateLabel = fmtDate(dl.dueOn, locale);
      // T-7 heads-up
      push(
        `req:${r.id}:t7`,
        'deadline',
        fireInstant(dl.dueOn, -7),
        L(`A reply on ${r.title} is due soon`, `Una respuesta sobre ${r.title} vence pronto`, `Phản hồi về ${r.title} sắp đến hạn`),
        L(`${dateLabel} is the deadline. Nothing to do yet — Waypoint is watching it.`,
          `El ${dateLabel} es la fecha límite. Nada que hacer aún — Waypoint la vigila.`,
          `${dateLabel} là hạn chót. Chưa cần làm gì — Waypoint đang theo dõi.`),
        { type: 'clock_soon', requestId: r.id }
      );
      // T-1
      push(
        `req:${r.id}:t1`,
        'deadline',
        fireInstant(dl.dueOn, -1),
        L(`A reply on ${r.title} is due tomorrow`, `Una respuesta sobre ${r.title} vence mañana`, `Phản hồi về ${r.title} đến hạn ngày mai`),
        L(`${dateLabel} is the deadline for a reply.`, `El ${dateLabel} es la fecha límite para una respuesta.`, `${dateLabel} là hạn chót để có phản hồi.`),
        { type: 'clock_tomorrow', requestId: r.id }
      );
      // T+1 — the promise-keeper. The date has passed; state the STATUS, not blame.
      push(
        `req:${r.id}:overdue`,
        'deadline',
        fireInstant(dl.dueOn, 1),
        L(`An answer on ${r.title} is past due`, `Una respuesta sobre ${r.title} está vencida`, `Câu trả lời về ${r.title} đã quá hạn`),
        L(`${dateLabel} passed with no reply. Tap for a ready-to-send follow-up.`,
          `El ${dateLabel} pasó sin respuesta. Toque para un seguimiento listo para enviar.`,
          `${dateLabel} đã qua mà chưa có phản hồi. Chạm để có thư nhắc sẵn sàng gửi.`),
        { type: 'clock_overdue', requestId: r.id }
      );
    }
  }

  // ── Deadline rows (non-request obligations).
  if (prefs.deadlines) {
    for (const d of deadlines) {
      if (d.status === 'completed') continue;
      const ymd = /^(\d{4}-\d{2}-\d{2})/.exec(d.due_date)?.[1];
      if (!ymd) continue;
      const dateLabel = fmtDate(ymd, locale);
      push(
        `deadline:${d.id}:t1`,
        'deadline',
        fireInstant(ymd, -1),
        L(`${d.title} is due tomorrow`, `${d.title} vence mañana`, `${d.title} đến hạn ngày mai`),
        L(`${dateLabel}. Tap to see what it needs.`, `${dateLabel}. Toque para ver qué necesita.`, `${dateLabel}. Chạm để xem cần gì.`),
        { type: 'deadline_tomorrow' }
      );
      push(
        `deadline:${d.id}:due`,
        'deadline',
        fireInstant(ymd, 0),
        L(`${d.title} is due today`, `${d.title} vence hoy`, `${d.title} đến hạn hôm nay`),
        L(`Tap to see what it needs.`, `Toque para ver qué necesita.`, `Chạm để xem cần gì.`),
        { type: 'deadline_due' }
      );
    }
  }

  // ── Plan actions coming due.
  if (prefs.actions) {
    for (const a of actions) {
      if (!ACTION_OPEN.has(a.status) || !a.dueOn) continue;
      const dateLabel = fmtDate(a.dueOn, locale);
      push(
        `action:${a.id}:due`,
        'action',
        fireInstant(a.dueOn, 0),
        L(`A plan step is due today: ${a.title}`, `Un paso del plan vence hoy: ${a.title}`, `Một bước kế hoạch đến hạn hôm nay: ${a.title}`),
        L(`Tap to pick it back up.`, `Toque para retomarlo.`, `Chạm để tiếp tục.`),
        { type: 'action_due', actionId: a.id }
      );
    }
  }

  // Soonest first, then cap — a busy family keeps the nearest reminders and
  // silently drops only the farthest-out (which reschedule on the next open).
  specs.sort((x, y) => x.fireAt.localeCompare(y.fireAt));
  return specs.slice(0, MAX_SCHEDULED);
}
