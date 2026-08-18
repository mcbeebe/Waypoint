import { describe, it, expect } from 'vitest';
import { detectGaps, type GapInput } from './gapRules';

const base: GapInput = {
  childAgeYears: 5,
  diagnoses: [],
  rcStatus: 'active',
  iepStatus: 'active',
  insurance: 'medicaid',
  memoryGaps: [],
};

describe('detectGaps', () => {
  it('is quiet for a fully-connected family (only IHSS nudge applies)', () => {
    const gaps = detectGaps(base);
    expect(gaps.map((g) => g.id)).toEqual(['ihss-hours']);
  });

  it('flags an unconnected Regional Center first among rule gaps', () => {
    const gaps = detectGaps({ ...base, rcStatus: 'unknown' });
    expect(gaps[0].id).toBe('rc-not-started');
    expect(gaps[0].ask).toMatch(/Regional Center/);
  });

  it('fires the age-3 transition inside the window and not outside', () => {
    expect(detectGaps({ ...base, childAgeYears: 2.8 }).some((g) => g.id === 'age-3-transition')).toBe(true);
    expect(detectGaps({ ...base, childAgeYears: 4.0 }).some((g) => g.id === 'age-3-transition')).toBe(false);
    expect(detectGaps({ ...base, childAgeYears: 2.0 }).some((g) => g.id === 'age-3-transition')).toBe(false);
  });

  it('suggests a school evaluation for a school-age child with no IEP', () => {
    const gaps = detectGaps({ ...base, iepStatus: 'no' });
    expect(gaps.some((g) => g.id === 'iep-not-started')).toBe(true);
    // but not for a toddler
    expect(detectGaps({ ...base, childAgeYears: 1, iepStatus: 'no' }).some((g) => g.id === 'iep-not-started')).toBe(false);
  });

  it('routes insurance gaps correctly', () => {
    expect(detectGaps({ ...base, insurance: 'none' }).some((g) => g.id === 'no-insurance')).toBe(true);
    expect(detectGaps({ ...base, insurance: 'private' }).some((g) => g.id === 'deeming-waiver')).toBe(true);
    expect(detectGaps({ ...base, insurance: 'medicaid' }).some((g) => g.id === 'deeming-waiver')).toBe(false);
  });

  it('raises SB 946 only for autism with private coverage in the mix', () => {
    const autism = { ...base, diagnoses: ['autism (ASD)'] };
    expect(detectGaps({ ...autism, insurance: 'private' }).some((g) => g.id === 'sb946-aba')).toBe(true);
    expect(detectGaps({ ...autism, insurance: 'both' }).some((g) => g.id === 'sb946-aba')).toBe(true);
    expect(detectGaps({ ...autism, insurance: 'medicaid' }).some((g) => g.id === 'sb946-aba')).toBe(false);
    expect(detectGaps({ ...base, insurance: 'private' }).some((g) => g.id === 'sb946-aba')).toBe(false);
  });

  it('puts AI-noticed memory gaps ahead of rule gaps, with stable ids', () => {
    const withMemory = detectGaps({
      ...base,
      rcStatus: 'unknown',
      memoryGaps: ['The family has never requested respite hours despite caregiver burnout.'],
    });
    expect(withMemory[0].id).toMatch(/^memory-gap-/);
    expect(withMemory[0].body).toMatch(/respite/);
    expect(withMemory[1].id).toBe('rc-not-started');

    const again = detectGaps({
      ...base,
      memoryGaps: ['The family has never requested respite hours despite caregiver burnout.'],
    });
    expect(again[0].id).toBe(withMemory[0].id);
  });

  it('handles a null-everything profile without throwing', () => {
    const gaps = detectGaps({
      childAgeYears: null,
      diagnoses: [],
      rcStatus: null,
      iepStatus: null,
      insurance: null,
      memoryGaps: [],
    });
    expect(gaps.some((g) => g.id === 'rc-not-started')).toBe(true);
    expect(gaps.some((g) => g.id === 'age-3-transition')).toBe(false);
  });
});
