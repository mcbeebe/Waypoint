/**
 * SSI parent-to-child deeming — the simplified estimate behind the
 * /tools/ssi-deeming-calculator/ island.
 *
 * D4: every dollar figure comes from src/data/benefit-constants.json —
 * nothing hard-coded. The tool renders a "figures pending verification"
 * state whenever a needed current-year constant is null (the constants file
 * ships null-until-verified on purpose).
 *
 * Algorithm (simplified household estimate, stated on-page as an estimate,
 * not a benefits determination):
 *   1. Subtract a living allocation for each non-disabled child in the
 *      household (allocation = couple FBR − individual FBR), applied to
 *      unearned income first, then earned.
 *   2. Apply the $20 general exclusion (unearned first, remainder to
 *      earned), then the $65 earned-income exclusion, then halve the
 *      remaining earned income.
 *   3. Subtract the parental living allowance (individual FBR for one
 *      parent, couple FBR for two). What remains is deemed to the child.
 *   4. Estimated SSI = individual FBR − deemed amount, floored at $0.
 *
 * Step order cross-checked against POMS SI 01320.500 (2026-09-07): the
 * exclusions and the halving come BEFORE the parental living allowance.
 * The page prose stated the reverse until that review — a ~$500/mo
 * discrepancy against this function — so if you edit either, edit both:
 * /tools/ssi-deeming-calculator/ describes exactly these steps.
 *
 * Still deliberately simplified, and the page says so in the NoticeBox
 * beside every result: the child's own income, in-kind support and
 * maintenance, income-type distinctions, and California's state
 * supplement are all out of scope. This is an estimate, never a benefits
 * determination.
 */

export interface DeemingConstants {
  /** SSI federal benefit rate, individual, monthly. */
  fbrIndividual: number;
  /** SSI federal benefit rate, eligible couple, monthly. */
  fbrCouple: number;
  /** Deeming allocation per ineligible child (its own verified entry — not
   * derived here, so a verified value that differs from couple−individual
   * wins; D4). */
  childAllocation: number;
  /** $20 general income exclusion. */
  generalExclusion: number;
  /** $65 earned income exclusion. */
  earnedExclusion: number;
}

export interface DeemingInputs {
  parents: 1 | 2;
  /** Non-disabled children in the household (excluding the SSI applicant). */
  otherChildren: number;
  /** Parents' combined monthly gross earned income. */
  earnedMonthly: number;
  /** Monthly unearned income (unemployment, child support received, etc.). */
  unearnedMonthly: number;
}

export interface DeemingResult {
  /** Living allocations for non-disabled children. */
  childAllocations: number;
  /** Countable income after allocations + exclusions. */
  countableIncome: number;
  /** Parental living allowance subtracted before deeming. */
  parentalAllowance: number;
  /** Income deemed to the child. */
  deemedToChild: number;
  /** Estimated monthly SSI, floored at zero. */
  estimatedSsi: number;
}

/** Run the simplified deeming estimate. Inputs are clamped to ≥ 0. */
export function estimateDeeming(c: DeemingConstants, input: DeemingInputs): DeemingResult {
  const earned = Math.max(0, input.earnedMonthly);
  const unearned = Math.max(0, input.unearnedMonthly);
  const childAllocations = Math.max(0, input.otherChildren) * c.childAllocation;

  // Allocations reduce unearned income first, then earned.
  const unearnedAfterAlloc = Math.max(0, unearned - childAllocations);
  const earnedAfterAlloc = Math.max(0, earned - Math.max(0, childAllocations - unearned));

  // The general exclusion applies to unearned first; any unused remainder
  // carries over to earned income before the earned exclusion.
  const countableUnearned = Math.max(0, unearnedAfterAlloc - c.generalExclusion);
  const generalLeftover =
    unearnedAfterAlloc >= c.generalExclusion ? 0 : c.generalExclusion - unearnedAfterAlloc;
  const countableEarned = Math.max(0, earnedAfterAlloc - generalLeftover - c.earnedExclusion) / 2;

  const countableIncome = countableUnearned + countableEarned;
  const parentalAllowance = input.parents === 2 ? c.fbrCouple : c.fbrIndividual;
  const deemedToChild = Math.max(0, countableIncome - parentalAllowance);
  const estimatedSsi = Math.max(0, c.fbrIndividual - deemedToChild);

  return {
    childAllocations,
    countableIncome,
    parentalAllowance,
    deemedToChild,
    estimatedSsi,
  };
}
