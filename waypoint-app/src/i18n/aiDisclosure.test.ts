/**
 * The Navigator's AI disclosure — the thing the rename could have quietly
 * removed.
 *
 * WHY THIS TEST EXISTS. The owner's instruction (Aug/Sep 2026) was to rewrite
 * "AI Navigator" to "Waypoint Navigator" everywhere except legal and pricing,
 * "and in those cases it can be a small text footnote disclosure." A
 * completeness pass over the rename found that the last few user-visible
 * "AI Navigator" strings were the ONLY places a parent met the word AI on the
 * chat path: the screen header said "Waypoint Navigator", the greeting said
 * "Hi! I'm your Waypoint Navigator", every entry point said "Ask the Waypoint
 * Navigator", and the one standing disclaimer said only "Educational
 * information only — not legal advice."
 *
 * So a parent could open the chat, ask what to do about their child's IEP,
 * act on the answer, and never learn they were talking to a machine. Finishing
 * the rename without adding the disclosure would not have been a rename; it
 * would have been the removal of the last disclosure, shipped as a branding
 * change.
 *
 * These assertions are deliberately about MEANING, not wording: the copy can
 * be rewritten freely, in any of the three languages, as long as it still
 * tells the family it is AI and still points them at a human advocate.
 */
import { describe, it, expect } from 'vitest';
import en from './en';
import es from './es';
import vi from './vi';

const LOCALES = { en, es, vi } as const;

/** How each language names the machine. */
const AI_TERM: Record<keyof typeof LOCALES, RegExp> = {
  en: /\bAI\b/,
  es: /\b(IA|AI)\b/,
  vi: /\b(AI|trí tuệ nhân tạo)\b/i,
};

describe('the Navigator disclaimer', () => {
  for (const [name, table] of Object.entries(LOCALES)) {
    const key = name as keyof typeof LOCALES;

    it(`[${name}] says the guidance is AI-generated`, () => {
      expect(table.navigator.disclaimer).toMatch(AI_TERM[key]);
    });

    it(`[${name}] still says it is not legal advice`, () => {
      // The rename must not trade one disclosure for the other.
      expect(table.navigator.disclaimer).toMatch(/legal|legal|pháp lý/i);
    });

    it(`[${name}] still points at a real human advocate`, () => {
      // Disability Rights California — the escape hatch from the machine.
      expect(table.navigator.disclaimer).toContain('1-800-776-5746');
    });

    it(`[${name}] stays short enough to read as a footnote`, () => {
      // The owner asked for "a small text footnote disclosure", not a wall.
      expect(table.navigator.disclaimer.length).toBeLessThan(180);
    });
  }
});

describe('the product name, across the whole string table', () => {
  /**
   * Walk every string in a locale table. The i18n `home`/`actions`/`calendar`
   * blocks are not currently read by any screen — the live copy is hardcoded
   * JSX — but a stale name sitting in the table is what a future session's
   * grep will find and act on, so it is held to the same rule.
   */
  const strings = (table: unknown, path = ''): Array<[string, string]> => {
    if (typeof table === 'string') return [[path, table]];
    if (!table || typeof table !== 'object') return [];
    return Object.entries(table as Record<string, unknown>).flatMap(([k, v]) =>
      strings(v, path ? `${path}.${k}` : k)
    );
  };

  for (const [name, table] of Object.entries(LOCALES)) {
    it(`[${name}] never calls the product "AI Navigator"`, () => {
      const offenders = strings(table).filter(([, v]) =>
        /AI Navigator|Navegador de IA|Hướng Dẫn Viên AI/i.test(v)
      );
      expect(offenders).toEqual([]);
    });
  }

  it('all three locales still describe the same set of keys', () => {
    // A rename applied to English only is how a Spanish-speaking family ends
    // up reading a different product's name.
    const keys = (t: unknown) => strings(t).map(([k]) => k).sort();
    expect(keys(es)).toEqual(keys(en));
    expect(keys(vi)).toEqual(keys(en));
  });
});
