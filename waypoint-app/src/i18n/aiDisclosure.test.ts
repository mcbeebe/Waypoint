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

/** The disclaimer must DENY being legal advice, not merely mention the word. */
const NOT_LEGAL_ADVICE: Record<keyof typeof LOCALES, RegExp> = {
  en: /\bnot legal advice\b/i,
  es: /\bno es asesor[ií]a legal\b/i,
  // No trailing \b: JS word boundaries are ASCII-only and never fire after
  // "ý", which would make this pattern match nothing at all.
  vi: /không phải tư vấn pháp lý/i,
};

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

    it(`[${name}] still says it is NOT legal advice`, () => {
      // The rename must not trade one disclosure for the other. This asserts
      // the NEGATION, per locale. The first version matched /legal|pháp lý/,
      // i.e. merely that the word appeared — an adversary pass mutated the
      // Spanish to "que sí es asesoría legal" and the Vietnamese to "chính là
      // tư vấn pháp lý" and every test still passed. In the two languages
      // nobody on the team can eyeball, that check was worse than none.
      expect(table.navigator.disclaimer).toMatch(NOT_LEGAL_ADVICE[key]);
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

  /**
   * Every AI-branded name for the product, in any locale — not just the three
   * literals this PR happened to replace. An adversary pass restored
   * `'IA de Waypoint'`, `'Consultar IA'` and `'Trợ lý AI của Waypoint'` into
   * the table and the original version of this test passed, which is precisely
   * the regression it claims to prevent.
   *
   * This is about the product's NAME. It deliberately does not match a bare
   * "AI"/"IA", because the disclaimer must keep saying that.
   */
  const AI_BRANDED_NAME =
    /\b(AI|IA)[\s-]*(Navigator|Navegador|Assistant|Trợ [Ll]ý|Hướng Dẫn Viên)|(Navigator|Navegador|Trợ [Ll]ý|Hướng Dẫn Viên)[\s-]*(de |con |với )?(AI|IA)\b|\b(IA|AI) de Waypoint\b/i;

  for (const [name, table] of Object.entries(LOCALES)) {
    it(`[${name}] never calls the product by an AI-branded name`, () => {
      const offenders = strings(table)
        .filter(([k]) => k !== 'navigator.disclaimer')
        .filter(([, v]) => AI_BRANDED_NAME.test(v));
      expect(offenders).toEqual([]);
    });
  }

  it('the pattern actually catches the names this rename removed', () => {
    // Guards the guard: a regex that matches nothing would pass every test
    // above forever.
    for (const bad of [
      'AI Navigator', 'Ask AI Navigator', 'Navegador de IA', 'IA de Waypoint',
      'Consultar IA de Waypoint', 'Hướng Dẫn Viên AI', 'Trợ lý AI',
    ]) {
      expect(AI_BRANDED_NAME.test(bad), bad).toBe(true);
    }
    // ...and does not fire on the disclosure, which must keep the word.
    for (const good of [
      'Waypoint Navigator', 'Navegador de Waypoint', 'Trợ Lý Waypoint',
      'AI-generated guidance — educational information only, not legal advice.',
      'Turn off AI features', 'Analyze with AI',
    ]) {
      expect(AI_BRANDED_NAME.test(good), good).toBe(false);
    }
  });

  it('all three locales still cover the same keys', () => {
    // Mostly redundant with tsc — every table is typed TranslationStrings, so
    // a missing or extra key is already a compile error. What it DOES add is
    // the string[] fields (`empathy`), where a length mismatch is type-legal
    // and would silently drop a line for one language only.
    const keys = (t: unknown) => strings(t).map(([k]) => k).sort();
    expect(keys(es)).toEqual(keys(en));
    expect(keys(vi)).toEqual(keys(en));
  });
});
