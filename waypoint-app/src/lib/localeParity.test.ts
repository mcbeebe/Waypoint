/**
 * Trilingual parity guard: across en/es/vi, translation may change PROSE
 * and nothing else — keys, statuses, citations, lever templates, action
 * keys, tracking, and clocks must be locale-invariant. A translation that
 * drifts structurally fails here, not in a family's hands.
 */
import { describe, it, expect } from 'vitest';
import { deriveEligibility, toFunnelLocale } from './eligibility';
import type { FunnelLocale } from './eligibility';
import { getRcStages, getSdpFork } from './processMap';
import { decidePath, getPathQuestions } from './pathDecision';
import { deriveHomeInsight } from './insights';
import { sentNextFor } from './sentNext';

const LOCALES: FunnelLocale[] = ['en', 'es', 'vi'];

describe('toFunnelLocale', () => {
  it('passes es and vi through; everything else is English', () => {
    expect(toFunnelLocale('es')).toBe('es');
    expect(toFunnelLocale('vi')).toBe('vi');
    expect(toFunnelLocale('en')).toBe('en');
    expect(toFunnelLocale('fr')).toBe('en');
  });
});

describe('eligibility cards are structurally locale-invariant', () => {
  const input = { ageYears: 6, rcStatus: 'active' as const, iepStatus: 'no' as const, hasDiagnosis: true };
  const en = deriveEligibility(input, 'en');
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      const other = deriveEligibility(input, locale);
      expect(other.likelyCount).toBe(en.likelyCount);
      expect(other.cards.map((c) => c.key)).toEqual(en.cards.map((c) => c.key));
      expect(other.cards.map((c) => c.status)).toEqual(en.cards.map((c) => c.status));
      expect(other.cards.map((c) => c.citation)).toEqual(en.cards.map((c) => c.citation));
      expect(other.cards.map((c) => c.body)).not.toEqual(en.cards.map((c) => c.body));
    });
  }
});

describe('process map is structurally locale-invariant', () => {
  const en = getRcStages('en');
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      const other = getRcStages(locale);
      expect(other.map((s) => s.key)).toEqual(en.map((s) => s.key));
      expect(other.map((s) => s.citation)).toEqual(en.map((s) => s.citation));
      expect(other.map((s) => s.leverTemplate)).toEqual(en.map((s) => s.leverTemplate));
      expect(other.map((s) => s.actionKeys)).toEqual(en.map((s) => s.actionKeys));
      expect(getSdpFork(locale).citation).toBe(getSdpFork('en').citation);
      expect(getSdpFork(locale).title).not.toBe(getSdpFork('en').title);
    });
  }
});

describe('path decision is structurally locale-invariant', () => {
  const answers = { hasAuthorizationHistory: true, unmetNeedsDocumented: false, wantsControl: true };
  for (const locale of LOCALES) {
    it(locale, () => {
      const r = decidePath(answers, locale);
      expect(r.recommendation).toBe('document_first');
      expect(r.leverTemplate).toBe('ipp_review_request');
      expect(getPathQuestions(locale).map((q) => q.key)).toEqual(
        getPathQuestions('en').map((q) => q.key)
      );
    });
  }
});

describe('home insight is structurally locale-invariant', () => {
  const input = { ageYears: 6, rcStatus: 'active' as const, iepStatus: 'no' as const, hasDiagnosis: true, childName: 'Teddy' };
  const en = deriveHomeInsight(input, 'en')!;
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      const other = deriveHomeInsight(input, locale)!;
      expect(other.key).toBe(en.key);
      expect(other.target).toEqual(en.target);
      expect(other.citation).toBe(en.citation);
      expect(other.title).toContain('Teddy');
      expect(other.title).not.toBe(en.title);
    });
  }
});

describe('sent moment is structurally locale-invariant', () => {
  const KEYS = [
    'sdp_info_request', 'ipp_review_request', 'assessment_request',
    'noa_request', 'records_request', 'rc_timeline_followup',
  ];
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      for (const key of KEYS) {
        const en = sentNextFor(key, 'Teddy', 'en')!;
        const other = sentNextFor(key, 'Teddy', locale)!;
        expect(other.track).toEqual(en.track);
        expect(other.followUpDays).toBe(en.followUpDays);
        expect(other.expectations.length).toBe(en.expectations.length);
        expect(other.celebration).not.toBe(en.celebration);
      }
    });
  }
});
