import { describe, it, expect } from 'vitest';
import {
  getGlossary,
  getLearnArticle,
  getLearnArticles,
  getLearnLibrary,
  getLearnPaths,
  popularQuestions,
  searchLearn,
  type ArticleBlock,
  type LearnArticle,
} from './learnLibrary';
import { sourceForCitation } from '@/data/contentSources';

const LOCALES = ['en', 'es', 'vi'] as const;

/** All prose in an article's body, flattened — for tone/translation checks. */
function bodyText(a: LearnArticle): string {
  return a.body.map((b: ArticleBlock) => (b.kind === 'steps' ? b.items.join(' ') : b.text)).join(' ');
}

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

  it('the guides that left the Tools catalog stay findable and navigable here', () => {
    // When the "how the system works" / benefits-stack guides moved out of the
    // Tools doors (guides get one home in Learn), ToolsArea began falling
    // through to searchLearn for those words. This pins the contract it relies
    // on: each guide word still lands a navigable guide.
    const nav = (q: string) => searchLearn(q).filter((h) => h.target).map((h) => h.key);
    expect(nav('ihss')).toContain('benefits');
    expect(nav('medi-cal')).toContain('benefits');
    expect(nav('school')).toContain('process_school');
    expect(nav('iep')).toContain('process_school');
    expect(nav('regional center')).toContain('process_rc');
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
        ...lib.articles.map((a) => `${a.title} ${a.summary} ${bodyText(a)}`),
        ...lib.glossary.map((g) => g.plain),
      ].join(' ');
      expect(blob.toUpperCase()).not.toContain('WAYPOINT NOTICED');
    }
  });

  it('keeps the collaborative-first tone in every action label and body', () => {
    for (const loc of LOCALES) {
      for (const a of getLearnArticles(loc)) {
        expect(a.actionLabel.toLowerCase()).not.toMatch(/demand|exigir|yêu sách/);
        // The body may teach that tone firms up, but must never open on a demand.
        expect(bodyText(a).toLowerCase()).not.toMatch(/\bdemand\b|exigir|yêu sách/);
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

  it('matches whole words, so a fragment does not match inside one', () => {
    // "ice" must not match "Notice"; "valuation" must not match "evaluation".
    expect(searchLearn('ice')).toEqual([]);
    expect(searchLearn('valuation')).toEqual([]);
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

describe('the IPP clock article gives a family both halves of the statute', () => {
  it('names the 7-day path, not only the 30-day one', () => {
    // W&I §4646.5(b) sets 30 days from the request, "or no later than 7 days
    // … if necessary for the consumer's health and safety or to maintain the
    // consumer in their home". Omitting the second half tells a parent in
    // crisis to wait a month when the law gives them a week.
    const article = getLearnArticles().find((a) => a.key === 'ipp_clock')!;
    expect(article.summary).toMatch(/30 days/);
    expect(article.summary).toMatch(/7 days/);
    expect(article.summary).toMatch(/health and safety/i);
    const ipp = getGlossary().find((g) => g.term === 'IPP')!;
    expect(ipp.plain).toMatch(/7/);
  });

  it('says it in every language', () => {
    for (const loc of ['es', 'vi'] as const) {
      const article = getLearnArticles(loc).find((a) => a.key === 'ipp_clock')!;
      expect(article.summary).toMatch(/7/);
    }
  });

  it('is findable by a parent searching for the urgent path', () => {
    expect(searchLearn('health and safety').some((h) => h.key === 'ipp_clock')).toBe(true);
  });
});

describe('articles are readable pages now, not just blurbs (phase 8, 8-0)', () => {
  it('every article has a non-empty body and a reviewed-on date', () => {
    for (const a of getLearnArticles('en')) {
      expect(a.body.length, `${a.key} body`).toBeGreaterThan(0);
      expect(a.reviewedOn, `${a.key} reviewedOn`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('the body structure is identical across locales (parity, incl. step counts)', () => {
    const en = getLearnArticles('en');
    for (const loc of ['es', 'vi'] as const) {
      getLearnArticles(loc).forEach((a, i) => {
        expect(a.body.map((b) => b.kind), `${a.key} block kinds`).toEqual(
          en[i].body.map((b) => b.kind)
        );
        a.body.forEach((b, j) => {
          if (b.kind === 'steps') {
            const enB = en[i].body[j];
            if (enB.kind === 'steps') expect(b.items.length).toBe(enB.items.length);
          }
        });
      });
    }
  });

  it('translates the body rather than repeating English', () => {
    const en = getLearnArticles('en');
    for (const loc of ['es', 'vi'] as const) {
      getLearnArticles(loc).forEach((a, i) => {
        const first = a.body.find((b) => b.kind === 'para');
        const enFirst = en[i].body.find((b) => b.kind === 'para');
        if (first?.kind === 'para' && enFirst?.kind === 'para') {
          expect(first.text, `${a.key} ${loc}`).not.toBe(enFirst.text);
        }
      });
    }
  });

  it('getLearnArticle returns one by key, or null', () => {
    expect(getLearnArticle('ipp_clock', 'en')?.key).toBe('ipp_clock');
    expect(getLearnArticle('does_not_exist', 'en')).toBeNull();
  });
});
