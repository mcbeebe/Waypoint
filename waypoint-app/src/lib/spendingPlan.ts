/**
 * Spending-plan validation (PRD W-C: C5) — the plan must sum to the
 * certified budget, errors are money-denominated with a remedy ("over by
 * $2,140 — trim a line"), and the operating organization can NEVER appear
 * as a provider (W&I §4685.8 independence; the DB trigger in migration 039
 * is the backstop, this module is the explanation). Pure logic, no I/O.
 */
import type { SpendingPlanLine } from '@/types/database';

export type PlanIssueSeverity = 'error' | 'warning';

export interface PlanIssue {
  code:
    | 'no_budget'
    | 'over_budget'
    | 'unallocated'
    | 'coi_provider'
    | 'empty_line';
  severity: PlanIssueSeverity;
  message: string;
  /** Line id the issue anchors to, when line-specific. */
  lineId: string | null;
}

export interface PlanValidation {
  totalCents: number;
  budgetCents: number | null;
  /** positive = over budget, negative = unallocated */
  deltaCents: number;
  issues: PlanIssue[];
  /** Submittable: no errors and fully allocated within tolerance. */
  ready: boolean;
}

type Line = Pick<SpendingPlanLine, 'id' | 'category' | 'provider_name' | 'annual_amount_cents'>;

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const rem = abs % 100;
  return rem === 0 ? `${sign}$${dollars}` : `${sign}$${dollars}.${String(rem).padStart(2, '0')}`;
}

/** Unallocated money below this is a rounding note, not a warning. */
const UNALLOCATED_TOLERANCE_CENTS = 100;

export function validateSpendingPlan(
  lines: Line[],
  certifiedBudgetCents: number | null | undefined,
  operatingOrgName: string
): PlanValidation {
  const issues: PlanIssue[] = [];
  const totalCents = lines.reduce((sum, l) => sum + l.annual_amount_cents, 0);
  const budgetCents = certifiedBudgetCents ?? null;

  const orgNorm = operatingOrgName.trim().toLowerCase();
  for (const line of lines) {
    if (line.provider_name.trim().toLowerCase() === orgNorm) {
      issues.push({
        code: 'coi_provider',
        severity: 'error',
        lineId: line.id,
        message: `${operatingOrgName} facilitates this plan and cannot also be a provider on it — state law (W&I §4685.8) requires your facilitator to be independent of the services in the plan. Choose a different provider for "${line.category}".`,
      });
    }
    if (!line.provider_name.trim() || line.annual_amount_cents === 0) {
      issues.push({
        code: 'empty_line',
        severity: 'warning',
        lineId: line.id,
        message: `"${line.category}" has ${!line.provider_name.trim() ? 'no provider' : 'a $0 amount'} — finish it or remove it.`,
      });
    }
  }

  let deltaCents = 0;
  if (budgetCents === null) {
    issues.push({
      code: 'no_budget',
      severity: 'error',
      lineId: null,
      message: 'No certified budget on the case yet — certify the budget before building the spending plan.',
    });
  } else {
    deltaCents = totalCents - budgetCents;
    if (deltaCents > 0) {
      issues.push({
        code: 'over_budget',
        severity: 'error',
        lineId: null,
        message: `Over the certified budget by ${formatCents(deltaCents)} — trim a line by that amount, or request a budget adjustment through an IPP review first.`,
      });
    } else if (-deltaCents > UNALLOCATED_TOLERANCE_CENTS) {
      issues.push({
        code: 'unallocated',
        severity: 'warning',
        lineId: null,
        message: `${formatCents(-deltaCents)} of the certified budget is unallocated — money left off the plan is money the family can't direct.`,
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return {
    totalCents,
    budgetCents,
    deltaCents,
    issues,
    ready: !hasErrors && budgetCents !== null && Math.abs(deltaCents) <= UNALLOCATED_TOLERANCE_CENTS,
  };
}
