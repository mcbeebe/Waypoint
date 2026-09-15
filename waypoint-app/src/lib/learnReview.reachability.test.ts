/**
 * Reachability of a REVIEWED article — the regression that shipped green.
 *
 * The first draft of slice 8-2 composed derived articles in a helper that only
 * `LearnPanel` called. Every test passed, because with an empty ledger the
 * composed library equals the authored one and nothing exercises the difference.
 * The first real review entry would have produced a card that 404'd on tap and
 * could not be found by typing its own title.
 *
 * So this file mocks the ledger non-empty and asserts the three surfaces a
 * family actually reaches an article through — the list, the reader, and search
 * — all agree. It is the only place the composed path is exercised end to end.
 */
import { describe, it, expect, vi } from 'vitest';
import { deriveArticles } from './learnDerive';

const REVIEWED_KEY = 'rc_stage_ipp';

// Stand in for a ledger with one reviewed article. Mocking the gate rather than
// the library keeps `learnLibrary`'s own composition under test.
vi.mock('./learnReview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./learnReview')>();
  const entry = {
    key: REVIEWED_KEY,
    reviewedOn: '2026-09-15',
    reviewedBy: 'Reachability Fixture',
    stage: 'seeking_help' as const,
    relatedQuestions: {
      en: ['a', 'b', 'c', 'd', 'e'],
      es: ['a-es', 'b-es', 'c-es', 'd-es', 'e-es'],
      vi: ['a-vi', 'b-vi', 'c-vi', 'd-vi', 'e-vi'],
    },
  };
  return {
    ...actual,
    REVIEW_LEDGER: [entry],
    reviewedArticles: (locale: 'en' | 'es' | 'vi' = 'en') => actual.reviewedArticles(locale, [entry]),
    supersededKeys: () => actual.supersededKeys([entry]),
  };
});

const lib = await import('./learnLibrary');

describe('with one article reviewed', () => {
  it('appears in the library a family browses', () => {
    expect(lib.getLearnArticles('en').map((a) => a.key)).toContain(REVIEWED_KEY);
  });

  it('opens in the reader — the tap is not a dead end', () => {
    // getLearnArticle resolves the key LearnPanel navigates with. When it read
    // a different set than the list, every tap landed on "That article isn't
    // available."
    const article = lib.getLearnArticle(REVIEWED_KEY, 'en');
    expect(article).toBeTruthy();
    expect(article!.key).toBe(REVIEWED_KEY);
  });

  it('carries the Reviewed seal on the screen that renders it', () => {
    // reviewedOn is the whole point of the ledger, and it renders only in the
    // reader — the screen that previously could not find the article at all.
    expect(lib.getLearnArticle(REVIEWED_KEY, 'en')!.reviewedOn).toBe('2026-09-15');
  });

  it('is findable by typing its own title', () => {
    const article = lib.getLearnArticle(REVIEWED_KEY, 'en')!;
    const hits = lib.searchLearn(article.title, 'en');
    expect(hits.map((h) => h.key)).toContain(REVIEWED_KEY);
  });

  it('is findable by its own primary question', () => {
    const article = lib.getLearnArticle(REVIEWED_KEY, 'en')!;
    const hits = lib.searchLearn(article.primaryQuestion, 'en');
    expect(hits.map((h) => h.key)).toContain(REVIEWED_KEY);
  });

  it('every listed article is openable and findable — browse and search agree', () => {
    for (const a of lib.getLearnArticles('en')) {
      expect(lib.getLearnArticle(a.key, 'en'), `${a.key} listed but not openable`).toBeTruthy();
      const hits = lib.searchLearn(a.primaryQuestion, 'en');
      expect(hits.some((h) => h.key === a.key), `${a.key} not findable`).toBe(true);
    }
  });

  it('is reachable in Spanish and Vietnamese too', () => {
    for (const locale of ['es', 'vi'] as const) {
      expect(lib.getLearnArticle(REVIEWED_KEY, locale), locale).toBeTruthy();
      expect(lib.getLearnArticles(locale).map((a) => a.key)).toContain(REVIEWED_KEY);
    }
  });

  it('still leaves every UNreviewed projection out of the library', () => {
    const live = new Set(lib.getLearnArticles('en').map((a) => a.key));
    for (const a of deriveArticles('en')) {
      if (a.key === REVIEWED_KEY) continue;
      expect(live.has(a.key), a.key).toBe(false);
    }
  });
});
