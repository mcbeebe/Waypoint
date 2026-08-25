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
import { getSdpJourneySteps, deriveSdpJourney } from './sdpJourney';
import { deriveResourceStack } from './resourceStack';

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

describe('SDP journey is structurally locale-invariant', () => {
  const en = getSdpJourneySteps('en');
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      const other = getSdpJourneySteps(locale);
      expect(other.map((s) => s.key)).toEqual(en.map((s) => s.key));
      expect(other.map((s) => s.n)).toEqual(en.map((s) => s.n));
      expect(other.map((s) => s.leverTemplate)).toEqual(en.map((s) => s.leverTemplate));
      expect(other.map((s) => s.checklist.length)).toEqual(en.map((s) => s.checklist.length));
      expect(other.map((s) => s.title)).not.toEqual(en.map((s) => s.title));
      expect(deriveSdpJourney(2, locale).progressPct).toBe(deriveSdpJourney(2, 'en').progressPct);
    });
  }
});

describe('resource stack is structurally locale-invariant', () => {
  const input = {
    ageYears: 6, rcStatus: 'active' as const, iepStatus: 'active' as const,
    mediCalStatus: 'unknown' as const, ihssStatus: 'unknown' as const,
    ssiStatus: 'unknown' as const, sdpStep: null,
  };
  const en = deriveResourceStack(input, 'en');
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      const other = deriveResourceStack(input, locale);
      expect(other.layers.map((l) => l.key)).toEqual(en.layers.map((l) => l.key));
      expect(other.layers.map((l) => l.status)).toEqual(en.layers.map((l) => l.status));
      expect(other.layers.map((l) => l.citation)).toEqual(en.layers.map((l) => l.citation));
      expect(other.layers.map((l) => l.lockedBy)).toEqual(en.layers.map((l) => l.lockedBy));
      expect(other.layers.map((l) => l.lever)).toEqual(en.layers.map((l) => l.lever));
      expect(other.nextUnlock?.key).toBe(en.nextUnlock?.key);
      expect(other.layers.map((l) => l.gets)).not.toEqual(en.layers.map((l) => l.gets));
    });
  }
});

describe('sent moment is structurally locale-invariant', () => {
  const KEYS = [
    'sdp_info_request', 'ipp_review_request', 'assessment_request',
    'noa_request', 'records_request', 'rc_timeline_followup', 'medi_cal_deeming',
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
