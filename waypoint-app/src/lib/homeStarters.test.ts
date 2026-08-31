/**
 * Home search starters (the Home & search refresh).
 *
 * HomeScreen is too data-heavy to render in the ui suite, so — like
 * homeSearch.test.ts — this pins the contract the chips depend on: every
 * starter is a real query the search answers (no dead chip), and the set is in
 * full trilingual parity.
 */
import { describe, it, expect } from 'vitest';
import { getHomeStarters } from './homeStarters';
import { searchLearn } from './learnLibrary';
import { searchToolsForHome } from './toolsCatalog';

const LOCALES = ['en', 'es', 'vi'] as const;

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

  it('never seeds a dead search — every evergreen starter resolves in every language', () => {
    // A starter that isn't pendingContent must land a real hit (article, guide,
    // or tool) so the chip shows something, not an empty panel. Sibling support
    // is pendingContent (its article ships in initiative 005) — it never
    // dead-ends because the AI always answers, so it's excluded here and lights
    // up on its own once the content lands.
    for (const loc of LOCALES) {
      for (const s of getHomeStarters(loc)) {
        if (s.pendingContent) continue;
        const hits = searchLearn(s.seed, loc).length + searchToolsForHome(s.seed, loc).length;
        expect(hits, `${loc}: "${s.seed}" (${s.key}) found nothing`).toBeGreaterThan(0);
      }
    }
  });
});

describe('full trilingual parity', () => {
  it('gives every locale the same keys, icons and pending flags', () => {
    const en = getHomeStarters('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = getHomeStarters(loc);
      expect(other.map((s) => s.key)).toEqual(en.map((s) => s.key));
      expect(other.map((s) => s.icon)).toEqual(en.map((s) => s.icon));
      expect(other.map((s) => !!s.pendingContent)).toEqual(en.map((s) => !!s.pendingContent));
    }
  });

  it('translates the label and the seed rather than repeating English', () => {
    const en = getHomeStarters('en');
    for (const loc of ['es', 'vi'] as const) {
      getHomeStarters(loc).forEach((s, i) => {
        expect(s.label, `${s.key} ${loc} label`).not.toBe(en[i].label);
        // The seed is what a parent in that language would actually type.
        // (Respite's VI seed stays "respite" — that's the word the funding
        // article indexes — so this asserts the label, and the seed only where
        // a native word exists.)
        if (s.key !== 'respite' || loc !== 'vi') {
          expect(s.seed, `${s.key} ${loc} seed`).not.toBe(en[i].seed);
        }
      });
    }
  });
});
