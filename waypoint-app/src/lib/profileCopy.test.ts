/**
 * Profile copy parity (initiative 009, PR 1).
 *
 * The same discipline `localeParity.test.ts` applies to the content modules,
 * applied to screen chrome: translation may change PROSE and nothing else.
 * Option VALUES are keys the database stores, so they must be identical in
 * every language; option LABELS must not be. And a string that is still
 * English in the Spanish bundle is the exact defect this initiative exists to
 * remove, so it fails here rather than in a family's hands.
 */
import { describe, it, expect } from 'vitest';
import {
  profileCopy,
  rcStatusOptions,
  iepStatusOptions,
  insuranceOptions,
  editChildLabel,
  removeChildLabel,
  makePrimaryLabel,
  nowPrimaryToast,
  childRemovedToast,
  childAddedToast,
  removeChildTitle,
  removeChildBody,
  removeConfirmLabel,
  forgetMemoryLabel,
  textSizeLabel,
  profileUpdatedClosed,
  bornLabel,
  gradeLabel,
  googleConnectedFull,
  googleConnectedCalendarOnly,
  yourGoogleAccount,
  type ProfileCopy,
} from './profileCopy';
import type { FunnelLocale } from './eligibility';

const TRANSLATED: FunnelLocale[] = ['es', 'vi'];

/**
 * Strings that are legitimately identical across languages. Anything NOT on
 * this list that matches its English twin is an untranslated leak.
 *  - `version` is a product name plus a semver string.
 *  - `email` is the accepted word in Vietnamese.
 */
const ALLOWED_IDENTICAL: Partial<Record<FunnelLocale, (keyof ProfileCopy)[]>> = {
  es: ['version'],
  vi: ['version', 'email'],
};

describe('profileCopy is fully translated', () => {
  const en = profileCopy('en');

  for (const locale of TRANSLATED) {
    it(`${locale}: no value is left in English`, () => {
      const other = profileCopy(locale);
      const allowed = new Set<string>(ALLOWED_IDENTICAL[locale] ?? []);
      const leaks = (Object.keys(en) as (keyof ProfileCopy)[]).filter(
        (k) => !allowed.has(k) && other[k] === en[k],
      );
      expect(leaks).toEqual([]);
    });

    it(`${locale}: every key is present and non-empty`, () => {
      const other = profileCopy(locale);
      for (const k of Object.keys(en) as (keyof ProfileCopy)[]) {
        expect(other[k], `${locale}.${String(k)}`).toBeTruthy();
      }
    });
  }

  it('an unknown locale falls back to English rather than blanking', () => {
    // `toFunnelLocale` already narrows, but the default parameter is the last
    // line of defence if a caller ever passes through something unmapped.
    expect(profileCopy().familyInfo).toBe(en.familyInfo);
  });
});

describe('Spanish keeps the corpus register (usted, not tú)', () => {
  const es = profileCopy('es');
  // The existing locale records run 232 usted-form hits to 9 tú-form. New
  // chrome must not drift to tú — the app addresses parents formally.
  const TU_FORMS = /\b(tienes|puedes|tu hijo|tus datos|inténtalo|toca)\b/i;

  it('no tú-form verbs or possessives', () => {
    const offenders = Object.entries(es)
      .filter(([, v]) => TU_FORMS.test(v))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('refers to the child as "su hijo/a", the established convention', () => {
    expect(es.childFirstName).toContain('hijo/a');
    expect(es.newChildFirstName).toContain('hijo/a');
  });
});

describe('option grids are structurally locale-invariant', () => {
  const grids = [
    ['rcStatus', rcStatusOptions],
    ['iepStatus', iepStatusOptions],
    ['insurance', insuranceOptions],
  ] as const;

  for (const [name, fn] of grids) {
    const en = fn('en');

    it(`${name}: values and emoji are identical across locales`, () => {
      for (const locale of TRANSLATED) {
        const other = fn(locale);
        // Values are persisted to the database — a translated value would
        // silently write a row the rest of the app cannot read.
        expect(other.map((o) => o.value)).toEqual(en.map((o) => o.value));
        expect(other.map((o) => o.emoji)).toEqual(en.map((o) => o.emoji));
        expect(other.length).toBe(en.length);
      }
    });

    it(`${name}: labels are actually translated`, () => {
      for (const locale of TRANSLATED) {
        const other = fn(locale);
        // Not a blanket inequality: "Medi-Cal" is a proper noun that stays.
        const changed = other.filter((o, i) => o.label !== en[i].label);
        expect(changed.length).toBeGreaterThan(0);
      }
    });
  }

  it('Medi-Cal stays Medi-Cal in every language (it is a proper noun)', () => {
    for (const locale of ['en', ...TRANSLATED] as FunnelLocale[]) {
      const medicaid = insuranceOptions(locale).find((o) => o.value === 'medicaid');
      expect(medicaid?.label).toBe('Medi-Cal');
    }
  });
});

describe('interpolated strings carry the name in every language', () => {
  const NAME = 'Teddy';
  const fns = [
    ['editChildLabel', editChildLabel],
    ['removeChildLabel', removeChildLabel],
    ['makePrimaryLabel', makePrimaryLabel],
    ['nowPrimaryToast', nowPrimaryToast],
    ['childRemovedToast', childRemovedToast],
    ['childAddedToast', childAddedToast],
    ['removeChildTitle', removeChildTitle],
  ] as const;

  for (const [name, fn] of fns) {
    it(`${name} includes the child's name and differs by locale`, () => {
      const en = fn(NAME, 'en');
      expect(en).toContain(NAME);
      for (const locale of TRANSLATED) {
        const other = fn(NAME, locale);
        expect(other, `${name}.${locale}`).toContain(NAME);
        expect(other, `${name}.${locale}`).not.toBe(en);
      }
    });
  }

  it('forgetMemoryLabel quotes the memory back in every language', () => {
    const memory = 'ABA authorized 10 hrs/week';
    for (const locale of ['en', ...TRANSLATED] as FunnelLocale[]) {
      expect(forgetMemoryLabel(memory, locale)).toContain(memory);
    }
  });

  it('textSizeLabel keeps the number and translates the sentence', () => {
    expect(textSizeLabel(125, 'en')).toContain('125');
    for (const locale of TRANSLATED) {
      expect(textSizeLabel(125, locale)).toContain('125');
      expect(textSizeLabel(125, locale)).not.toBe(textSizeLabel(125, 'en'));
    }
  });

  it('bornLabel and gradeLabel keep their value and translate the frame', () => {
    for (const locale of TRANSLATED) {
      expect(bornLabel('2019-04-02', locale)).toContain('2019-04-02');
      expect(bornLabel('2019-04-02', locale)).not.toBe(bornLabel('2019-04-02', 'en'));
      expect(gradeLabel('3rd', locale)).toContain('3rd');
      expect(gradeLabel('3rd', locale)).not.toBe(gradeLabel('3rd', 'en'));
    }
  });

  it('profileUpdatedClosed pluralizes per language and keeps the count', () => {
    for (const n of [0, 1, 2, 5]) {
      for (const locale of ['en', ...TRANSLATED] as FunnelLocale[]) {
        expect(profileUpdatedClosed(n, locale)).toContain(String(n));
      }
      for (const locale of TRANSLATED) {
        expect(profileUpdatedClosed(n, locale)).not.toBe(profileUpdatedClosed(n, 'en'));
      }
    }
    // English and Spanish both inflect on 1; the singular must not read "1 actions".
    expect(profileUpdatedClosed(1, 'en')).toContain('1 action ');
    expect(profileUpdatedClosed(2, 'en')).toContain('2 actions ');
    expect(profileUpdatedClosed(1, 'es')).toContain('acción cerrada');
    expect(profileUpdatedClosed(2, 'es')).toContain('acciones cerradas');
  });

  it('removeChildBody and removeConfirmLabel translate', () => {
    for (const locale of TRANSLATED) {
      expect(removeChildBody(locale)).not.toBe(removeChildBody('en'));
      expect(removeConfirmLabel(locale)).not.toBe(removeConfirmLabel('en'));
    }
  });
});

describe('Google account copy does not over-promise in any language', () => {
  const ACCOUNT = 'parent@example.com';

  it('the calendar-only state never claims sending or reply tracking', () => {
    // The English comment in ProfileScreen says claiming Gmail here "would be
    // a promise the app cannot keep". That has to survive translation: the
    // calendar-only string must read as an INVITATION to add Gmail, so it
    // always names the connect action.
    const CONNECT_HINT: Record<FunnelLocale, RegExp> = {
      en: /Connect Google/i,
      es: /Conectar Google/i,
      vi: /Kết nối Google/i,
    };
    for (const locale of ['en', ...TRANSLATED] as FunnelLocale[]) {
      const s = googleConnectedCalendarOnly(ACCOUNT, locale);
      expect(s, locale).toContain(ACCOUNT);
      expect(s, locale).toMatch(CONNECT_HINT[locale]);
    }
  });

  it('the full state carries the account in every language', () => {
    for (const locale of ['en', ...TRANSLATED] as FunnelLocale[]) {
      expect(googleConnectedFull(ACCOUNT, locale)).toContain(ACCOUNT);
    }
    for (const locale of TRANSLATED) {
      expect(googleConnectedFull(ACCOUNT, locale)).not.toBe(googleConnectedFull(ACCOUNT, 'en'));
    }
  });

  it('the no-email fallback is translated', () => {
    for (const locale of TRANSLATED) {
      expect(yourGoogleAccount(locale)).not.toBe(yourGoogleAccount('en'));
    }
  });
});
