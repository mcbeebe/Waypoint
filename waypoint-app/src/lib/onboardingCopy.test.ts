/**
 * Onboarding copy parity (initiative 009, PR 4).
 *
 * The assertion that matters most here is not parity — it is that the option
 * VALUES are byte-identical to the ones `profileCopy.ts` uses. Onboarding and
 * Profile write the same three database columns (`children.rc_status`,
 * `children.iep_status`, `families.insurance_carrier`), so a value that drifts
 * between the two screens means a family's answer at signup cannot be read
 * back by the settings screen, or by `planGenerator` deciding their plan.
 *
 * That failure is silent, permanent, and lands only on the families this
 * whole initiative exists to serve — so it is pinned here rather than hoped
 * for.
 */
import { describe, it, expect } from 'vitest';
import {
  onboardingCopy,
  rcStatusOptions,
  iepStatusOptions,
  insuranceOptions,
  countyChosen,
  ageDisplay,
  ageBandLabel,
  type OnboardingCopy,
} from './onboardingCopy';
import {
  rcStatusOptions as profileRcOptions,
  iepStatusOptions as profileIepOptions,
  insuranceOptions as profileInsuranceOptions,
} from './profileCopy';
import type { FunnelLocale } from './eligibility';

const TRANSLATED: FunnelLocale[] = ['es', 'vi'];
const ALL: FunnelLocale[] = ['en', 'es', 'vi'];

describe('onboardingCopy is fully translated', () => {
  const en = onboardingCopy('en');

  it.each(TRANSLATED)('%s: no value is left in English', (locale) => {
    const other = onboardingCopy(locale);
    const leaks = (Object.keys(en) as (keyof OnboardingCopy)[]).filter(
      (k) => other[k] === en[k],
    );
    // 'Email (không bắt buộc)' still contains "Email", but the whole string
    // differs — an exact match is the leak, not a shared word.
    expect(leaks).toEqual([]);
  });

  it.each(TRANSLATED)('%s: every key is non-empty', (locale) => {
    const other = onboardingCopy(locale);
    for (const k of Object.keys(en) as (keyof OnboardingCopy)[]) {
      expect(other[k], `${locale}.${String(k)}`).toBeTruthy();
    }
  });
});

describe('option values match Profile exactly — the two screens share columns', () => {
  const pairs = [
    ['rcStatus', rcStatusOptions, profileRcOptions],
    ['iepStatus', iepStatusOptions, profileIepOptions],
    ['insurance', insuranceOptions, profileInsuranceOptions],
  ] as const;

  for (const [name, onboarding, profile] of pairs) {
    it(`${name}: same values, same order, as profileCopy`, () => {
      // Not merely "same set" — `SelectGrid` renders in order and a family
      // reading the two screens should meet the same choices in the same
      // sequence.
      expect(onboarding('en').map((o) => o.value)).toEqual(
        profile('en').map((o) => o.value),
      );
    });

    it(`${name}: values and emoji are locale-invariant`, () => {
      const en = onboarding('en');
      for (const locale of TRANSLATED) {
        const other = onboarding(locale);
        expect(other.map((o) => o.value), `${name}.${locale}`).toEqual(en.map((o) => o.value));
        expect(other.map((o) => o.emoji), `${name}.${locale}`).toEqual(en.map((o) => o.emoji));
      }
    });

    it(`${name}: EVERY label is translated except the proper noun`, () => {
      const en = onboarding('en');
      for (const locale of TRANSLATED) {
        const untranslated = onboarding(locale)
          .filter((o, i) => o.label === en[i].label && o.label !== 'Medi-Cal')
          .map((o) => o.value);
        expect(untranslated, `${name}.${locale}`).toEqual([]);
      }
    });
  }

  it('Medi-Cal is Medi-Cal in every language', () => {
    for (const locale of ALL) {
      expect(insuranceOptions(locale).find((o) => o.value === 'medicaid')?.label).toBe('Medi-Cal');
    }
  });
});

describe('option descriptions are translated where they exist', () => {
  it.each([
    ['rcStatus', rcStatusOptions],
    ['iepStatus', iepStatusOptions],
  ] as const)('%s: every description differs from English', (name, fn) => {
    const en = fn('en');
    for (const locale of TRANSLATED) {
      const other = fn(locale);
      other.forEach((o, i) => {
        expect(o.description, `${name}.${locale}.${o.value}`).toBeTruthy();
        expect(o.description, `${name}.${locale}.${o.value}`).not.toBe(en[i].description);
      });
    }
  });

  it('insurance has no descriptions in any language — the grid is label-only', () => {
    for (const locale of ALL) {
      for (const o of insuranceOptions(locale)) {
        expect(o.description).toBeUndefined();
      }
    }
  });
});

describe('the age badge pluralizes per language', () => {
  it('English inflects both nouns', () => {
    expect(ageDisplay(1, 1, 'en')).toBe('1 year, 1 month');
    expect(ageDisplay(2, 3, 'en')).toBe('2 years, 3 months');
    expect(ageDisplay(0, 1, 'en')).toBe('1 month');
    expect(ageDisplay(0, 5, 'en')).toBe('5 months');
  });

  it('Spanish inflects año/meses independently — never "1 años"', () => {
    expect(ageDisplay(1, 1, 'es')).toBe('1 año, 1 mes');
    expect(ageDisplay(1, 2, 'es')).toBe('1 año, 2 meses');
    expect(ageDisplay(3, 1, 'es')).toBe('3 años, 1 mes');
    expect(ageDisplay(0, 4, 'es')).toBe('4 meses');
  });

  it('Vietnamese has no grammatical plural — the numeral carries it', () => {
    expect(ageDisplay(1, 1, 'vi')).toBe('1 tuổi, 1 tháng');
    expect(ageDisplay(4, 7, 'vi')).toBe('4 tuổi, 7 tháng');
    expect(ageDisplay(0, 9, 'vi')).toBe('9 tháng');
    // The bug an English-shaped template would cause.
    expect(ageDisplay(4, 7, 'vi')).not.toMatch(/months|tháng s|thángs/);
  });

  it('a newborn does not read as "0 years"', () => {
    for (const locale of ALL) {
      expect(ageDisplay(0, 0, locale)).not.toMatch(/^0 (year|año|tuổi)/);
    }
  });

  it('negative or fractional input cannot produce nonsense', () => {
    for (const locale of ALL) {
      expect(ageDisplay(-3, -2, locale)).toBe(ageDisplay(0, 0, locale));
      expect(ageDisplay(2.9, 4.9, locale)).toBe(ageDisplay(2, 4, locale));
    }
  });
});

describe('the age band key is never translated, only its label', () => {
  it.each(ALL)('%s: keeps the band verbatim', (locale) => {
    // '0-2' / '3-5' / '6-12' / '13-17' are derived keys the plan generator
    // reads; translating one would change which plan a child gets.
    for (const band of ['0-2', '3-5', '6-12', '13-17']) {
      expect(ageBandLabel(band, locale)).toContain(band);
    }
  });

  it.each(TRANSLATED)('%s: the label around it IS translated', (locale) => {
    expect(ageBandLabel('3-5', locale)).not.toBe(ageBandLabel('3-5', 'en'));
  });
});

describe('the county chip carries the county name', () => {
  it.each(ALL)('%s', (locale) => {
    // County names are California place names — never translated.
    expect(countyChosen('Alameda', locale)).toContain('Alameda');
    expect(countyChosen('San Luis Obispo', locale)).toContain('San Luis Obispo');
  });

  it.each(TRANSLATED)('%s: the frame around the name is translated', (locale) => {
    expect(countyChosen('Alameda', locale)).not.toBe(countyChosen('Alameda', 'en'));
  });
});

describe('Spanish keeps the corpus register (usted, not tú)', () => {
  const TU_FORMS = /\b(tienes|puedes|tu hijo|tu nombre|tu código|inténtalo|elige|toca|busca)\b/i;

  it('no tú-form verbs in the fixed copy', () => {
    const offenders = Object.entries(onboardingCopy('es'))
      .filter(([, v]) => TU_FORMS.test(v))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('no tú-form verbs in the option descriptions', () => {
    for (const fn of [rcStatusOptions, iepStatusOptions, insuranceOptions]) {
      for (const o of fn('es')) {
        expect(o.label, o.value).not.toMatch(TU_FORMS);
        if (o.description) expect(o.description, o.value).not.toMatch(TU_FORMS);
      }
    }
  });

  it('refers to the child as "su hijo/a", the established convention', () => {
    const es = onboardingCopy('es');
    expect(es.childFirstName).toContain('hijo/a');
    expect(es.diagnosisTitle).toContain('hijo/a');
  });
});

describe('a transposed es/vi pair cannot hide', () => {
  /**
   * WHY A HEURISTIC AND NOT A TYPE. Moving to `Record<FunnelLocale, string>`
   * makes a DROPPED locale a compile error and a transposed one visible to a
   * reader — but not to the compiler: `{ es: 'Tiếp theo', vi: 'Siguiente' }`
   * type-checks, and every parity assertion here is satisfied, because both
   * values still differ from English. An adversary pass demonstrated exactly
   * that: two swapped pairs, `tsc` clean, 1613 tests green, and a Spanish
   * parent reading Vietnamese on the footer button through all six steps.
   *
   * The two orthographies are disjoint enough to catch it cheaply. Vietnamese
   * uses horned and breve vowels and đ, which Spanish has none of; Spanish
   * uses ñ and inverted punctuation, which Vietnamese has none of.
   */
  const VIETNAMESE_ONLY = /[ăâđêôơưĂÂĐÊÔƠƯ]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỷỹỵ]/;
  const SPANISH_ONLY = /[ñÑ¿¡]/;

  /** Every translated string the module can produce, by locale. */
  function stringsFor(locale: FunnelLocale): string[] {
    const out = Object.values(onboardingCopy(locale));
    for (const fn of [rcStatusOptions, iepStatusOptions, insuranceOptions]) {
      for (const o of fn(locale)) {
        out.push(o.label);
        if (o.description) out.push(o.description);
      }
    }
    out.push(countyChosen('Alameda', locale), ageBandLabel('3-5', locale), ageDisplay(2, 3, locale));
    return out;
  }

  it('no Spanish string contains Vietnamese-only letters', () => {
    const offenders = stringsFor('es').filter((v) => VIETNAMESE_ONLY.test(v));
    expect(offenders, 'Vietnamese text in the es slot').toEqual([]);
  });

  it('no Vietnamese string contains Spanish-only characters', () => {
    const offenders = stringsFor('vi').filter((v) => SPANISH_ONLY.test(v));
    expect(offenders, 'Spanish text in the vi slot').toEqual([]);
  });

  it('the guard actually fires on a transposed pair', () => {
    // Proves the regexes bite, so a future edit cannot quietly defang them.
    expect(VIETNAMESE_ONLY.test('Tiếp theo')).toBe(true);
    expect(VIETNAMESE_ONLY.test('Siguiente')).toBe(false);
    expect(SPANISH_ONLY.test('¿No sabe su código postal?')).toBe(true);
    expect(SPANISH_ONLY.test('Không biết mã bưu điện?')).toBe(false);
  });
});
