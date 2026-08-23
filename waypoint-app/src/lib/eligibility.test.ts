import { describe, it, expect } from 'vitest';
import { deriveEligibility, ageFromDob } from './eligibility';

describe('deriveEligibility', () => {
  it('shows Early Start only under 3', () => {
    const young = deriveEligibility({ ageYears: 2, rcStatus: 'unknown', iepStatus: 'no', hasDiagnosis: true });
    const old = deriveEligibility({ ageYears: 6, rcStatus: 'unknown', iepStatus: 'no', hasDiagnosis: true });
    expect(young.cards.some((c) => c.key === 'early_start')).toBe(true);
    expect(old.cards.some((c) => c.key === 'early_start')).toBe(false);
  });

  it('marks RC enrolled for active consumers and gates SDP on it', () => {
    const active = deriveEligibility({ ageYears: 6, rcStatus: 'active', iepStatus: 'active', hasDiagnosis: true });
    expect(active.cards.find((c) => c.key === 'regional_center')?.status).toBe('enrolled');
    expect(active.cards.find((c) => c.key === 'sdp')?.status).toBe('likely');

    const applied = deriveEligibility({ ageYears: 6, rcStatus: 'applied', iepStatus: 'no', hasDiagnosis: true });
    expect(applied.cards.find((c) => c.key === 'sdp')?.status).toBe('later');
  });

  it('never promises SSI — always needs review', () => {
    const r = deriveEligibility({ ageYears: 6, rcStatus: 'active', iepStatus: 'active', hasDiagnosis: true });
    expect(r.cards.find((c) => c.key === 'ssi')?.status).toBe('review');
  });

  it('offers the IEP evaluation right only in the 3-22 window without an active IEP', () => {
    const noIep = deriveEligibility({ ageYears: 6, rcStatus: 'unknown', iepStatus: 'no', hasDiagnosis: true });
    expect(noIep.cards.some((c) => c.key === 'iep')).toBe(true);
    const hasIep = deriveEligibility({ ageYears: 6, rcStatus: 'unknown', iepStatus: 'active', hasDiagnosis: true });
    expect(hasIep.cards.some((c) => c.key === 'iep')).toBe(false);
  });

  it('every card carries a citation and review date', () => {
    const r = deriveEligibility({ ageYears: 4, rcStatus: 'known', iepStatus: 'unknown', hasDiagnosis: true });
    for (const card of r.cards) {
      expect(card.citation.length).toBeGreaterThan(0);
      expect(card.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(r.likelyCount).toBeGreaterThan(0);
  });
});

describe('ageFromDob', () => {
  const now = new Date('2026-08-23');
  it('computes whole years with birthday awareness', () => {
    expect(ageFromDob('2022-08-24', now)).toBe(3);
    expect(ageFromDob('2022-08-22', now)).toBe(4);
  });
  it('returns null for missing or invalid dates', () => {
    expect(ageFromDob(null, now)).toBeNull();
    expect(ageFromDob('not-a-date', now)).toBeNull();
  });
});
