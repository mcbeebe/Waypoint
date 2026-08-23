/**
 * Characterization tests for the starter-plan generator (prerequisite for
 * the C-12 rules-table refactor). These snapshots lock CURRENT behavior
 * across a broad input matrix — the refactor must keep every one of them
 * green. They assert structure and identity (titles, categories,
 * priorities, counts), not prose, so copy edits don't churn them.
 */
import { describe, it, expect } from 'vitest';
import { generateStarterPlan, ageBandFromBirthday } from './planGenerator';
import type { PlanIntake } from './planGenerator';

const NOW = new Date('2026-08-23T12:00:00');

function bday(age: number): Date {
  return new Date(NOW.getFullYear() - age, NOW.getMonth() - 1, 15);
}

function fingerprint(intake: PlanIntake) {
  const actions = generateStarterPlan(intake);
  return actions.map((a) => ({
    title: a.title,
    category: a.category,
    priority: a.priority,
    steps: a.steps.length,
    hasScript: !!a.script,
    hasDueDate: !!a.due_date,
  }));
}

const DIAGNOSES = [['autism'], ['delay'], ['suspected'], ['autism', 'delay'], []];
const RC_STATUSES = ['unknown', 'known', 'applied', 'active'];
const IEP_STATUSES = ['no', 'unknown', 'eval_done', 'active', 'na'];
const INSURANCES = ['private', 'medicaid', 'both', 'none'];
const AGES = [1, 4, 8, 15];

describe('generateStarterPlan — characterization matrix', () => {
  // The full cross-product is 5×4×5×4×4 = 1600 cases; snapshotting a
  // deterministic diagonal sample keeps the suite readable while covering
  // every value of every dimension at least four times.
  const cases: PlanIntake[] = [];
  const max = Math.max(
    DIAGNOSES.length,
    RC_STATUSES.length,
    IEP_STATUSES.length,
    INSURANCES.length,
    AGES.length
  );
  for (let i = 0; i < max * 4; i++) {
    cases.push({
      diagnoses: DIAGNOSES[i % DIAGNOSES.length],
      birthday: bday(AGES[i % AGES.length]),
      rcStatus: RC_STATUSES[i % RC_STATUSES.length],
      iepStatus: IEP_STATUSES[i % IEP_STATUSES.length],
      insurance: INSURANCES[i % INSURANCES.length],
      childName: 'Leo',
      parentName: 'Maria',
      zipCode: '94601',
    });
  }

  for (const [i, intake] of cases.entries()) {
    it(`case ${i}: dx=[${intake.diagnoses.join(',')}] age=${AGES[i % AGES.length]} rc=${intake.rcStatus} iep=${intake.iepStatus} ins=${intake.insurance}`, () => {
      expect(fingerprint(intake)).toMatchSnapshot();
    });
  }

  it('null birthday still generates a plan', () => {
    expect(
      fingerprint({
        diagnoses: ['autism'],
        birthday: null,
        rcStatus: 'unknown',
        iepStatus: 'unknown',
        insurance: 'private',
      }).length
    ).toBeGreaterThan(0);
  });

  it('every generated action has a title, category, and priority', () => {
    for (const intake of cases.slice(0, 8)) {
      for (const a of generateStarterPlan(intake)) {
        expect(a.title.length).toBeGreaterThan(0);
        expect(a.category.length).toBeGreaterThan(0);
        expect(['urgent', 'high', 'medium', 'low']).toContain(a.priority);
      }
    }
  });
});

describe('ageBandFromBirthday — characterization', () => {
  it('maps ages to bands stably', () => {
    const bands = [0.5, 1, 2.9, 3, 5, 6, 12, 14, 16, 21].map((age) => {
      const d = new Date(NOW);
      d.setMonth(d.getMonth() - Math.round(age * 12));
      return `${age}y → ${ageBandFromBirthday(d)}`;
    });
    expect(bands).toMatchSnapshot();
  });
});
