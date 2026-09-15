/**
 * learnReview — the human-review gate between derivation and a family.
 *
 * The tests that matter here are the ones proving the gate HOLDS: that an
 * unreviewed projection cannot reach a parent, that composing with an empty
 * ledger changes nothing, and that a reviewed article carries the date a person
 * actually stamped rather than one the pipeline invented.
 */
import { describe, it, expect } from 'vitest';
import {
  REVIEW_LEDGER,
  composeLearnArticles,
  composeLearnLibrary,
  pendingReview,
  reviewSummary,
  type ReviewEntry,
} from './learnReview';
import { getLearnArticles, getLearnLibrary } from './learnLibrary';
import { deriveArticles } from './learnDerive';

const LOCALES = ['en', 'es', 'vi'] as const;

const entry = (over: Partial<ReviewEntry> = {}): ReviewEntry => ({
  key: 'rc_stage_ipp',
  reviewedOn: '2026-09-15',
  reviewedBy: 'Test Reviewer',
  stage: 'seeking_help',
  relatedQuestions: {
    en: ['What is an IPP?', 'How often is it reviewed?'],
    es: ['¿Qué es un IPP?', '¿Con qué frecuencia se revisa?'],
    vi: ['IPP là gì?', 'Bao lâu được xem xét lại?'],
  },
  ...over,
});

describe('the gate is shut by default', () => {
  it('the shipped ledger is empty', () => {
    // If this fails, someone added a review entry. That is a real editorial
    // act — check a person's name is on it and they actually read the article.
    expect(REVIEW_LEDGER).toEqual([]);
  });

  it('composing with the empty ledger changes nothing a family sees', () => {
    for (const locale of LOCALES) {
      expect(composeLearnArticles(locale).map((a) => a.key)).toEqual(
        getLearnArticles(locale).map((a) => a.key)
      );
    }
  });

  it('composeLearnLibrary matches getLearnLibrary while the ledger is empty', () => {
    for (const locale of LOCALES) {
      expect(composeLearnLibrary(locale)).toEqual(getLearnLibrary(locale));
    }
  });

  it('every derived article is pending, and none has leaked into the library', () => {
    const live = new Set(composeLearnArticles('en').map((a) => a.key));
    const derived = deriveArticles('en').map((a) => a.key);
    expect(pendingReview('en')).toHaveLength(derived.length);
    for (const key of derived) expect(live.has(key), key).toBe(false);
  });
});

describe('the reviewer worklist names what derivation left undone', () => {
  const pending = pendingReview('en');

  it('flags every projection as unreviewed', () => {
    for (const p of pending) expect(p.gaps, p.key).toContain('not-reviewed');
  });

  it('flags the missing journey stage on all of them', () => {
    // Verified against the harness: deriveArticles() sets no stage at all.
    expect(pending.every((p) => p.gaps.includes('no-stage'))).toBe(true);
  });

  it('flags the missing related questions on all of them', () => {
    expect(pending.every((p) => p.gaps.includes('no-related-questions'))).toBe(true);
  });

  it('names the four projections that share a citation with a shipped article', () => {
    // These are the real editorial duplicates. The reviewer decides whether the
    // projection replaces the hand-authored one — `supersedes` records it.
    const overlaps = pending
      .filter((p) => p.sharesCitationWith)
      .map((p) => [p.key, p.sharesCitationWith]);
    expect(overlaps).toEqual([
      ['ladder_friendly_ask', 'ipp_clock'],
      ['rc_stage_services', 'rc_said_no'],
      ['rc_stage_rc_delivery', 'sibling_support'],
      ['school_stage_school_referral', 'first_iep'],
    ]);
  });

  it('carries the source module so a reviewer can trace the projection back', () => {
    for (const p of pending) {
      expect(['ladder', 'rc_stage', 'school_stage', 'stack'], p.key).toContain(p.source);
    }
  });
});

describe('a reviewed article composes with the reviewer’s judgment attached', () => {
  const ledger = [entry()];

  it('appears in the library', () => {
    expect(composeLearnArticles('en', ledger).map((a) => a.key)).toContain('rc_stage_ipp');
  });

  it('carries the date the reviewer stamped — not one the pipeline made up', () => {
    const a = composeLearnArticles('en', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    expect(a.reviewedOn).toBe('2026-09-15');
  });

  it('carries the stage and the related questions derivation could not supply', () => {
    const a = composeLearnArticles('en', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    expect(a.stage).toBe('seeking_help');
    expect(a.relatedQuestions).toEqual(['What is an IPP?', 'How often is it reviewed?']);
  });

  it('localises the reviewer’s questions while leaving the citation alone', () => {
    const en = composeLearnArticles('en', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    const es = composeLearnArticles('es', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    const vi = composeLearnArticles('vi', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    expect(es.relatedQuestions).toEqual(['¿Qué es un IPP?', '¿Con qué frecuencia se revisa?']);
    expect(vi.relatedQuestions).toEqual(['IPP là gì?', 'Bao lâu được xem xét lại?']);
    // Legal text never translates — the rule localeParity.test.ts enforces.
    expect(es.citation).toBe(en.citation);
    expect(vi.citation).toBe(en.citation);
  });

  it('leaves the projection itself untouched — body, citation and end-action', () => {
    const derived = deriveArticles('en').find((x) => x.key === 'rc_stage_ipp')!;
    const composed = composeLearnArticles('en', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    expect(composed.body).toEqual(derived.body);
    expect(composed.citation).toBe(derived.citation);
    expect(composed.target).toEqual(derived.target);
    expect(composed.title).toBe(derived.title);
  });

  it('drops the derivedFrom provenance field, which is not part of LearnArticle', () => {
    const composed = composeLearnArticles('en', ledger).find((x) => x.key === 'rc_stage_ipp')!;
    expect('derivedFrom' in composed).toBe(false);
  });

  it('removes it from the pending worklist', () => {
    expect(pendingReview('en', ledger).map((p) => p.key)).not.toContain('rc_stage_ipp');
  });
});

describe('supersede resolves an editorial duplicate', () => {
  const ledger = [entry({ key: 'ladder_friendly_ask', supersedes: 'ipp_clock' })];

  it('the superseded hand-authored article is dropped', () => {
    const keys = composeLearnArticles('en', ledger).map((a) => a.key);
    expect(keys).toContain('ladder_friendly_ask');
    expect(keys).not.toContain('ipp_clock');
  });

  it('the article count does not grow when one replaces another', () => {
    expect(composeLearnArticles('en', ledger)).toHaveLength(getLearnArticles('en').length);
  });

  it('a supersede of a key that does not exist is harmless', () => {
    const odd = [entry({ supersedes: 'no_such_article' })];
    expect(composeLearnArticles('en', odd)).toHaveLength(getLearnArticles('en').length + 1);
  });
});

describe('reviewSummary', () => {
  it('reports the empty state honestly', () => {
    expect(reviewSummary('en')).toBe(
      '5 articles live · 0 derived reviewed · 22 pending (4 share a citation with a shipped article)'
    );
  });

  it('moves the counts when an article is reviewed', () => {
    expect(reviewSummary('en', [entry()])).toBe(
      '6 articles live · 1 derived reviewed · 21 pending (4 share a citation with a shipped article)'
    );
  });
});
