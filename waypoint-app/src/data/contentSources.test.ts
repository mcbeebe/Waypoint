/**
 * Provenance coverage guard (F2 / REQ-1001): every citation string the
 * content modules can actually emit must resolve to a registry entry —
 * so adding a new claim without provenance fails HERE, not in review.
 */
import { describe, it, expect } from 'vitest';
import { CONTENT_SOURCES, sourceForCitation, sourcesForCitation } from './contentSources';
import { deriveEligibility } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { getRcStages, getSchoolStages, getSdpFork, getServiceLanes } from '@/lib/processMap';
import { getEscalationRungs } from '@/lib/escalationLadder';
import { deadlineFor } from '@/lib/requestClocks';
import type { RequestType } from '@/lib/requestClocks';
import { getSdpJourneySteps } from '@/lib/sdpJourney';
import { deriveResourceStack } from '@/lib/resourceStack';
import { getGlossary, getLearnArticles } from '@/lib/learnLibrary';
import { getFamilySupports } from '@/lib/familySupports';

function emittedCitations(): Set<string> {
  const out = new Set<string>();
  // All three shipped locales. Running only en/es left a hole exactly where
  // sdpJourney puts its citations in L(en, es, vi) slots: a translation pass
  // could localize a statute string, orphan it, and never fail a test.
  const locales: FunnelLocale[] = ['en', 'es', 'vi'];

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

  // Process map stages + fork + service lanes + escalation ladder, both locales
  for (const locale of locales) {
    for (const s of getRcStages(locale)) out.add(s.citation);
    for (const s of getSchoolStages(locale)) out.add(s.citation);
    out.add(getSdpFork(locale).citation);
    out.add(getServiceLanes(locale).citation);
    for (const r of getEscalationRungs(locale)) out.add(r.citation);
  }

  // SDP journey steps + resource stack layers, both locales
  for (const locale of locales) {
    for (const s of getSdpJourneySteps(locale)) out.add(s.citation);
    // The family-supports tier: SupportDetail renders this citation as a
    // tappable receipt, so an uncovered one degrades to inert grey text —
    // exactly the state this screen's wiring was meant to end.
    for (const s of getFamilySupports(locale)) out.add(s.citation);
    // The Learn library asserts law too; without this the guard could not
    // see the newest content module at all.
    for (const a of getLearnArticles(locale)) if (a.citation) out.add(a.citation);
    for (const g of getGlossary(locale)) if (g.citation) out.add(g.citation);
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

  it('keys are unique, and only a COMPOUND citation may name two authorities', () => {
    const keys = CONTENT_SOURCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const s of CONTENT_SOURCES) {
      expect(new Set(s.covers).size, `${s.key} lists a string twice`).toBe(s.covers.length);
    }

    // A chip naming one authority must still resolve to exactly one entry —
    // two would make the receipt a coin flip. A chip naming several (`A · B`)
    // is allowed, and required, to resolve to each of them.
    const counts = new Map<string, number>();
    for (const c of CONTENT_SOURCES.flatMap((s) => s.covers))
      counts.set(c, (counts.get(c) ?? 0) + 1);
    const shared = [...counts].filter(([, n]) => n > 1).map(([c]) => c);
    expect(shared.filter((c) => !c.includes(' · '))).toEqual([]);
  });

  it('a compound citation opens every authority it names', () => {
    // The defect this replaced: first-match handed the reader ONE entry, and
    // for these three it was the one that does not make the claim printed
    // beside the chip. A parent would have quoted the wrong section.
    const cases: Array<[string, string, RegExp]> = [
      // chip                                  , the entry first-match used to
      //                                         return, and the claim that was
      //                                         unreachable behind it
      ['Lanterman Act, W&I §4512 · §4643', 'lanterman_act', /120 days of intake/],
      ['W&I §4685.8 · §4646.5(b)', 'wic_4685_8', /within 30 days/],
      ['W&I §4646.5 · §4648(a)', 'wic_4648', /within 30 days/],
      ['W&I §4685.8 · DDS D-2026-SDP-002', 'dds_d_2026_sdp_002', /family-directed budget/],
    ];
    for (const [chip, firstMatchKey, unreachableClaim] of cases) {
      const found = sourcesForCitation(chip);
      expect(found.length, `${chip} must name >1 authority`).toBeGreaterThan(1);
      expect(found.map((s) => s.key), `${chip}`).toContain(firstMatchKey);
      expect(
        found.some((s) => unreachableClaim.test(s.claim)),
        `${chip}: the claim it is printed beside is still unreachable`
      ).toBe(true);
      // Each authority keeps its OWN link — no reader is sent to a section
      // that does not contain the rule they tapped to check.
      expect(new Set(found.map((s) => s.url)).size).toBe(found.length);
    }
  });

  it('a citation naming one authority still resolves to exactly one', () => {
    for (const c of ['W&I §4643', 'W&I §4512', 'Ed Code §56321', 'W&I §12300'])
      expect(sourcesForCitation(c).length, c).toBeLessThanOrEqual(1);
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

  it('a card\u2019s visible reviewed date matches the registry\u2019s verified date', () => {
    // EligibilityResult shows the date on the face of the card AND, since the
    // chip became tappable, inside the sheet the chip opens. Those are two
    // different constants (REVIEWED in eligibility.ts, verifiedOn here); if
    // one is bumped without the other, a parent checking their receipt reads
    // two different dates for the same claim. They must move together.
    // One input pinned only 4 of the 7 reachable citations. The three it
    // missed — Early Start, the not-yet-enrolled Lanterman card, the no-IEP
    // school card — are the three NEWEST-user states, so the drift would have
    // landed on the families with the least context to notice it. Walk the
    // space instead, and require it to actually reach all seven.
    const seen = new Set<string>();
    for (const ageYears of [1, 4, 10, 20, 25, null])
      for (const rcStatus of ['unknown', 'known', 'applied', 'active'] as const)
        for (const iepStatus of ['no', 'unknown', 'eval_done', 'active', 'na'] as const)
          for (const hasDiagnosis of [true, false])
            for (const c of deriveEligibility(
              { ageYears, rcStatus, iepStatus, hasDiagnosis },
              'en'
            ).cards) {
              seen.add(c.citation);
              for (const src of sourcesForCitation(c.citation))
                expect(src.verifiedOn, `${c.citation} date drift`).toBe(c.reviewedOn);
            }
    expect(seen.size, 'the walk stopped reaching some cards').toBeGreaterThanOrEqual(7);
  });

  it('citations stay identical across locales (legal text never translates)', () => {
    const en = getRcStages('en').map((s) => s.citation);
    const es = getRcStages('es').map((s) => s.citation);
    expect(es).toEqual(en);
    expect(getSdpFork('es').citation).toBe(getSdpFork('en').citation);
  });
});
