/**
 * The copy on ActionDetail's in-body header controls.
 *
 * Every one of these was an English literal inside the JSX of a screen that
 * four other tabs push onto, in an app whose action copy is otherwise
 * trilingual. A logic test cannot see a literal in a component, which is why
 * `ActionDetailScreen.test.tsx` renders the header as well — these tests are
 * about the words themselves.
 */
import { describe, it, expect } from 'vitest';
import type { ActionLocale } from '@/lib/actionMeta';
import {
  actionHeaderEdit,
  actionHeaderEditA11y,
  actionHeaderEmailA11y,
  actionHeaderShareA11y,
  actionHeaderTextSizeA11y,
} from '@/lib/actionHeader';

const LOCALES: ActionLocale[] = ['en', 'es', 'vi'];

describe('the header controls are said in all three languages', () => {
  const PLAIN = [
    actionHeaderEdit,
    actionHeaderEditA11y,
    actionHeaderEmailA11y,
    actionHeaderShareA11y,
  ];

  it('in three actually different languages, not English three times', () => {
    for (const copy of PLAIN) {
      const said = LOCALES.map((l) => copy(l));
      for (const s of said) expect(s.length).toBeGreaterThan(0);
      expect(new Set(said).size, copy.name).toBe(3);
    }
  });

  it('including the spoken text-size label', () => {
    const said = LOCALES.map((l) => actionHeaderTextSizeA11y(100, l));
    expect(new Set(said).size).toBe(3);
  });

  it('defaults to English when no locale is given', () => {
    // Every one of these is called with `uiLocale`, but the default is what a
    // new call site gets for free, and English is the only safe one.
    for (const copy of PLAIN) expect(copy()).toBe(copy('en'));
    expect(actionHeaderTextSizeA11y(100)).toBe(actionHeaderTextSizeA11y(100, 'en'));
  });
});

/**
 * "Three distinct strings" is not "three languages": `'Edit' / 'Change' /
 * 'Modify'` satisfies it. These are the anchors a wrong-language string
 * breaks — the same idiom `actionReturn.test.ts` uses for the gone screen.
 */
describe('and they are actually Spanish and Vietnamese', () => {
  it('says the Spanish words a Spanish reader expects', () => {
    expect(actionHeaderEdit('es')).toBe('Editar');
    expect(actionHeaderEditA11y('es')).toMatch(/^Editar esta acción$/);
    expect(actionHeaderEmailA11y('es')).toMatch(/correo/);
    expect(actionHeaderShareA11y('es')).toMatch(/^Compartir/);
    expect(actionHeaderTextSizeA11y(100, 'es')).toMatch(/Tamaño del texto/);
  });

  it('says the Vietnamese words a Vietnamese reader expects', () => {
    expect(actionHeaderEdit('vi')).toBe('Sửa');
    // The spoken label carries the unambiguous word; `Sửa` alone can read as
    // "repair this" on a care plan, and the visible pill has no width for it.
    expect(actionHeaderEditA11y('vi')).toMatch(/^Chỉnh sửa/);
    expect(actionHeaderEmailA11y('vi')).toMatch(/^Viết/);
    expect(actionHeaderShareA11y('vi')).toMatch(/^Chia sẻ/);
    expect(actionHeaderTextSizeA11y(100, 'vi')).toMatch(/Cỡ chữ/);
  });

  it('is written in Vietnamese orthography throughout', () => {
    // A property, not a fixture: every one of these carries at least one
    // letter Vietnamese has and English and Spanish do not, so an English
    // string pasted into the `vi` slot fails without this file knowing what
    // the sentence says.
    const VIETNAMESE_ONLY = /[ăâđêôơưẠ-ỹ]/;
    for (const said of [
      actionHeaderEdit('vi'),
      actionHeaderEditA11y('vi'),
      actionHeaderEmailA11y('vi'),
      actionHeaderShareA11y('vi'),
      actionHeaderTextSizeA11y(100, 'vi'),
    ]) {
      expect(said).toMatch(VIETNAMESE_ONLY);
    }
  });
});

describe('what a screen reader is handed', () => {
  it('names what the Edit control edits, in every language', () => {
    // "Edit" alone, announced out of context, does not say edit WHAT — this
    // screen has an edit sheet, a step list, a note field and a due date.
    for (const locale of LOCALES) {
      expect(actionHeaderEditA11y(locale).length).toBeGreaterThan(
        actionHeaderEdit(locale).length
      );
    }
  });

  it('says the mail icon WRITES rather than sends, in every language', () => {
    // Some taps on this screen do send. A parent who cannot see the icon has
    // only this sentence to tell the two apart.
    expect(actionHeaderEmailA11y('en')).toMatch(/write/i);
    expect(actionHeaderEmailA11y('es')).toMatch(/escribir/i);
    expect(actionHeaderEmailA11y('vi')).toMatch(/viết/i);
  });

  it('tells the two send controls apart in every language', () => {
    // The mail icon and the share icon sit next to each other and look alike
    // to a screen reader if they are labelled alike.
    for (const locale of LOCALES) {
      expect(actionHeaderShareA11y(locale), locale).not.toBe(actionHeaderEmailA11y(locale));
    }
  });

  it('speaks the text size as a sentence with its number in it', () => {
    for (const locale of LOCALES) {
      const said = actionHeaderTextSizeA11y(130, locale);
      expect(said, locale).toContain('130');
      // "%" is a glyph; this string is read out loud, so the word is spelled.
      expect(said, locale).not.toContain('%');
      // And it says the tap does something, not just the current value.
      expect(said.length, locale).toBeGreaterThan('Text size 130'.length);
    }
  });

  it('carries the percentage it was given, not a fixed one', () => {
    for (const locale of LOCALES) {
      expect(actionHeaderTextSizeA11y(85, locale)).toContain('85');
      expect(actionHeaderTextSizeA11y(85, locale)).not.toContain('100');
    }
  });
});
