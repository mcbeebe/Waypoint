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

/**
 * The local calendar date `n` working days (Mon–Fri) after `iso`. Weekends
 * only: a state holiday inside the window moves the real date later still,
 * which is why a date built on this is shown as the latest estimate.
 */
export function addWorkingDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left -= 1;
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
