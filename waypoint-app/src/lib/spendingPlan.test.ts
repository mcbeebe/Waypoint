import { describe, it, expect } from 'vitest';
import { validateSpendingPlan, formatCents } from './spendingPlan';

function line(id: string, category: string, provider: string, cents: number) {
  return { id, category, provider_name: provider, annual_amount_cents: cents };
}

describe('formatCents', () => {
  it('formats whole dollars and cents', () => {
    expect(formatCents(214000)).toBe('$2,140');
    expect(formatCents(99950)).toBe('$999.50');
    expect(formatCents(-500)).toBe('-$5');
  });
});

describe('validateSpendingPlan', () => {
  it('a plan that sums to the certified budget is ready', () => {
    const v = validateSpendingPlan(
      [line('a', 'Respite', 'Sunrise Care', 3_000_00), line('b', 'ABA', 'Steps Therapy', 7_000_00)],
      10_000_00,
      'Waypoint'
    );
    expect(v.ready).toBe(true);
    expect(v.issues).toEqual([]);
  });

  it('over-budget error is money-denominated with a remedy', () => {
    const v = validateSpendingPlan([line('a', 'Respite', 'Sunrise Care', 12_140_00)], 10_000_00, 'Waypoint');
    expect(v.ready).toBe(false);
    const over = v.issues.find((i) => i.code === 'over_budget');
    expect(over?.message).toContain('$2,140');
    expect(over?.message.toLowerCase()).toContain('trim');
  });

  it('blocks the operating org as provider with the statutory explanation', () => {
    const v = validateSpendingPlan(
      [line('a', 'Facilitation', '  waypoint ', 2_000_00)],
      10_000_00,
      'Waypoint'
    );
    const coi = v.issues.find((i) => i.code === 'coi_provider');
    expect(coi?.severity).toBe('error');
    expect(coi?.lineId).toBe('a');
    expect(coi?.message).toContain('§4685.8');
  });

  it('warns on meaningful unallocated budget but stays submittable-blocked only on errors', () => {
    const v = validateSpendingPlan([line('a', 'Respite', 'Sunrise Care', 6_000_00)], 10_000_00, 'Waypoint');
    const un = v.issues.find((i) => i.code === 'unallocated');
    expect(un?.severity).toBe('warning');
    expect(un?.message).toContain('$4,000');
    expect(v.ready).toBe(false); // not fully allocated
  });

  it('no certified budget is an error, not a crash', () => {
    const v = validateSpendingPlan([line('a', 'Respite', 'Sunrise Care', 1_00)], null, 'Waypoint');
    expect(v.issues.some((i) => i.code === 'no_budget')).toBe(true);
    expect(v.ready).toBe(false);
  });

  it('empty provider or $0 lines get a finish-or-remove warning', () => {
    const v = validateSpendingPlan(
      [line('a', 'Respite', '', 1_000_00), line('b', 'ABA', 'Steps', 0)],
      1_000_00,
      'Waypoint'
    );
    expect(v.issues.filter((i) => i.code === 'empty_line')).toHaveLength(2);
  });
});
