/**
 * The Regional Center process map (PRD W-G: G1) — the system's business
 * process made legible: stages, statutory clocks, and the lever a family
 * can pull at each step. Pure data + derivation, no I/O.
 *
 * Every clock and rule here traces to statute or a DDS directive
 * (Roadmap/Assumptions-Audit-Aug2026.md; Regional Center Money Map). When
 * a step has no enforceable clock, we say so — false clocks destroy trust.
 */
import type { RcStatus } from '@/types/database';

export interface ProcessStage {
  key: string;
  title: string;
  /** Plain-language body, ~7th-grade reading level. */
  body: string;
  /** Statute or rule chip, e.g. "W&I §4643". Empty when none applies. */
  citation: string;
  /** The clock on this step, stated honestly ("no deadline" is valid). */
  clock: string;
  /** Letter template key (letters.ts) that pulls the lever at this step. */
  leverTemplate: string | null;
  /** Label for the lever button. */
  leverLabel: string | null;
}

/** Stage 0 + Path A — every family's spine. */
export const RC_STAGES: ProcessStage[] = [
  {
    key: 'intake',
    title: 'Contact the Regional Center',
    body: 'Under 3: Early Start. Age 3+: a Lanterman Act application. Regional Center services have no income test and cost families nothing.',
    citation: 'Lanterman Act',
    clock: 'You start this clock — apply in writing and keep the date.',
    leverTemplate: null,
    leverLabel: null,
  },
  {
    key: 'assessment',
    title: 'Assessment & eligibility decision',
    body: 'The Regional Center assesses whether your child has a qualifying disability that began before 18. A denial must come with appeal rights.',
    citation: 'W&I §4643',
    clock: 'Assessment within 120 days of intake — or 60 when delay is risky.',
    leverTemplate: 'rc_timeline_followup',
    leverLabel: 'Follow up on an overdue assessment',
  },
  {
    key: 'ipp',
    title: 'The IPP — where every service starts',
    body: 'The Individual Program Plan lists the services the Regional Center will provide. Nothing is purchasable unless it is in the IPP — and you can request a review meeting at any time, not just annually.',
    citation: 'W&I §4646 · §4646.5(b)',
    clock: 'IPP within 60 days of assessment. A requested review meeting: within 30 days.',
    leverTemplate: 'ipp_review_request',
    leverLabel: 'Request an IPP meeting (30-day clock)',
  },
  {
    key: 'services',
    title: 'Services get authorized — or denied',
    body: 'Each IPP service becomes a written authorization to a provider. A verbal "no" is not a decision: you are entitled to it in writing, with your appeal rights.',
    citation: 'W&I §4710',
    clock: 'No fixed clock on authorizations — put requests in writing and track them.',
    leverTemplate: 'noa_request',
    leverLabel: 'Demand a written Notice of Action',
  },
];

/** The fork: what most families are never told. */
export const SDP_FORK: ProcessStage = {
  key: 'sdp',
  title: 'The path nobody mentions: Self-Determination',
  body: 'Instead of the Regional Center buying services one authorization at a time, your child’s services can become an annual budget your family directs. Nearly every Regional Center child qualifies — about 1.5% are enrolled. Your starting budget is built from the last 12 months of authorized services plus unmet needs documented in the IPP, so document needs BEFORE converting.',
  citation: 'W&I §4685.8',
  clock: 'No enforceable clock on enrollment — typically 3–12 months. The 30-day IPP-meeting rule is your lever at every step.',
  leverTemplate: 'sdp_info_request',
  leverLabel: 'Ask about Self-Determination in writing',
};

/**
 * Where "you are here" points, from the child's Regional Center status
 * captured at onboarding (children.rc_status).
 */
export function deriveStageIndex(rcStatus: RcStatus | null | undefined): number {
  switch (rcStatus) {
    case 'applied':
      return 1; // waiting on assessment/eligibility — the §4643 clock matters now
    case 'active':
      return 2; // consumer with (or due) an IPP — the meeting lever matters now
    case 'known':
    case 'unknown':
    default:
      return 0; // not yet applied
  }
}

/** Whether the SDP fork applies yet (only consumers can enroll). */
export function sdpAvailable(rcStatus: RcStatus | null | undefined): boolean {
  return rcStatus === 'active';
}
