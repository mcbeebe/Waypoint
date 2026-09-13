/**
 * Contacts-card copy parity (initiative 009, PR 1).
 *
 * `ContactOrg` values are a persisted union (`hooks/useContacts.ts:10`) that
 * the letter writer reads to decide who a draft is addressed to. Labels
 * translate; values must not. Same split as the Profile intake grids.
 */
import { describe, it, expect } from 'vitest';
import {
  contactsCopy,
  orgOptions,
  roleSuggestions,
  editContactLabel,
  removeContactTitle,
  type ContactsCopy,
} from './contactsCopy';
import type { FunnelLocale } from './eligibility';

const TRANSLATED: FunnelLocale[] = ['es', 'vi'];

/** Legitimately identical across languages: a sample address and a phone number. */
const ALLOWED_IDENTICAL: (keyof ContactsCopy)[] = ['emailPlaceholder', 'phonePlaceholder'];

describe('contactsCopy is fully translated', () => {
  const en = contactsCopy('en');

  for (const locale of TRANSLATED) {
    it(`${locale}: no value is left in English`, () => {
      const other = contactsCopy(locale);
      const leaks = (Object.keys(en) as (keyof ContactsCopy)[]).filter(
        (k) => !ALLOWED_IDENTICAL.includes(k) && other[k] === en[k],
      );
      // "Email" is the accepted word in Vietnamese.
      const expected = locale === 'vi' ? ['email'] : [];
      expect(leaks).toEqual(expected);
    });

    it(`${locale}: every key is non-empty`, () => {
      const other = contactsCopy(locale);
      for (const k of Object.keys(en) as (keyof ContactsCopy)[]) {
        expect(other[k], `${locale}.${String(k)}`).toBeTruthy();
      }
    });
  }
});

describe('organisation chips: values invariant, labels translated', () => {
  const en = orgOptions('en');

  it.each(TRANSLATED)('%s keeps every value and emoji', (locale) => {
    const other = orgOptions(locale);
    // A translated value would write a row `useContacts` and the letter
    // writer cannot read, silently detaching a contact from its agency.
    expect(other.map((o) => o.value)).toEqual(en.map((o) => o.value));
    expect(other.map((o) => o.emoji)).toEqual(en.map((o) => o.emoji));
  });

  it.each(TRANSLATED)('%s translates EVERY label', (locale) => {
    const other = orgOptions(locale);
    const untranslated = other.filter((o, i) => o.label === en[i].label).map((o) => o.value);
    expect(untranslated).toEqual([]);
  });
});

describe('role suggestions are offered in the parent\'s language', () => {
  it('has the same number of suggestions in every language', () => {
    for (const locale of TRANSLATED) {
      expect(roleSuggestions(locale).length).toBe(roleSuggestions('en').length);
    }
  });

  it.each(TRANSLATED)('%s shares no suggestion with English', (locale) => {
    // These are free text that lands in `contacts.role` and then inside a
    // generated letter — a Spanish letter naming a "SpEd Teacher" reads as a
    // half-translated document.
    const overlap = roleSuggestions(locale).filter((r) => roleSuggestions('en').includes(r));
    expect(overlap).toEqual([]);
  });
});

describe('interpolated contact strings carry the name', () => {
  const NAME = 'Maria Lopez';

  it.each(['en', ...TRANSLATED] as FunnelLocale[])('%s', (locale) => {
    expect(editContactLabel(NAME, locale)).toContain(NAME);
    expect(removeContactTitle(NAME, locale)).toContain(NAME);
  });

  it.each(TRANSLATED)('%s differs from English', (locale) => {
    expect(editContactLabel(NAME, locale)).not.toBe(editContactLabel(NAME, 'en'));
    expect(removeContactTitle(NAME, locale)).not.toBe(removeContactTitle(NAME, 'en'));
  });
});
