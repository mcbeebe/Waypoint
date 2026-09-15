/**
 * learnReview — the human-review gate between derivation and a family.
 *
 * These tests aim at the surfaces an adversarial review found unguarded in the
 * first draft of this slice: a reviewed article has to be REACHABLE (openable
 * in the reader, findable by search), a malformed ledger entry must not be able
 * to delete a shipped article, and the real `REVIEW_LEDGER` must be validated
 * rather than merely type-checked.
 */
import { describe, it, expect } from 'vitest';
import {
  REVIEW_LEDGER,
  MIN_RELATED_QUESTIONS,
  pendingReview,
  reviewStatus,
  reviewedArticles,
  supersededKeys,
  validateLedger,
  type ReviewEntry,
} from './learnReview';
import {
  getAuthoredArticles,
  getLearnArticle,
  getLearnArticles,
  searchLearn,
} from './learnLibrary';
import { deriveArticles } from './learnDerive';

const LOCALES = ['en', 'es', 'vi'] as const;
const qs = (n: number, tag: string) => Array.from({ length: n }, (_, i) => `${tag} q${i + 1}`);

const entry = (over: Partial<ReviewEntry> = {}): ReviewEntry => ({
  key: 'rc_stage_ipp',
  reviewedOn: '2026-09-15',
  reviewedBy: 'Test Reviewer',
  stage: 'seeking_help',
  relatedQuestions: {
    en: qs(MIN_RELATED_QUESTIONS, 'en'),
    es: qs(MIN_RELATED_QUESTIONS, 'es'),
    vi: qs(MIN_RELATED_QUESTIONS, 'vi'),
  },
  ...over,
});

const authored = getAuthoredArticles('en');

describe('the real ledger', () => {
  it('is valid — every entry, checked, not just typed', () => {
    // This is the check the first draft lacked: nothing read REVIEW_LEDGER, so
    // the first genuine entry would have shipped with no verification of its
    // date, question count, locales, or whether its key names a real article.
    expect(validateLedger(REVIEW_LEDGER, authored.map((a) => a.key))).toEqual([]);
  });

  it('is empty, so the library is exactly the authored set', () => {
    // If this fails someone added a review entry — check a person's name is on
    // it and that they actually read the article.
    expect(REVIEW_LEDGER).toEqual([]);
    for (const locale of LOCALES) {
      expect(getLearnArticles(locale).map((a) => a.key)).toEqual(
        getAuthoredArticles(locale).map((a) => a.key)
      );
    }
  });

  it('leaks no derived article to a family', () => {
    const live = new Set(getLearnArticles('en').map((a) => a.key));
    for (const a of deriveArticles('en')) expect(live.has(a.key), a.key).toBe(false);
  });
});

describe('a reviewed article is REACHABLE, not just listed', () => {
  // The first draft composed in a parallel function only LearnPanel called, so
  // a reviewed article appeared in the browse list, 404'd when tapped, and
  // could not be found by typing its own title. These are that regression.
  const ledger = [entry()];
  const composed = () => [
    ...getAuthoredArticles('en').filter((a) => !supersededKeys(ledger).has(a.key)),
    ...reviewedArticles('en', ledger),
  ];

  it('composes into the library', () => {
    expect(composed().map((a) => a.key)).toContain('rc_stage_ipp');
  });

  it('getLearnArticles and the reader agree on what exists', () => {
    // getLearnArticle resolves the key the panel navigates with. If it reads a
    // different set than the list, every tap on a reviewed article dead-ends.
    for (const a of getLearnArticles('en')) {
      expect(getLearnArticle(a.key, 'en'), `${a.key} is listed but not openable`).toBeTruthy();
    }
  });

  it('search reads the same set the library lists', () => {
    // searchLearn must be built from the composed library, not the authored
    // one — otherwise browsing finds an article that typing its title cannot.
    for (const a of getLearnArticles('en')) {
      const hits = searchLearn(a.primaryQuestion, 'en');
      expect(hits.some((h) => h.key === a.key), `${a.key} not findable by its own question`).toBe(
        true
      );
    }
  });
});

describe('a malformed entry cannot damage the library', () => {
  it('a typo in `key` does NOT delete the article it supersedes', () => {
    // The first draft built the superseded set from every entry unconditionally
    // while only composing entries with a real key, so this ledger removed
    // `ipp_clock` and added nothing — silent data loss, reported as a success.
    const typo = [entry({ key: 'rc_stage_ippp', supersedes: 'ipp_clock' })];
    expect(supersededKeys(typo).size).toBe(0);
    expect(reviewedArticles('en', typo)).toEqual([]);
  });

  it('validateLedger names the typo rather than letting it through', () => {
    const problems = validateLedger([entry({ key: 'rc_stage_ippp' })], authored.map((a) => a.key));
    expect(problems.map((p) => p.problem).join(' ')).toMatch(/not a derived article/);
  });

  it('flags a duplicate entry instead of silently taking the last one', () => {
    const dup = [entry({ reviewedBy: 'First' }), entry({ reviewedBy: 'Second' })];
    expect(validateLedger(dup, []).map((p) => p.problem).join(' ')).toMatch(/duplicate entry/);
    // And composition is deterministic: first wins, one article, not two.
    expect(reviewedArticles('en', dup)).toHaveLength(1);
  });

  it('flags a supersedes that names no authored article', () => {
    const problems = validateLedger([entry({ supersedes: 'no_such' })], authored.map((a) => a.key));
    expect(problems.map((p) => p.problem).join(' ')).toMatch(/not a hand-authored article/);
  });

  it('flags a non-ISO reviewedOn and an unsigned review', () => {
    const problems = validateLedger(
      [entry({ reviewedOn: 'Sep 15 2026', reviewedBy: '  ' })],
      []
    ).map((p) => p.problem);
    expect(problems.join(' ')).toMatch(/not YYYY-MM-DD/);
    expect(problems.join(' ')).toMatch(/needs a name on it/);
  });
});

describe('the trilingual rule is enforced, not hoped for', () => {
  it('flags too few questions in any locale', () => {
    const thin = [entry({ relatedQuestions: { en: qs(2, 'en'), es: qs(2, 'es'), vi: qs(2, 'vi') } })];
    const problems = validateLedger(thin, []).map((p) => p.problem).join(' ');
    for (const l of LOCALES) expect(problems).toMatch(new RegExp(`relatedQuestions\\.${l} has 2`));
  });

  it('flags locales that disagree in count — es and vi are peers, not extras', () => {
    const lopsided = [
      entry({ relatedQuestions: { en: qs(5, 'en'), es: qs(5, 'es'), vi: [] } }),
    ];
    expect(validateLedger(lopsided, []).map((p) => p.problem).join(' ')).toMatch(/differ across locales/);
  });

  it('flags untranslated copy pasted from English', () => {
    const lazy = [entry({ relatedQuestions: { en: qs(5, 'x'), es: qs(5, 'x'), vi: qs(5, 'vi') } })];
    expect(validateLedger(lazy, []).map((p) => p.problem).join(' ')).toMatch(/identical to en/);
  });

  it('localises the reviewer’s questions and leaves the citation alone', () => {
    const ledger = [entry()];
    const en = reviewedArticles('en', ledger)[0];
    const es = reviewedArticles('es', ledger)[0];
    expect(es.relatedQuestions[0]).toBe('es q1');
    expect(en.relatedQuestions[0]).toBe('en q1');
    // Legal text never translates.
    expect(es.citation).toBe(en.citation);
  });
});

describe('the projection survives composition unchanged', () => {
  const ledger = [entry()];

  it('keeps the module’s own body, citation, title and end-action', () => {
    const derived = deriveArticles('en').find((x) => x.key === 'rc_stage_ipp')!;
    const composed = reviewedArticles('en', ledger)[0];
    expect(composed.body).toEqual(derived.body);
    expect(composed.citation).toBe(derived.citation);
    expect(composed.target).toEqual(derived.target);
    expect(composed.title).toBe(derived.title);
  });

  it('adds only the reviewer’s judgment, and no provenance field leaks through', () => {
    const composed = reviewedArticles('en', ledger)[0];
    expect(composed.reviewedOn).toBe('2026-09-15');
    expect(composed.stage).toBe('seeking_help');
    expect('derivedFrom' in composed).toBe(false);
  });
});

describe('supersession retires an article everywhere', () => {
  const ledger = [entry({ key: 'ladder_friendly_ask', supersedes: 'ipp_clock' })];

  it('drops the superseded article and adds its replacement', () => {
    const keys = [
      ...getAuthoredArticles('en').filter((a) => !supersededKeys(ledger).has(a.key)),
      ...reviewedArticles('en', ledger),
    ].map((a) => a.key);
    expect(keys).toContain('ladder_friendly_ask');
    expect(keys).not.toContain('ipp_clock');
    expect(keys).toHaveLength(getAuthoredArticles('en').length);
  });
});

describe('the reviewer worklist', () => {
  const pending = pendingReview(authored, 'en');

  it('lists every unreviewed projection', () => {
    expect(pending).toHaveLength(deriveArticles('en').length);
  });

  it('reports EVERY shipped article sharing a citation, not just the last one', () => {
    // Two authored articles share 'W&I §4646.5 · §4648(a)'. A last-wins map hid
    // one of them, so a reviewer would retire one duplicate and leave the other.
    const overlap = pending.find((p) => p.key === 'rc_stage_rc_delivery')!;
    expect(overlap.sharesCitationWith.length).toBeGreaterThan(1);
    expect(overlap.sharesCitationWith).toContain('sibling_support');
    expect(overlap.sharesCitationWith).toContain('rc_money');
  });

  it('names the four projections that duplicate a shipped citation', () => {
    expect(pending.filter((p) => p.sharesCitationWith.length > 0).map((p) => p.key)).toEqual([
      'ladder_friendly_ask',
      'rc_stage_services',
      'rc_stage_rc_delivery',
      'school_stage_school_referral',
    ]);
  });

  it('traces each projection back to its source module', () => {
    for (const p of pending) {
      expect(['ladder', 'rc_stage', 'school_stage', 'stack'], p.key).toContain(p.source);
    }
  });

  it('reports counts as data, so a wording change is not a test change', () => {
    expect(reviewStatus(authored, 'en')).toEqual({ reviewed: 0, pending: 22, overlapping: 4 });
    expect(reviewStatus(authored, 'en', [entry()])).toEqual({
      reviewed: 1,
      pending: 21,
      overlapping: 4,
    });
  });
});
