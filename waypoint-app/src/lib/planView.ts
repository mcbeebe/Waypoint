/**
 * The Plan tab (Roadmap/Home-Rebuild-Plan.md phase 3) — Actions and Calendar
 * were never two questions. This merges everything a family owes, everything
 * an agency owes them, and every date either hangs on, into one list; and
 * models the month grid that the same data draws.
 *
 * Pure — no react-native, no supabase — so "does every obligation appear
 * exactly once?" is a unit test rather than a hope.
 *
 * The rule this module exists to keep: **nothing is dropped and nothing is
 * doubled.** An item is dated or it is not; if dated it lands in exactly one
 * of overdue / today / this week / upcoming, and if not it lands in the
 * undated list. Set-aside items keep their own section with the day they
 * return, so "Later" is never a synonym for gone.
 */
import type { AgendaAction, AgendaAppointment, AgendaDeadline, AgendaScope } from '@/lib/agenda';
import { dayKey } from '@/lib/agenda';
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestType } from '@/lib/requestClocks';
import type { FunnelLocale } from '@/lib/eligibility';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

const MS_PER_DAY = 86_400_000;
/** How far out "this week" reaches before an item becomes "upcoming". */
export const WEEK_DAYS = 7;

export type PlanEntryKind = 'appointment' | 'deadline' | 'action' | 'clock' | 'later';

export interface PlanTarget {
  screen: string;
  params?: Record<string, string>;
  /** Set when the destination lives in another tab's stack. */
  tab?: string;
}

export interface PlanEntry {
  id: string;
  kind: PlanEntryKind;
  title: string;
  /** Where this came from — provenance on every row, including citations. */
  source: string;
  /** Local calendar date, or null for something with no date yet. */
  dateKey: string | null;
  /** "Today", "Tue, Sep 1" — null when undated. */
  dayLabel: string | null;
  /** "9:00 AM" for timed appointments only. */
  time: string | null;
  /** Completed actions render struck through rather than vanishing. */
  done: boolean;
  target?: PlanTarget;
  /** Set-aside entries only: the day it comes back. */
  returnsOn?: string;
}

export type PlanSectionKey =
  | 'overdue'
  | 'today'
  | 'week'
  | 'upcoming'
  | 'waiting'
  | 'undated'
  | 'later';

export interface PlanSection {
  key: PlanSectionKey;
  label: string;
  entries: PlanEntry[];
}

export interface PlanView {
  sections: PlanSection[];
  /** True when the family owes nothing and is owed nothing. */
  isEmpty: boolean;
  emptyLine: string;
  /** The soonest dated entry, so Month can open where the work is. */
  nextDated: PlanEntry | null;
}

export interface PlanRequest {
  id: string;
  title: string;
  request_type: RequestType;
  requested_on: string;
  status: string;
}

export interface PlanLater {
  id: string;
  title: string;
  returnsOn: string;
}

export interface PlanInput {
  actions: AgendaAction[];
  appointments: AgendaAppointment[];
  deadlines: AgendaDeadline[];
  /** Open asks, for the clocks an agency is running against. */
  requests?: PlanRequest[];
  /** What the family set aside on Home. */
  later?: PlanLater[];
  now: Date;
  locale?: FunnelLocale;
  /** 'waypoint' hides events synced in from Google. */
  scope?: AgendaScope;
}

const OPEN_ACTION_STATUSES = new Set(['not_started', 'in_progress']);
const OPEN_REQUEST_STATUSES = new Set(['requested', 'in_progress']);
const OPEN_DEADLINE_STATUSES = new Set(['upcoming', 'action_needed', 'overdue']);

function localeTag(locale: FunnelLocale): string {
  return locale === 'es' ? 'es-US' : locale === 'vi' ? 'vi-VN' : 'en-US';
}

/** A calendar date, formatted in the family's own language and timezone. */
export function formatDay(dateKey: string, now: Date, locale: FunnelLocale): string {
  const L = picker(locale);
  const today = dayKey(now);
  if (dateKey === today) return L('Today', 'Hoy', 'Hôm nay');
  const tomorrow = dayKey(new Date(now.getTime() + MS_PER_DAY));
  if (dateKey === tomorrow) return L('Tomorrow', 'Mañana', 'Ngày mai');
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(localeTag(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string, locale: FunnelLocale): string {
  return new Date(iso).toLocaleTimeString(localeTag(locale), {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysFrom(now: Date, dateKey: string): number {
  const start = new Date(`${dayKey(now)}T12:00:00`).getTime();
  return Math.round((new Date(`${dateKey}T12:00:00`).getTime() - start) / MS_PER_DAY);
}

/** Every dated and undated obligation, flattened once. */
function collectEntries(input: PlanInput): PlanEntry[] {
  const locale = input.locale ?? 'en';
  const L = picker(locale);
  const { now } = input;
  const scope = input.scope ?? 'all';
  const out: PlanEntry[] = [];

  for (const a of input.appointments) {
    if (scope === 'waypoint' && a.source === 'google') continue;
    const key = dayKey(new Date(a.start_time));
    out.push({
      id: `appointment:${a.id}`,
      kind: 'appointment',
      title: a.title,
      source: a.source === 'google'
        ? L('Synced calendar', 'Calendario sincronizado', 'Lịch đã đồng bộ')
        : L('Your calendar', 'Su calendario', 'Lịch của quý vị'),
      dateKey: key,
      dayLabel: formatDay(key, now, locale),
      time: formatTime(a.start_time, locale),
      done: false,
      target: { screen: 'CalendarMain', tab: 'Calendar' },
    });
  }

  for (const d of input.deadlines) {
    if (!OPEN_DEADLINE_STATUSES.has(d.status)) continue;
    const key = d.due_date.slice(0, 10);
    out.push({
      id: `deadline:${d.id}`,
      kind: 'deadline',
      title: d.title,
      source: L('Deadline you track', 'Plazo que registra', 'Thời hạn quý vị theo dõi'),
      dateKey: key,
      dayLabel: formatDay(key, now, locale),
      time: null,
      done: false,
      target: { screen: 'CalendarMain', tab: 'Calendar' },
    });
  }

  for (const a of input.actions) {
    if (!OPEN_ACTION_STATUSES.has(a.status)) continue;
    const key = a.due_date ? a.due_date.slice(0, 10) : null;
    out.push({
      id: `action:${a.id}`,
      kind: 'action',
      title: a.title,
      source: L('Your plan', 'Su plan', 'Kế hoạch của quý vị'),
      dateKey: key,
      dayLabel: key ? formatDay(key, now, locale) : null,
      time: null,
      done: false,
      target: { screen: 'ActionDetail', tab: 'Tracker', params: { actionId: a.id } },
    });
  }

  return out;
}

/**
 * The clocks an agency is running against. These are not the family's work —
 * they are what the family is owed — so they get their own section rather
 * than sitting in a to-do list they cannot act on.
 */
function waitingEntries(input: PlanInput): PlanEntry[] {
  const locale = input.locale ?? 'en';
  const L = picker(locale);
  const out: PlanEntry[] = [];
  for (const r of input.requests ?? []) {
    if (!OPEN_REQUEST_STATUSES.has(r.status)) continue;
    const dl = deadlineFor(r.request_type, r.requested_on, input.now);
    if (!dl) continue;
    out.push({
      id: `clock:${r.id}`,
      kind: 'clock',
      title: dl.overdue
        ? L(
            `An answer on ${r.title} is past due`,
            `La respuesta sobre ${r.title} está vencida`,
            `Câu trả lời về ${r.title} đã quá hạn`
          )
        : L(
            `An answer on ${r.title} is due ${formatDay(dl.dueOn, input.now, locale)}`,
            `La respuesta sobre ${r.title} vence el ${formatDay(dl.dueOn, input.now, locale)}`,
            `Câu trả lời về ${r.title} đến hạn ${formatDay(dl.dueOn, input.now, locale)}`
          ),
      // The citation is the provenance: the family can check the law.
      source: dl.citation,
      dateKey: dl.dueOn,
      dayLabel: formatDay(dl.dueOn, input.now, locale),
      time: null,
      done: false,
      target: { screen: 'RequestCase', params: { requestId: r.id } },
    });
  }
  return out;
}

function sectionLabel(key: PlanSectionKey, locale: FunnelLocale): string {
  const L = picker(locale);
  switch (key) {
    case 'overdue':
      return L('Past due', 'Vencido', 'Đã quá hạn');
    case 'today':
      return L('Today', 'Hoy', 'Hôm nay');
    case 'week':
      return L('This week', 'Esta semana', 'Tuần này');
    case 'upcoming':
      return L('Coming up', 'Próximamente', 'Sắp tới');
    case 'waiting':
      return L('Waiting on an agency', 'Esperando a una agencia', 'Đang chờ cơ quan');
    case 'undated':
      return L('Steps with no date yet', 'Pasos sin fecha aún', 'Bước chưa có ngày');
    case 'later':
      return L('Later — set aside by you', 'Más tarde — apartado por usted', 'Để sau — quý vị đã để lại');
  }
}

function sortEntries(entries: PlanEntry[]): PlanEntry[] {
  return [...entries].sort((a, b) => {
    if (a.dateKey && b.dateKey && a.dateKey !== b.dateKey) {
      return a.dateKey.localeCompare(b.dateKey);
    }
    if (a.time && b.time && a.time !== b.time) return a.time.localeCompare(b.time);
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function buildPlan(input: PlanInput): PlanView {
  const locale = input.locale ?? 'en';
  const L = picker(locale);
  const dated = collectEntries(input);
  const waiting = waitingEntries(input);

  const buckets: Record<PlanSectionKey, PlanEntry[]> = {
    overdue: [], today: [], week: [], upcoming: [], waiting: [], undated: [], later: [],
  };

  for (const e of dated) {
    if (!e.dateKey) {
      buckets.undated.push(e);
      continue;
    }
    const days = daysFrom(input.now, e.dateKey);
    if (days < 0) buckets.overdue.push(e);
    else if (days === 0) buckets.today.push(e);
    else if (days <= WEEK_DAYS) buckets.week.push(e);
    else buckets.upcoming.push(e);
  }

  buckets.waiting = sortEntries(waiting);

  for (const l of input.later ?? []) {
    buckets.later.push({
      id: l.id,
      kind: 'later',
      title: l.title,
      source: L(
        `Comes back ${formatDay(l.returnsOn, input.now, locale)}`,
        `Vuelve ${formatDay(l.returnsOn, input.now, locale)}`,
        `Quay lại ${formatDay(l.returnsOn, input.now, locale)}`
      ),
      dateKey: null,
      dayLabel: null,
      time: null,
      done: false,
      returnsOn: l.returnsOn,
    });
  }

  const order: PlanSectionKey[] = [
    'overdue', 'today', 'week', 'upcoming', 'waiting', 'undated', 'later',
  ];
  const sections = order
    .map((key) => ({
      key,
      label: sectionLabel(key, locale),
      entries: key === 'waiting' || key === 'later' ? buckets[key] : sortEntries(buckets[key]),
    }))
    .filter((s) => s.entries.length > 0);

  const allDated = sortEntries([...dated.filter((e) => e.dateKey), ...waiting]);
  const upcomingDated = allDated.filter((e) => daysFrom(input.now, e.dateKey!) >= 0);

  return {
    sections,
    isEmpty: sections.length === 0,
    emptyLine: L(
      'Nothing to do and nothing scheduled. When you ask an agency for something, its clock appears here.',
      'Nada que hacer y nada programado. Cuando pida algo a una agencia, su plazo aparecerá aquí.',
      'Không có việc gì và không có lịch hẹn. Khi quý vị đề nghị điều gì với một cơ quan, thời hạn của nó sẽ hiện ở đây.'
    ),
    nextDated: upcomingDated[0] ?? allDated[0] ?? null,
  };
}

// ─── The month grid ─────────────────────────────────────────────────────────

export interface MonthCell {
  /** null for the blank cells before the 1st. */
  day: number | null;
  dateKey: string | null;
  isToday: boolean;
  /** One per item on that day, capped for display by the view. */
  markers: PlanEntryKind[];
  count: number;
}

export interface MonthGrid {
  year: number;
  month: number;
  label: string;
  weekdayLabels: string[];
  cells: MonthCell[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Every dated entry, keyed by day — the grid and the day list share it. */
export function entriesByDay(input: PlanInput): Record<string, PlanEntry[]> {
  const all = [...collectEntries(input), ...waitingEntries(input)];
  const out: Record<string, PlanEntry[]> = {};
  for (const e of all) {
    if (!e.dateKey) continue;
    (out[e.dateKey] ??= []).push(e);
  }
  for (const key of Object.keys(out)) out[key] = sortEntries(out[key]);
  return out;
}

export function buildMonth(input: PlanInput, year: number, month: number): MonthGrid {
  const locale = input.locale ?? 'en';
  const byDay = entriesByDay(input);
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = dayKey(input.now);

  const cells: MonthCell[] = [];
  for (let i = 0; i < first.getDay(); i++) {
    cells.push({ day: null, dateKey: null, isToday: false, markers: [], count: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad(month + 1)}-${pad(d)}`;
    const items = byDay[key] ?? [];
    cells.push({
      day: d,
      dateKey: key,
      isToday: key === today,
      markers: items.map((i) => i.kind),
      count: items.length,
    });
  }

  const weekdayLabels: string[] = [];
  // Built from a real week so the labels localize instead of being hardcoded.
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 1, 1 + i); // Feb 1 2026 is a Sunday
    weekdayLabels.push(
      d.toLocaleDateString(localeTag(locale), { weekday: 'narrow' })
    );
  }

  return {
    year,
    month,
    label: first.toLocaleDateString(localeTag(locale), { month: 'long', year: 'numeric' }),
    weekdayLabels,
    cells,
  };
}

/**
 * The month Plan should open on: the one holding the next thing, so a family
 * whose next date is three weeks out does not land on an empty grid.
 */
export function monthOfNextItem(input: PlanInput): { year: number; month: number } {
  const plan = buildPlan(input);
  const key = plan.nextDated?.dateKey;
  if (!key) return { year: input.now.getFullYear(), month: input.now.getMonth() };
  const d = new Date(`${key}T12:00:00`);
  return { year: d.getFullYear(), month: d.getMonth() };
}
