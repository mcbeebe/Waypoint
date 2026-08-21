/**
 * "What's on deck" — the day and week at a glance.
 *
 * Parents open Waypoint mid-crisis with no attention to spare. This turns
 * the full plan into the two questions that actually matter right now:
 * what's happening today, and what should I work on next.
 *
 * Pure module — no react-native imports — so it stays unit-testable.
 */

export interface AgendaAction {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
}

export interface AgendaAppointment {
  id: string;
  title: string;
  start_time: string;
  appointment_type?: string | null;
  location?: string | null;
}

export interface AgendaDeadline {
  id: string;
  title: string;
  due_date: string;
  status: string;
}

export interface AgendaInput {
  actions: AgendaAction[];
  appointments: AgendaAppointment[];
  deadlines: AgendaDeadline[];
  /** Injected so the view is deterministic in tests */
  now: Date;
}

export interface DaySummary {
  /** YYYY-MM-DD in local time */
  key: string;
  /** Single letter-ish weekday label, e.g. "Mo" */
  label: string;
  dayOfMonth: number;
  isToday: boolean;
  appointmentCount: number;
  /** Actions + deadlines falling due that day */
  dueCount: number;
}

export interface Agenda {
  todayAppointments: AgendaAppointment[];
  /** Actions due today (not yet finished) */
  todayActions: AgendaAction[];
  /** Deadlines landing today */
  todayDeadlines: AgendaDeadline[];
  /** Anything open whose date has already passed */
  overdue: AgendaAction[];
  /** The one thing to pick up if there's only energy for one */
  focus: AgendaAction | null;
  /** Seven days starting today */
  week: DaySummary[];
  /** True when today holds nothing at all */
  isClearToday: boolean;
}

const OPEN_STATUSES = new Set(['not_started', 'in_progress']);
const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-time YYYY-MM-DD — never UTC, or "today" drifts across timezones. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** A due_date column is a plain date; take its day part as written. */
function dueKey(due: string): string {
  return due.slice(0, 10);
}

export function buildAgenda(input: AgendaInput): Agenda {
  const { actions, appointments, deadlines, now } = input;
  const todayKey = dayKey(now);

  const openActions = actions.filter((a) => OPEN_STATUSES.has(a.status));

  const todayAppointments = appointments
    .filter((a) => dayKey(new Date(a.start_time)) === todayKey)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const todayActions = openActions.filter((a) => a.due_date && dueKey(a.due_date) === todayKey);

  const todayDeadlines = deadlines.filter(
    (d) => d.status !== 'completed' && dueKey(d.due_date) === todayKey
  );

  const overdue = openActions
    .filter((a) => a.due_date && dueKey(a.due_date) < todayKey)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));

  // Focus: overdue first, then due today, then whatever is most pressing —
  // ranked by priority, then by how soon it's due
  const byUrgency = (a: AgendaAction, b: AgendaAction) => {
    const pa = PRIORITY_RANK[a.priority] ?? 2;
    const pb = PRIORITY_RANK[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  };
  const focus =
    [...overdue].sort(byUrgency)[0] ??
    [...todayActions].sort(byUrgency)[0] ??
    [...openActions].sort(byUrgency)[0] ??
    null;

  const week: DaySummary[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i);
    const key = dayKey(d);
    return {
      key,
      label: WEEKDAY[d.getDay()],
      dayOfMonth: d.getDate(),
      isToday: i === 0,
      appointmentCount: appointments.filter((a) => dayKey(new Date(a.start_time)) === key).length,
      dueCount:
        openActions.filter((a) => a.due_date && dueKey(a.due_date) === key).length +
        deadlines.filter((dl) => dl.status !== 'completed' && dueKey(dl.due_date) === key).length,
    };
  });

  return {
    todayAppointments,
    todayActions,
    todayDeadlines,
    overdue,
    focus,
    week,
    isClearToday:
      todayAppointments.length === 0 &&
      todayActions.length === 0 &&
      todayDeadlines.length === 0 &&
      overdue.length === 0,
  };
}

/** "3 appointments · 2 due" — the week in one line, or null when it's clear. */
export function weekSummaryLine(week: DaySummary[]): string | null {
  const appts = week.reduce((n, d) => n + d.appointmentCount, 0);
  const due = week.reduce((n, d) => n + d.dueCount, 0);
  if (appts === 0 && due === 0) return null;
  const parts: string[] = [];
  if (appts > 0) parts.push(`${appts} appointment${appts === 1 ? '' : 's'}`);
  if (due > 0) parts.push(`${due} due`);
  return parts.join(' · ');
}
