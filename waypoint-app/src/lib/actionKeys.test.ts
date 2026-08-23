/**
 * Coverage guard for the stable-key catalog (C-12 step 1): every title the
 * generator can emit must resolve to a stable key, across the whole input
 * matrix — so a retitled or newly added action fails HERE instead of
 * silently detaching its effort estimate and follow-up check-in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateStarterPlan } from './planGenerator';
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

describe('stable action keys cover the generator', () => {
  it('every emittable title resolves to a stable key (full matrix)', () => {
    const missing = new Set<string>();
    for (const diagnoses of DIAGNOSES)
      for (const rcStatus of RC_STATUSES)
        for (const iepStatus of IEP_STATUSES)
          for (const insurance of INSURANCES)
            for (const age of AGES) {
              for (const a of generateStarterPlan({
                diagnoses, birthday: bday(age), rcStatus, iepStatus, insurance,
              })) {
                if (!stableKeyFor(a.title)) missing.add(a.title);
              }
            }
    expect([...missing]).toEqual([]);
  });

  it('stable keys are unique', () => {
    const keys = Object.values(STABLE_ACTION_KEYS).map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every effort and follow-up entry keys on a cataloged stable key', () => {
    const src = readFileSync(join(__dirname, 'planGenerator.ts'), 'utf8');
    const keys = new Set(Object.values(STABLE_ACTION_KEYS).map((e) => e.key));
    for (const table of ['EFFORT_BY_KEY', 'FOLLOW_UP_KEY_BY_KEY']) {
      const start = src.indexOf(`const ${table}`);
      expect(start, `${table} missing`).toBeGreaterThan(-1);
      const block = src.slice(start, src.indexOf('};', start));
      for (const m of block.matchAll(/^\s{2}([a-z0-9_]+):/gm)) {
        expect(keys.has(m[1]), `${table} keys on unknown '${m[1]}'`).toBe(true);
      }
    }
  });
});
