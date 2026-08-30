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

describe('the search puts the right answer first, in every language', () => {
  const top = (q: string, loc: 'en' | 'es' | 'vi') => searchLearn(q, loc)[0];

  it('answers a phone denial with the denial article, not the clock article', () => {
    // The clock article's summary once contained "said on the phone", and
    // flat substring scoring let that decoy win.
    expect(top('They said no on the phone — now what?', 'en').key).toBe('rc_said_no');
    expect(top('Dijeron que no por teléfono — ¿y ahora?', 'es').key).toBe('rc_said_no');
    expect(top('Họ từ chối qua điện thoại — giờ sao?', 'vi').key).toBe('rc_said_no');
  });

  it('answers a money question with the money article', () => {
    expect(top('What can the Regional Center pay for?', 'en').key).toBe('rc_money');
    expect(top('¿Qué puede pagar el Centro Regional?', 'es').key).toBe('rc_money');
    expect(top('Trung tâm Khu vực có thể chi trả cho gì?', 'vi').key).toBe('rc_money');
  });

  it('answers an evaluation question with the IEP article', () => {
    expect(top('How do I ask for an IEP evaluation?', 'en').key).toBe('first_iep');
    expect(top('¿Cómo pido una evaluación de IEP?', 'es').key).toBe('first_iep');
    expect(top('Làm sao để đề nghị đánh giá IEP?', 'vi').key).toBe('first_iep');
  });

  it('does not amputate a Vietnamese word that starts with đ', () => {
    // đ is precomposed, so NFD leaves it and the tokenizer treated it as a
    // separator: "đánh giá" became ["anh", "gia"] and matched nothing useful.
    expect(top('đánh giá', 'vi').key).toBe('first_iep');
    expect(top('tã', 'vi').key).toBe('rc_money');
  });

  it('matches whole words, so "no" does not match "notice"', () => {
    const hits = searchLearn('no');
    expect(hits.every((h) => h.key !== 'ipp_clock')).toBe(true);
  });
});

describe('a target a parent can actually reach', () => {
  it('names the tab on every path and article', () => {
    for (const p of getLearnPaths()) expect(p.target.tab).toBe('Home');
    for (const a of getLearnArticles()) expect(a.target.tab).toBe('Home');
  });

  it('gives a definition no target — it is the answer, not a button', () => {
    for (const hit of searchLearn('IPP')) {
      if (hit.kind === 'glossary') expect(hit.target).toBeUndefined();
      else expect(hit.target?.tab).toBe('Home');
    }
  });
});

describe('the library never asserts what it cannot back', () => {
  it('does not claim an agency failed, or that no rule requires anything', () => {
    for (const loc of LOCALES) {
      const blob = getLearnArticles(loc).map((a) => a.summary).join(' ');
      expect(blob).not.toMatch(/nothing requires anyone|nada obliga a nadie|không quy định nào buộc/);
    }
  });
});
