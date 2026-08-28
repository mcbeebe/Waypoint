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

export interface RequestClock {
  /** Days the law allows, from the request date. */
  days: number;
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
    citation: 'W&I §4643',
    label: 'Assessment due within 120 days of intake (60 if delay is risky)',
  },
  ipp_meeting: {
    days: 30,
    citation: 'W&I §4646.5(b)',
    label: 'Meeting must be held within 30 days of your request',
  },
  iep_evaluation: {
    days: 15,
    citation: 'Ed Code §56321',
    label: 'Assessment plan due within 15 calendar days',
  },
};

export interface RequestDeadline {
  dueOn: string; // ISO date
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

/**
 * The deadline for a request, or null when no statutory clock applies —
 * null is an honest answer, not a gap.
 */
export function deadlineFor(
  type: RequestType,
  requestedOn: string,
  now = new Date()
): RequestDeadline | null {
  const clock = CLOCKS[type];
  if (!clock) return null;
  const due = addDays(requestedOn, clock.days);
  const msPerDay = 24 * 60 * 60 * 1000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysRemaining = Math.round((due.getTime() - today.getTime()) / msPerDay);
  return {
    dueOn: due.toISOString().slice(0, 10),
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
