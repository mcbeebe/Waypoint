/**
 * Recurring-appointment expansion + overlap detection (Phase-5 depth).
 *
 * Recurrence is stored on the base appointment row (weekly / biweekly /
 * monthly, with an optional until date) and expanded client-side into
 * virtual occurrences for whatever window the calendar is showing —
 * no materialized rows, so editing the base edits the whole series.
 */

export type RecurrenceRule = 'weekly' | 'biweekly' | 'monthly';

export interface RecurringSource {
  id: string;
  start_time: string;              // ISO datetime of the FIRST occurrence
  end_time: string | null;
  recurrence: RecurrenceRule | null;
  recurrence_until: string | null; // YYYY-MM-DD, inclusive; null = open-ended
}

export interface Occurrence {
  /** Base row id for real instances; `${id}::${YYYY-MM-DD}` for virtual ones */
  occurrenceId: string;
  sourceId: string;
  start_time: string;
  end_time: string | null;
  /** True for every expanded instance after the first */
  isVirtual: boolean;
}

const RULE_STEP_DAYS: Record<Exclude<RecurrenceRule, 'monthly'>, number> = {
  weekly: 7,
  biweekly: 14,
};

// Safety valve: never expand a series into more instances than this
const MAX_OCCURRENCES = 500;

function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Expand one (possibly recurring) appointment into the occurrences that
 * fall inside [rangeStart, rangeEnd]. A non-recurring appointment yields
 * itself when in range. Monthly recurrence keeps the day-of-month and
 * skips months that don't have it (Jan 31 → skips Feb).
 */
export function expandOccurrences(
  appt: RecurringSource,
  rangeStartISO: string,
  rangeEndISO: string
): Occurrence[] {
  const rangeStart = new Date(rangeStartISO).getTime();
  const rangeEnd = new Date(rangeEndISO).getTime();
  const base = new Date(appt.start_time);
  const durationMs = appt.end_time
    ? new Date(appt.end_time).getTime() - base.getTime()
    : 0;

  const emit = (start: Date, first: boolean): Occurrence => ({
    occurrenceId: first ? appt.id : `${appt.id}::${localDateKey(start)}`,
    sourceId: appt.id,
    start_time: start.toISOString(),
    end_time: durationMs > 0 ? new Date(start.getTime() + durationMs).toISOString() : null,
    isVirtual: !first,
  });

  if (!appt.recurrence) {
    const t = base.getTime();
    return t >= rangeStart && t <= rangeEnd ? [emit(base, true)] : [];
  }

  const untilMs = appt.recurrence_until
    ? new Date(appt.recurrence_until + 'T23:59:59').getTime()
    : Infinity;
  const hardStop = Math.min(rangeEnd, untilMs);

  const out: Occurrence[] = [];
  if (appt.recurrence === 'monthly') {
    const wantedDay = base.getDate();
    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      const d = new Date(base);
      d.setMonth(base.getMonth() + i);
      // setMonth overflow (e.g. Jan 31 + 1mo → Mar 3) means the month
      // lacks that day — skip it rather than drifting
      if (d.getDate() !== wantedDay) continue;
      const t = d.getTime();
      if (t > hardStop) break;
      if (t >= rangeStart) out.push(emit(d, i === 0));
    }
    return out;
  }

  const stepMs = RULE_STEP_DAYS[appt.recurrence] * 86400000;
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    const t = base.getTime() + i * stepMs;
    if (t > hardStop) break;
    if (t >= rangeStart) out.push(emit(new Date(t), i === 0));
  }
  return out;
}

// ─── Overlap detection ──────────────────────────────────────────────────────

export interface OverlapCandidate {
  start_time: string;
  end_time?: string | null;
}

export interface OverlappableEvent {
  title: string;
  start_time: string;
  end_time: string | null;
}

/** Assumed length for events without an end time. */
export const DEFAULT_EVENT_MINUTES = 60;

/**
 * Events whose time window collides with the candidate's.
 * Two windows overlap when each starts before the other ends
 * (pure back-to-back — 3:00–4:00 then 4:00–5:00 — is NOT an overlap).
 */
export function findOverlaps<T extends OverlappableEvent>(
  candidate: OverlapCandidate,
  events: T[],
  defaultMinutes: number = DEFAULT_EVENT_MINUTES
): T[] {
  const defMs = defaultMinutes * 60000;
  const aStart = new Date(candidate.start_time).getTime();
  const aEnd = candidate.end_time ? new Date(candidate.end_time).getTime() : aStart + defMs;

  return events.filter((ev) => {
    const bStart = new Date(ev.start_time).getTime();
    const bEnd = ev.end_time ? new Date(ev.end_time).getTime() : bStart + defMs;
    return aStart < bEnd && bStart < aEnd;
  });
}
