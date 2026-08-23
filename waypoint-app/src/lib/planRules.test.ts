/**
 * Rules-table guards (C-12 step 2): the generator is now a flat table of
 * {stable key, predicate, content builder}. These tests keep the table
 * honest — keys aligned with the catalog, no duplicates beyond the
 * intended one-predicate-many-actions pairs, and EVERY rule reachable by
 * some real intake. A dead rule (predicate nothing can satisfy) fails
 * here instead of silently shipping content no family can ever see.
 */
import { describe, it, expect } from 'vitest';
import { generateStarterPlan, PLAN_RULE_KEYS } from './planGenerator';
import { STABLE_ACTION_KEYS, stableKeyFor } from './actionKeys';

const DIAGNOSES = [
  ['autism'], ['delay'], ['suspected'], ['down'], ['adhd'], ['deaf'], ['blind'],
  ['tbi'], ['ed'], ['sli'], ['cp'], ['epilepsy'], ['autism', 'delay'], [],
];
const RC_STATUSES = ['unknown', 'known', 'applied', 'active'];
const IEP_STATUSES = ['no', 'unknown', 'eval_done', 'active', 'na'];
const INSURANCES = ['private', 'medicaid', 'both', 'none'];
const AGES = [1, 4, 8, 15, 17];

function bday(age: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(d.getMonth() - 1);
  return d;
}

describe('the plan rules table', () => {
  it('rule keys are unique and every one exists in the stable-key catalog', () => {
    expect(new Set(PLAN_RULE_KEYS).size).toBe(PLAN_RULE_KEYS.length);
    const catalog = new Set(Object.values(STABLE_ACTION_KEYS).map((e) => e.key));
    for (const k of PLAN_RULE_KEYS) {
      expect(catalog.has(k), `rule '${k}' missing from STABLE_ACTION_KEYS`).toBe(true);
    }
  });

  it('every rule is reachable, and nothing outside the table is ever emitted', () => {
    const emitted = new Set<string>();
    for (const diagnoses of DIAGNOSES)
      for (const rcStatus of RC_STATUSES)
        for (const iepStatus of IEP_STATUSES)
          for (const insurance of INSURANCES)
            for (const age of AGES) {
              for (const a of generateStarterPlan({
                diagnoses, birthday: bday(age), rcStatus, iepStatus, insurance,
              })) {
                const k = stableKeyFor(a.title);
                expect(k, `untitled rule for "${a.title}"`).not.toBeNull();
                emitted.add(k!);
              }
            }
    const table = new Set<string>(PLAN_RULE_KEYS);
    const dead = [...table].filter((k) => !emitted.has(k));
    const rogue = [...emitted].filter((k) => !table.has(k));
    expect(dead, 'rules no intake can reach').toEqual([]);
    expect(rogue, 'actions emitted outside the rules table').toEqual([]);
  });

  it('the RC else-chain exclusions survived the flattening', () => {
    // An applied Early-Start-age family gets the Early Start referral, NOT
    // the applied follow-up (the original else-chain's subtlest case).
    const titles = generateStarterPlan({
      diagnoses: ['autism'], birthday: bday(1), rcStatus: 'applied',
      iepStatus: 'na', insurance: 'medicaid',
    }).map((a) => stableKeyFor(a.title));
    expect(titles).toContain('rc_early_start_referral');
    expect(titles).not.toContain('rc_follow_up_application');
  });
});
