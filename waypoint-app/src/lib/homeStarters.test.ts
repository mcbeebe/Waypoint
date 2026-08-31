/**
 * Home search starters (the Home & search refresh).
 *
 * HomeScreen is too data-heavy to render in the ui suite, so — like
 * homeSearch.test.ts — this pins the contract the chips depend on: every
 * starter is a real query the search answers with the RIGHT result (not just
 * *a* result — the "relevo → sibling article" miss an adversary caught), and
 * the set is in full trilingual parity.
 */
import { describe, it, expect } from 'vitest';
import { getHomeStarters } from './homeStarters';
import { searchLearn } from './learnLibrary';
import { searchToolsForHome } from './toolsCatalog';

const LOCALES = ['en', 'es', 'vi'] as const;

/** The article or tool each starter is meant to surface, for the relevance check. */
const INTENDED: Record<string, { learn?: string; tool?: string }> = {
  said_no: { learn: 'rc_said_no' },
  read_iep: { tool: 'analyze_iep' },
  sibling_support: { learn: 'sibling_support' },
  respite: { learn: 'rc_money' },
};

describe('the starters are real, tappable openers', () => {
  it('offers four, each with an icon, a label and a seed', () => {
    for (const loc of LOCALES) {
      const starters = getHomeStarters(loc);
      expect(starters).toHaveLength(4);
      for (const s of starters) {
        expect(s.icon.length, `${s.key} icon`).toBeGreaterThan(0);
        expect(s.label.length, `${s.key} label`).toBeGreaterThan(0);
        expect(s.seed.length, `${s.key} seed`).toBeGreaterThan(0);
      }
    }
  });

  it('seeds the RIGHT result in every language — not just any hit', () => {
    // >0 isn't enough: a seed that resolves to the wrong article is a worse
    // failure than a blank one, because it looks like it worked. Each seed must
    // surface its intended article (or tool) among the hits.
    for (const loc of LOCALES) {
      for (const s of getHomeStarters(loc)) {
        const want = INTENDED[s.key];
        const learn = searchLearn(s.seed, loc).map((h) => h.key);
        const tools = searchToolsForHome(s.seed, loc).map((h) => h.key);
        if (want.learn) {
          expect(learn, `${loc}: "${s.seed}" (${s.key}) should surface ${want.learn}`).toContain(
            want.learn
          );
        }
        if (want.tool) {
          expect(tools, `${loc}: "${s.seed}" (${s.key}) should surface ${want.tool}`).toContain(
            want.tool
          );
        }
      }
    }
  });
});

describe('full trilingual parity', () => {
  it('gives every locale the same keys and icons', () => {
    const en = getHomeStarters('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = getHomeStarters(loc);
      expect(other.map((s) => s.key)).toEqual(en.map((s) => s.key));
      expect(other.map((s) => s.icon)).toEqual(en.map((s) => s.icon));
    }
  });

  it('translates the label rather than repeating English', () => {
    const en = getHomeStarters('en');
    for (const loc of ['es', 'vi'] as const) {
      getHomeStarters(loc).forEach((s, i) => {
        expect(s.label, `${s.key} ${loc} label`).not.toBe(en[i].label);
      });
    }
  });

  it('translates the seed too — except respite, whose seed is the indexing word', () => {
    // The respite seed is deliberately the funding article's indexing word, not
    // a native-language translation: the ES "relevo" and the VI native phrase
    // both top-resolve to the sibling article instead. So the label is native,
    // the seed is what reliably lands the funding guide. Every OTHER starter's
    // seed is a real translation.
    const en = getHomeStarters('en');
    for (const loc of ['es', 'vi'] as const) {
      getHomeStarters(loc).forEach((s, i) => {
        if (s.key === 'respite') return;
        expect(s.seed, `${s.key} ${loc} seed`).not.toBe(en[i].seed);
      });
    }
  });
});
