/**
 * Statutory clocks per request type (PRD W-G: G4) — pure date math with the
 * same honesty rule as the process map: when the law puts no deadline on a
 * request, we say so instead of inventing one, and hand the family the
 * lever that creates pressure anyway.
 */

export type RequestType =
  | 'rc_intake'
  | 'rc_assessment'
  | 'ipp_meeting'
  | 'service_request'
  | 'authorization'
  | 'reimbursement'
  | 'iep_evaluation'
  | 'other';

/**
 * What a clock runs from. Most run from the family's request. The Regional
 * Center assessment runs from intake (W&I §4643: "following initial intake"),
 * which itself may come up to 15 working days after the request.
 */
export type ClockAnchor = 'request' | 'intake';

/** The working days the law allows for intake after a request (W&I §4642). */
export const INTAKE_WORKING_DAYS = 15;

export interface RequestClock {
  /** Days the law allows, from the anchor date. */
  days: number;
  anchor: ClockAnchor;
  citation: string;
  label: string;
}

/** Letter template that escalates each request type (letters catalog keys). */
export const REQUEST_LEVERS: Record<RequestType, { template: string; label: string }> = {
  rc_intake: { template: 'rc_timeline_followup', label: 'Follow up in writing' },
  rc_assessment: { template: 'rc_timeline_followup', label: 'Follow up on the 120-day clock' },
  ipp_meeting: { template: 'ipp_review_request', label: 'Re-send the 30-day request' },
  service_request: { template: 'noa_request', label: 'Request a written Notice of Action' },
  authorization: { template: 'noa_request', label: 'Request a written Notice of Action' },
  reimbursement: { template: 'rc_request', label: 'Follow up in writing' },
  iep_evaluation: { template: 'assessment_request', label: 'Follow up on the 15-day clock' },
  other: { template: 'general', label: 'Put it in writing' },
};

const CLOCKS: Partial<Record<RequestType, RequestClock>> = {
  rc_assessment: {
    days: 120,
    anchor: 'intake',
    citation: 'W&I §4643',
    label: 'Assessment due within 120 days of intake (60 if delay is risky)',
  },
  ipp_meeting: {
    days: 30,
    anchor: 'request',
    citation: 'W&I §4646.5(b)',
    label: 'Meeting must be held within 30 days of your request',
  },
  iep_evaluation: {
    days: 15,
    anchor: 'request',
    citation: 'Ed Code §56321',
    label: 'Assessment plan due within 15 calendar days',
  },
};

/** Days the law allows for this kind of request, or null when it sets none. */
export function statutoryDays(type: RequestType): number | null {
  return CLOCKS[type]?.days ?? null;
}

/** What a request type's clock runs from; 'request' when it has no clock. */
export function clockAnchor(type: RequestType): ClockAnchor {
  return CLOCKS[type]?.anchor ?? 'request';
}

/**
 * Where a due date came from: the request, a logged intake, or — intake not
 * logged yet — the latest date the law allows (request + 15 working days for
 * intake + the clock), so the app is never early.
 */
export type DeadlineBasis = 'request' | 'intake' | 'latest';

export interface RequestDeadline {
  dueOn: string; // ISO date
  basis: DeadlineBasis;
  daysRemaining: number; // negative = overdue
  overdue: boolean;
  citation: string;
  label: string;
}

function addDays(iso: string, days: number): Date {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** The `nth` (1-based; -1 = last) `weekday` (0 = Sun) of a month, as ISO. */
function nthWeekday(year: number, month: number, weekday: number, nth: number): string {
  if (nth > 0) {
    const d = new Date(year, month, 1);
    d.setDate(1 + ((weekday - d.getDay() + 7) % 7) + (nth - 1) * 7);
    return isoOf(d);
  }
  const d = new Date(year, month + 1, 0);
  d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
  return isoOf(d);
}

/** A fixed-date holiday, moved to Friday or Monday when it falls on a weekend. */
function observed(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return isoOf(d);
}

/**
 * California state holidays (the Government Code's list, with Juneteenth)
 * that fall on a fixed rule. A Regional Center is a private nonprofit and may close on
 * other days, or work one of these, so a count built on them is still an
 * estimate — but skipping a day only ever moves a date later, never earlier.
 */
function stateHolidays(year: number): Set<string> {
  const thanksgiving = nthWeekday(year, 10, 4, 4);
  const dayAfter = new Date(`${thanksgiving}T00:00:00`);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return new Set([
    observed(year, 0, 1), // New Year's Day
    nthWeekday(year, 0, 1, 3), // Martin Luther King Jr. Day
    nthWeekday(year, 1, 1, 3), // Presidents' Day
    observed(year, 2, 31), // César Chávez Day
    nthWeekday(year, 4, 1, -1), // Memorial Day
    observed(year, 5, 19), // Juneteenth
    observed(year, 6, 4), // Independence Day
    nthWeekday(year, 8, 1, 1), // Labor Day
    nthWeekday(year, 8, 5, 4), // Native American Day
    observed(year, 10, 11), // Veterans Day
    thanksgiving,
    isoOf(dayAfter), // Day after Thanksgiving
    observed(year, 11, 25), // Christmas Day
  ]);
}

/**
 * The local calendar date `n` working days after `iso`: weekdays that are
 * not California state holidays. Offices can close on other days too, so a
 * date built on this is shown to families as an estimate.
 */
export function addWorkingDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  const holidays = new Map<number, Set<string>>();
  const isHoliday = (day: Date) => {
    const y = day.getFullYear();
    if (!holidays.has(y)) holidays.set(y, stateHolidays(y));
    return holidays.get(y)!.has(isoOf(day));
  };
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6 && !isHoliday(d)) left -= 1;
  }
  return isoOf(d);
}

/**
 * The deadline for a request, or null when no statutory clock applies —
 * null is an honest answer, not a gap. An intake-anchored clock runs from
 * `intakeOn` when the family has logged it, and otherwise from the latest
 * day intake could lawfully have happened.
 */
export function deadlineFor(
  type: RequestType,
  requestedOn: string,
  now = new Date(),
  intakeOn?: string | null
): RequestDeadline | null {
  const clock = CLOCKS[type];
  if (!clock) return null;
  let start = requestedOn;
  let basis: DeadlineBasis = 'request';
  if (clock.anchor === 'intake') {
    if (intakeOn && /^\d{4}-\d{2}-\d{2}$/.test(intakeOn)) {
      start = intakeOn;
      basis = 'intake';
    } else {
      start = addWorkingDays(requestedOn, INTAKE_WORKING_DAYS);
      basis = 'latest';
    }
  }
  const due = addDays(start, clock.days);
  const msPerDay = 24 * 60 * 60 * 1000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysRemaining = Math.round((due.getTime() - today.getTime()) / msPerDay);
  return {
    // Local calendar date, never a UTC slice: `due` is built at local
    // midnight, so toISOString() moved the statutory date back a day on
    // every UTC+ device — a citation attached to a date the law never gave.
    dueOn: isoOf(due),
    basis,
    daysRemaining,
    overdue: daysRemaining < 0,
    citation: clock.citation,
    label: clock.label,
  };
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  rc_intake: 'Regional Center application',
  rc_assessment: 'RC assessment / eligibility',
  ipp_meeting: 'IPP meeting request',
  service_request: 'Service request',
  authorization: 'Authorization',
  reimbursement: 'Reimbursement',
  iep_evaluation: 'IEP evaluation request',
  other: 'Other request',
};
