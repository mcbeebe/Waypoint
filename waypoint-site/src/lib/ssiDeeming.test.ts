/**
 * Deeming-math tests against the KNOWN 2025 reference figures from
 * benefit-constants.json (`_2025_*` entries exist for exactly this — test
 * fixtures, never display). Scenario expectations follow the documented
 * simplified algorithm; [TBC: cross-check against POMS SI 01320.500 worked
 * examples during founder edit] (see ssiDeeming.ts header).
 */
import { describe, expect, it } from 'vitest';
import { estimateDeeming, type DeemingConstants } from './ssiDeeming';
import constants from '../data/benefit-constants.json';

const CHILD_ALLOC = constants._2025_ssi_child_allocation.value; // 483
const FBR_2025: DeemingConstants = {
  fbrIndividual: constants._2025_ssi_fbr_individual.value,
  fbrCouple: constants._2025_ssi_fbr_couple.value,
  childAllocation: CHILD_ALLOC,
  generalExclusion: constants.ssi_general_exclusion.value,
  earnedExclusion: constants.ssi_earned_exclusion.value,
};

describe('estimateDeeming (2025 reference figures)', () => {
  it('zero income → full individual FBR', () => {
    const r = estimateDeeming(FBR_2025, {
      parents: 2,
      otherChildren: 0,
      earnedMonthly: 0,
      unearnedMonthly: 0,
    });
    expect(r.deemedToChild).toBe(0);
    expect(r.estimatedSsi).toBe(FBR_2025.fbrIndividual);
  });

  it('child allocation equals couple FBR minus individual FBR', () => {
    const r = estimateDeeming(FBR_2025, {
      parents: 2,
      otherChildren: 2,
      earnedMonthly: 5000,
      unearnedMonthly: 0,
    });
    expect(r.childAllocations).toBe(2 * CHILD_ALLOC);
  });

  it('two-parent household, one other child, $6,200 earned (prototype scenario)', () => {
    // Hand-computed per the documented algorithm:
    // alloc 483 → earned 6200-483 = 5717; exclusions 20+65 → 5632; halved 2816
    // minus couple allowance 1450 → deemed 1366 → SSI = max(0, 967-1366) = 0.
    const r = estimateDeeming(FBR_2025, {
      parents: 2,
      otherChildren: 1,
      earnedMonthly: 6200,
      unearnedMonthly: 0,
    });
    expect(r.countableIncome).toBe(2816);
    expect(r.deemedToChild).toBe(1366);
    expect(r.estimatedSsi).toBe(0);
  });

  it('single parent, modest earned income → partial benefit', () => {
    // 0 alloc; earned 2500 - 20 - 65 = 2415; halved 1207.5; minus individual
    // allowance 967 → deemed 240.5 → SSI 967 - 240.5 = 726.5.
    const r = estimateDeeming(FBR_2025, {
      parents: 1,
      otherChildren: 0,
      earnedMonthly: 2500,
      unearnedMonthly: 0,
    });
    expect(r.estimatedSsi).toBeCloseTo(726.5, 5);
  });

  it('$20 general exclusion applies to unearned first, remainder to earned', () => {
    // unearned 10 → countable unearned 0, leftover 10 carries to earned:
    // earned 1000 - 10 - 65 = 925 → halved 462.5.
    const r = estimateDeeming(FBR_2025, {
      parents: 1,
      otherChildren: 0,
      earnedMonthly: 1000,
      unearnedMonthly: 10,
    });
    expect(r.countableIncome).toBeCloseTo(462.5, 5);
  });

  it('allocations reduce unearned before earned', () => {
    // alloc 483 vs unearned 400: unearned → 0, remaining 83 comes off earned.
    const r = estimateDeeming(FBR_2025, {
      parents: 2,
      otherChildren: 1,
      earnedMonthly: 2000,
      unearnedMonthly: 400,
    });
    // earned after alloc: 2000 - 83 = 1917; general leftover 20 (unearned 0);
    // 1917 - 20 - 65 = 1832 → 916; unearned countable 0.
    expect(r.countableIncome).toBeCloseTo(916, 5);
  });

  it('negative inputs are clamped to zero', () => {
    const r = estimateDeeming(FBR_2025, {
      parents: 1,
      otherChildren: 0,
      earnedMonthly: -50,
      unearnedMonthly: -10,
    });
    expect(r.estimatedSsi).toBe(FBR_2025.fbrIndividual);
  });
});
