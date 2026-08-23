/**
 * Explainable caseload ranking (PRD W-C: C1) — who needs attention today
 * and WHY. Every score decomposes into human-readable reasons; the "see how
 * this is ranked" affordance renders exactly the factors below, so the
 * ranking can never be a black box. Pure logic, no I/O.
 *
 * Factors (each 0–100, weighted):
 *   deadline proximity  an overdue or near statutory deadline dominates
 *   099 burn            close to the transition cap needs a decision
 *   contact staleness   days since last contact; silence compounds
 *   stage friction      stages where families stall get a base boost
 */
import type { SdpCaseStage } from '@/types/database';

export interface CaseloadSignal {
  caseId: string;
  familyName: string;
  stage: SdpCaseStage;
  /** Days to nearest statutory deadline; negative = overdue; null = none. */
  nextDeadlineDays: number | null;
  /** 0–100 of the effective 099 cap. */
  pct099Used: number;
  daysSinceContact: number | null;
}

export interface RankedCase {
  caseId: string;
  familyName: string;
  stage: SdpCaseStage;
  score: number;
  /** Ordered, human-readable — the row shows reasons[0]. */
  reasons: string[];
}

const WEIGHTS = { deadline: 0.4, burn: 0.25, contact: 0.25, stage: 0.1 };

/** Stages where cases historically stall (documented-needs work, RC waits). */
const FRICTION_STAGES: Partial<Record<SdpCaseStage, number>> = {
  budget_certification: 100,
  pcp: 70,
  orientation: 50,
  spending_plan: 60,
  intake: 40,
  active: 10,
};

function deadlineScore(days: number | null): number {
  if (days === null) return 0;
  if (days < 0) return 100; // overdue
  if (days <= 7) return 90;
  if (days <= 14) return 70;
  if (days <= 30) return 40;
  return 10;
}

function contactScore(days: number | null): number {
  if (days === null) return 60; // never contacted is itself a flag
  if (days >= 30) return 100;
  if (days >= 14) return 70;
  if (days >= 7) return 40;
  return 0;
}

export function rankCaseload(signals: CaseloadSignal[]): RankedCase[] {
  const ranked = signals.map((s) => {
    const dScore = deadlineScore(s.nextDeadlineDays);
    const bScore = s.pct099Used >= 100 ? 100 : s.pct099Used >= 80 ? 80 : s.pct099Used >= 50 ? 40 : 0;
    const cScore = contactScore(s.daysSinceContact);
    const sScore = FRICTION_STAGES[s.stage] ?? 0;

    const score = Math.round(
      dScore * WEIGHTS.deadline +
        bScore * WEIGHTS.burn +
        cScore * WEIGHTS.contact +
        sScore * WEIGHTS.stage
    );

    // Reasons in factor-score order, only the ones actually firing.
    const reasons: Array<[number, string]> = [];
    if (s.nextDeadlineDays !== null) {
      if (s.nextDeadlineDays < 0)
        reasons.push([dScore * WEIGHTS.deadline, `Statutory deadline overdue by ${-s.nextDeadlineDays}d`]);
      else if (s.nextDeadlineDays <= 30)
        reasons.push([dScore * WEIGHTS.deadline, `Deadline in ${s.nextDeadlineDays}d`]);
    }
    if (s.pct099Used >= 80)
      reasons.push([bScore * WEIGHTS.burn, `099 hours at ${Math.round(s.pct099Used)}% of cap`]);
    if (s.daysSinceContact === null)
      reasons.push([cScore * WEIGHTS.contact, 'No contact logged yet']);
    else if (s.daysSinceContact >= 14)
      reasons.push([cScore * WEIGHTS.contact, `No contact in ${s.daysSinceContact}d`]);
    if ((FRICTION_STAGES[s.stage] ?? 0) >= 70)
      reasons.push([sScore * WEIGHTS.stage, `In ${s.stage.replace(/_/g, ' ')} — where cases stall`]);
    if (reasons.length === 0) reasons.push([0, 'On track']);

    reasons.sort((a, b) => b[0] - a[0]);
    return {
      caseId: s.caseId,
      familyName: s.familyName,
      stage: s.stage,
      score,
      reasons: reasons.map(([, r]) => r),
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/** The transparency copy behind "see how this is ranked" (C1). */
export const RANKING_EXPLANATION =
  'Ranked by: statutory deadline proximity (40%), 099 transition-hour burn (25%), days since last contact (25%), and stage friction (10%). Every row shows its top reason.';
