/**
 * Provenance coverage guard (F2 / REQ-1001): every citation string the
 * content modules can actually emit must resolve to a registry entry —
 * so adding a new claim without provenance fails HERE, not in review.
 */
import { describe, it, expect } from 'vitest';
import { CONTENT_SOURCES, sourceForCitation } from './contentSources';
import { deriveEligibility } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { getRcStages, getSchoolStages, getSdpFork } from '@/lib/processMap';
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestType } from '@/lib/requestClocks';
import { getSdpJourneySteps } from '@/lib/sdpJourney';
import { deriveResourceStack } from '@/lib/resourceStack';

function emittedCitations(): Set<string> {
  const out = new Set<string>();
  const locales: FunnelLocale[] = ['en', 'es'];

  // Eligibility cards across the input space that changes which cards render
  for (const locale of locales)
    for (const ageYears of [1, 4, 10, 20, 25, null])
      for (const rcStatus of ['unknown', 'known', 'applied', 'active'] as const)
        for (const iepStatus of ['no', 'unknown', 'eval_done', 'active', 'na'] as const)
          for (const hasDiagnosis of [true, false]) {
            const { cards } = deriveEligibility(
              { ageYears, rcStatus, iepStatus, hasDiagnosis },
              locale
            );
            for (const c of cards) out.add(c.citation);
          }

  // Process map stages + fork, both locales
  for (const locale of locales) {
    for (const s of getRcStages(locale)) out.add(s.citation);
    for (const s of getSchoolStages(locale)) out.add(s.citation);
    out.add(getSdpFork(locale).citation);
  }

  // SDP journey steps + resource stack layers, both locales
  for (const locale of locales) {
    for (const s of getSdpJourneySteps(locale)) out.add(s.citation);
    for (const rcStatus of ['unknown', 'applied', 'active'] as const)
      for (const l of deriveResourceStack(
        { ageYears: 6, rcStatus, iepStatus: 'active' },
        locale
      ).layers)
        out.add(l.citation);
  }

  // Request clocks
  const types: RequestType[] = [
    'rc_intake', 'rc_assessment', 'ipp_meeting', 'service_request',
    'authorization', 'reimbursement', 'iep_evaluation', 'other',
  ];
  for (const t of types) {
    const d = deadlineFor(t, '2026-08-01', new Date('2026-08-23T12:00:00'));
    if (d) out.add(d.citation);
  }

  return out;
}

describe('content provenance registry', () => {
  it('covers every citation the content modules emit', () => {
    const orphans = [...emittedCitations()].filter((c) => !sourceForCitation(c));
    expect(orphans).toEqual([]);
  });

  it('keys and covered strings are unique across the registry', () => {
    const keys = CONTENT_SOURCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    const covers = CONTENT_SOURCES.flatMap((s) => s.covers);
    expect(new Set(covers).size).toBe(covers.length);
  });

  it('every entry has a verify URL and a plausible verifiedOn date', () => {
    for (const s of CONTENT_SOURCES) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(s.verifiedOn).getTime()).toBeLessThanOrEqual(
        new Date('2027-01-01').getTime()
      );
      expect(s.claim.length).toBeGreaterThan(20);
    }
  });

  it('citations stay identical across locales (legal text never translates)', () => {
    const en = getRcStages('en').map((s) => s.citation);
    const es = getRcStages('es').map((s) => s.citation);
    expect(es).toEqual(en);
    expect(getSdpFork('es').citation).toBe(getSdpFork('en').citation);
  });
});
