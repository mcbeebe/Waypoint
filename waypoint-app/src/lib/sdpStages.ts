/**
 * The SDP case pipeline (PRD W-C: C1/C2) — the 5 working stages a
 * facilitated family moves through, with the bookends. Pure data +
 * derivation; the case detail header and caseload ranking both read from
 * here so the pipeline can never render two different ways.
 */
import type { SdpCase, SdpCaseStage } from '@/types/database';

export interface StageInfo {
  stage: SdpCaseStage;
  label: string;
  /** What done looks like for this stage — the facilitator's next action. */
  exit: string;
}

/** The working pipeline, in order (intake/closed are bookends, not shown). */
export const SDP_PIPELINE: StageInfo[] = [
  { stage: 'orientation', label: 'Orientation', exit: 'Family completes SCDD orientation Parts A + B and holds both certificates (D-2026-SDP-002)' },
  { stage: 'pcp', label: 'Person-centered plan', exit: 'PCP complete and submitted (code 024, up to $1,000)' },
  { stage: 'budget_certification', label: 'Budget', exit: 'RC certifies the annual budget' },
  { stage: 'spending_plan', label: 'Spending plan', exit: 'Plan sums to the certified budget; FMS onboarded' },
  { stage: 'active', label: 'Active', exit: 'Services running; facilitation ongoing at the agreed price' },
];

/** Index of a case's stage within the working pipeline (-1 for bookends). */
export function pipelineIndex(stage: SdpCaseStage): number {
  return SDP_PIPELINE.findIndex((s) => s.stage === stage);
}

/** The facilitator's next concrete move for a case, stage-aware. */
export function nextActionFor(c: Pick<SdpCase, 'stage' | 'pcp_completed_at' | 'certified_budget_cents' | 'agreed_annual_price_cents'>): string {
  switch (c.stage) {
    case 'intake':
      return 'Book the intro call and confirm SDP eligibility';
    case 'orientation':
      return 'Register the family for SCDD orientation Part A (then B — both certificates required)';
    case 'pcp':
      return c.pcp_completed_at
        ? 'Submit the PCP and invoice code 024'
        : 'Continue the person-centered plan';
    case 'budget_certification':
      return 'Assemble the 12-month authorization history + documented unmet needs';
    case 'spending_plan':
      return c.agreed_annual_price_cents
        ? 'Finalize the spending plan against the certified budget'
        : 'Agree the facilitation price with the family, then finalize the plan';
    case 'active':
      return 'Ongoing facilitation — log time as you go';
    case 'closed':
      return 'Case closed';
  }
}
