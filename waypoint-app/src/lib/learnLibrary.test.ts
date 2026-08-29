import { describe, it, expect } from 'vitest';
import {
  getGlossary,
  getLearnArticles,
  getLearnLibrary,
  getLearnPaths,
  popularQuestions,
  searchLearn,
} from './learnLibrary';
import { sourceForCitation } from '@/data/contentSources';

const LOCALES = ['en', 'es', 'vi'] as const;

describe('every article ends somewhere a family can act', () => {
  it('gives each article an action and a destination', () => {
    for (const a of getLearnArticles()) {
      expect(a.actionLabel.length).toBeGreaterThan(0);
      expect(a.target.screen.length).toBeGreaterThan(0);
    }
  });

  it('is honest about how long each one takes', () => {
    for (const a of getLearnArticles()) {
      expect(a.minutes).toBeGreaterThan(0);
      expect(a.minutes).toBeLessThan(30);
    }
  });

  it('points every path at a screen, not a promise', () => {
    for (const p of getLearnPaths()) {
      expect(p.target.screen.length).toBeGreaterThan(0);
    }
  });
});

describe('a legal claim carries a source that has been verified', () => {
  it('covers every citation in the library', () => {
    const cited = [
      ...getLearnArticles().map((a) => a.citation),
      ...getGlossary().map((g) => g.citation),
    ].filter(Boolean) as string[];
    expect(cited.length).toBeGreaterThan(0);
    for (const c of cited) {
      expect(sourceForCitation(c), `orphan citation: ${c}`).not.toBeNull();
    }
  });

  it('never translates a citation', () => {
    const en = getLearnArticles('en').map((a) => a.citation);
    for (const loc of ['es', 'vi'] as const) {
      expect(getLearnArticles(loc).map((a) => a.citation)).toEqual(en);
      expect(getGlossary(loc).map((g) => g.citation)).toEqual(getGlossary('en').map((g) => g.citation));
    }
  });
});

describe('the library answers before the AI has to', () => {
  it('finds the glossary entry for "what is an IPP"', () => {
    const hits = searchLearn('what is an IPP');
    expect(hits[0].kind).toBe('glossary');
    expect(hits[0].title).toBe('IPP');
  });

  it('finds the same thing in Spanish and Vietnamese', () => {
    expect(searchLearn('qué es un IPP', 'es')[0].title).toBe('IPP');
    expect(searchLearn('IPP là gì?', 'vi')[0].title).toBe('IPP');
  });

  it('answers the question a denial actually raises', () => {
    const hits = searchLearn('they denied it');
    expect(hits.some((h) => h.key === 'rc_said_no')).toBe(true);
  });

  it('routes a search for diapers to the funding guide', () => {
    const hits = searchLearn('diapers');
    expect(hits[0].key).toBe('rc_money');
    expect(hits[0].actionLabel).toBeTruthy();
  });

  it('is not fooled by the filler words in a typed question', () => {
    // Without stop words, "what is a" matched almost everything.
    expect(searchLearn('what is the')).toEqual([]);
    expect(searchLearn('   ')).toEqual([]);
  });

  it('ignores accents, so an unaccented search still works', () => {
    expect(searchLearn('que es un IPP', 'es')[0].title).toBe('IPP');
  });

  it('returns nothing rather than guessing', () => {
    expect(searchLearn('quantum tunnelling')).toEqual([]);
  });
});

describe('locale parity', () => {
  it('gives every locale the same entries, keys and destinations', () => {
    const en = getLearnLibrary('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = getLearnLibrary(loc);
      expect(other.paths.map((p) => p.key)).toEqual(en.paths.map((p) => p.key));
      expect(other.articles.map((a) => a.key)).toEqual(en.articles.map((a) => a.key));
      expect(other.glossary.map((g) => g.term)).toEqual(en.glossary.map((g) => g.term));
      expect(other.paths.map((p) => p.target.screen)).toEqual(en.paths.map((p) => p.target.screen));
      expect(other.articles.map((a) => a.target.screen)).toEqual(
        en.articles.map((a) => a.target.screen)
      );
    }
  });

  it('translates the prose rather than repeating English', () => {
    const en = getLearnLibrary('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = getLearnLibrary(loc);
      other.paths.forEach((p, i) => expect(p.title).not.toBe(en.paths[i].title));
      other.articles.forEach((a, i) => expect(a.summary).not.toBe(en.articles[i].summary));
      other.glossary.forEach((g, i) => expect(g.plain).not.toBe(en.glossary[i].plain));
    }
  });

  it('offers four popular questions in every language', () => {
    for (const loc of LOCALES) {
      expect(popularQuestions(loc)).toHaveLength(4);
      for (const q of popularQuestions(loc)) expect(q.length).toBeGreaterThan(0);
    }
    expect(popularQuestions('es')[0]).not.toBe(popularQuestions('en')[0]);
  });

  it('every popular question finds something in the library', () => {
    for (const loc of LOCALES) {
      for (const q of popularQuestions(loc)) {
        expect(searchLearn(q, loc).length, `${loc}: ${q}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('provenance, not praise', () => {
  it('never uses the banned eyebrow', () => {
    for (const loc of LOCALES) {
      const lib = getLearnLibrary(loc);
      const blob = [
        ...lib.paths.map((p) => `${p.title} ${p.description}`),
        ...lib.articles.map((a) => `${a.title} ${a.summary}`),
        ...lib.glossary.map((g) => g.plain),
      ].join(' ');
      expect(blob.toUpperCase()).not.toContain('WAYPOINT NOTICED');
    }
  });

  it('keeps the collaborative-first tone in every action label', () => {
    for (const loc of LOCALES) {
      for (const a of getLearnArticles(loc)) {
        expect(a.actionLabel.toLowerCase()).not.toMatch(/demand|exigir|yêu sách/);
      }
    }
  });
});
