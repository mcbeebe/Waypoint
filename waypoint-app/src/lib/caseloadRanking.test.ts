import { describe, it, expect } from 'vitest';
import { rankCaseload, RANKING_EXPLANATION } from './caseloadRanking';
import type { CaseloadSignal } from './caseloadRanking';

function sig(overrides: Partial<CaseloadSignal>): CaseloadSignal {
  return {
    caseId: 'c1',
    familyName: 'Alvarez',
    stage: 'active',
    nextDeadlineDays: null,
    pct099Used: 0,
    daysSinceContact: 2,
    ...overrides,
  };
}

describe('rankCaseload', () => {
  it('an overdue deadline outranks everything else', () => {
    const ranked = rankCaseload([
      sig({ caseId: 'quiet', daysSinceContact: 35 }),
      sig({ caseId: 'overdue', nextDeadlineDays: -3 }),
      sig({ caseId: 'burning', pct099Used: 85 }),
    ]);
    expect(ranked[0].caseId).toBe('overdue');
    expect(ranked[0].reasons[0]).toContain('overdue by 3d');
  });

  it('every row explains itself — top reason matches the dominant factor', () => {
    const [burn] = rankCaseload([sig({ pct099Used: 92, daysSinceContact: 1 })]);
    expect(burn.reasons[0]).toContain('92% of cap');

    const [stale] = rankCaseload([sig({ daysSinceContact: 21 })]);
    expect(stale.reasons[0]).toContain('No contact in 21d');
  });

  it('a healthy case says so instead of inventing urgency', () => {
    const [ok] = rankCaseload([sig({})]);
    expect(ok.reasons).toEqual(['On track']);
    expect(ok.score).toBeLessThan(20);
  });

  it('never-contacted is itself a flag', () => {
    const [fresh] = rankCaseload([sig({ daysSinceContact: null })]);
    expect(fresh.reasons[0]).toBe('No contact logged yet');
  });

  it('budget_certification stage friction boosts the score', () => {
    const ranked = rankCaseload([
      sig({ caseId: 'active', stage: 'active' }),
      sig({ caseId: 'budget', stage: 'budget_certification' }),
    ]);
    expect(ranked[0].caseId).toBe('budget');
  });

  it('the explanation copy names all four factors and their weights', () => {
    for (const frag of ['deadline', '099', 'contact', 'stage', '40%', '25%', '10%']) {
      expect(RANKING_EXPLANATION.toLowerCase()).toContain(frag.toLowerCase());
    }
  });
});
