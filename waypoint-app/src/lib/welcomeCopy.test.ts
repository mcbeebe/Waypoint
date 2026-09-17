/**
 * Welcome-screen copy parity (initiative 009, PR 3).
 *
 * Two things here are not generic parity checks and are the reason the file
 * exists:
 *
 * 1. Two error messages QUOTE the "Forgot password?" link back at the parent.
 *    If the quote and the label drift, the error tells them to tap a control
 *    that does not exist under that name — in a language where they cannot
 *    work out the difference.
 * 2. `'Sign-in cancelled'` must never appear here. It is a sentinel compared
 *    against what `@/lib/auth` returns; translating it turns a cancelled
 *    Apple sign-in into an error banner.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  welcomeCopy,
  localizeAuthError,
  badCredentials,
  emailNeededForReset,
  confirmationSent,
  resetSent,
  type WelcomeCopy,
} from './welcomeCopy';
import type { FunnelLocale } from './eligibility';

const TRANSLATED: FunnelLocale[] = ['es', 'vi'];
const ALL: FunnelLocale[] = ['en', 'es', 'vi'];

/**
 * Legitimately identical across languages.
 *  - `termsSuffix` is empty in en and es; only Vietnamese needs it.
 */
const ALLOWED_IDENTICAL: (keyof WelcomeCopy)[] = ['termsSuffix'];

describe('welcomeCopy is fully translated', () => {
  const en = welcomeCopy('en');

  it.each(TRANSLATED)('%s: no value is left in English', (locale) => {
    const other = welcomeCopy(locale);
    const leaks = (Object.keys(en) as (keyof WelcomeCopy)[]).filter(
      (k) => !ALLOWED_IDENTICAL.includes(k) && other[k] === en[k],
    );
    expect(leaks).toEqual([]);
  });

  it.each(TRANSLATED)('%s: every key is present and non-empty', (locale) => {
    const other = welcomeCopy(locale);
    for (const k of Object.keys(en) as (keyof WelcomeCopy)[]) {
      if (k === 'termsSuffix') continue; // empty by design in en/es
      expect(other[k], `${locale}.${String(k)}`).toBeTruthy();
    }
  });
});

describe('the error that quotes the link stays in sync with the link', () => {
  // The trap: someone rewords `forgotPassword` and leaves the error quoting
  // the old label. In English a parent shrugs it off; in Spanish they cannot
  // tell whether they are looking at the right control at all.
  it.each(ALL)('%s: badCredentials quotes the exact forgot-password label', (locale) => {
    const label = welcomeCopy(locale).forgotPassword;
    expect(badCredentials(label, locale)).toContain(`"${label}"`);
  });

  it.each(ALL)('%s: emailNeededForReset quotes the exact label too', (locale) => {
    const label = welcomeCopy(locale).forgotPassword;
    expect(emailNeededForReset(label, locale)).toContain(`"${label}"`);
  });

  it.each(TRANSLATED)('%s: both messages are actually translated', (locale) => {
    const label = welcomeCopy(locale).forgotPassword;
    const enLabel = welcomeCopy('en').forgotPassword;
    expect(badCredentials(label, locale)).not.toBe(badCredentials(enLabel, 'en'));
    expect(emailNeededForReset(label, locale)).not.toBe(emailNeededForReset(enLabel, 'en'));
  });
});

describe('the auth sentinel is not in the copy module', () => {
  it('no string equals the cancelled-sign-in sentinel', () => {
    // `WelcomeScreen` compares `result.error !== 'Sign-in cancelled'`. That
    // value comes from @/lib/auth and is control flow, not display text.
    for (const locale of ALL) {
      const values = Object.values(welcomeCopy(locale));
      expect(values).not.toContain('Sign-in cancelled');
    }
  });
});

describe('the terms footer assembles correctly in every language', () => {
  // Five fields, not three, because Vietnamese puts the possessive after the
  // noun phrase. A prefix+link+"and"+link shape would read wrong there.
  it.each(ALL)('%s: reads as one sentence naming both documents', (locale) => {
    const c = welcomeCopy(locale);
    const sentence = c.termsPrefix + c.termsOfService + c.termsAnd + c.privacyPolicy + c.termsSuffix;
    expect(sentence).toContain(c.termsOfService);
    expect(sentence).toContain(c.privacyPolicy);
    // No DOUBLED space…
    expect(sentence).not.toMatch(/\s{2,}/);
    // …and no MISSING one: every join must have whitespace on one side.
    // The previous version only checked for doubles, so deleting the trailing
    // space in `termsPrefix` rendered "…acepta nuestrosTérminos" and passed.
    const beforeTerms = sentence.charAt(sentence.indexOf(c.termsOfService) - 1);
    expect(beforeTerms, 'space before the Terms link').toBe(' ');
    const afterTerms = sentence.charAt(sentence.indexOf(c.termsOfService) + c.termsOfService.length);
    expect(afterTerms, 'space after the Terms link').toBe(' ');
    const beforePrivacy = sentence.charAt(sentence.indexOf(c.privacyPolicy) - 1);
    expect(beforePrivacy, 'space before the Privacy link').toBe(' ');
    if (c.termsSuffix) {
      const afterPrivacy = sentence.charAt(
        sentence.indexOf(c.privacyPolicy) + c.privacyPolicy.length,
      );
      expect(afterPrivacy, 'space before the trailing possessive').toBe(' ');
    }
    // No stray leading/trailing whitespace on the assembled sentence.
    expect(sentence).toBe(sentence.trim());
  });

  it('Vietnamese actually uses the trailing possessive the split exists for', () => {
    expect(welcomeCopy('vi').termsSuffix.trim()).toBe('của chúng tôi');
    expect(welcomeCopy('en').termsSuffix).toBe('');
    expect(welcomeCopy('es').termsSuffix).toBe('');
  });
});

describe('the free promise survives translation', () => {
  // `valueProp3` commits to letters being free. A translation that dropped
  // that word would be a different promise, not a different language.
  const FREE: Record<FunnelLocale, RegExp> = {
    en: /\bfree\b/i,
    es: /\bgratis\b/i,
    vi: /miễn phí/i,
  };

  it.each(ALL)('%s: still says the letters are free', (locale) => {
    expect(welcomeCopy(locale).valueProp3).toMatch(FREE[locale]);
  });

  it.each(ALL)('%s: still cites California law by name', (locale) => {
    expect(welcomeCopy(locale).valueProp1).toMatch(/California/);
  });

  it.each(ALL)('%s: value props keep their leading emoji', (locale) => {
    const c = welcomeCopy(locale);
    expect(c.valueProp1.startsWith('📍')).toBe(true);
    expect(c.valueProp2.startsWith('📋')).toBe(true);
    expect(c.valueProp3.startsWith('✉️')).toBe(true);
  });
});

describe('the tagline keeps its two beats', () => {
  it.each(ALL)('%s: still breaks into two lines', (locale) => {
    // The line break is the joke's timing — "Your child's unexpected journey."
    // then "Every step, mapped." Collapsing it flattens the promise.
    expect(welcomeCopy(locale).tagline.split('\n')).toHaveLength(2);
  });
});

describe('interpolated messages carry the address', () => {
  const ADDRESS = 'parent@example.com';

  it.each(ALL)('%s: confirmation and reset both name the inbox', (locale) => {
    expect(confirmationSent(ADDRESS, locale)).toContain(ADDRESS);
    expect(resetSent(ADDRESS, locale)).toContain(ADDRESS);
  });

  it.each(TRANSLATED)('%s: both are translated', (locale) => {
    expect(confirmationSent(ADDRESS, locale)).not.toBe(confirmationSent(ADDRESS, 'en'));
    expect(resetSent(ADDRESS, locale)).not.toBe(resetSent(ADDRESS, 'en'));
  });
});

describe('Spanish keeps the corpus register (usted, not tú)', () => {
  const TU_FORMS = /\b(tienes|puedes|tu correo|tu contraseña|inténtalo|escribe|revisa|abre|vuelve)\b/i;

  it('no tú-form verbs', () => {
    const offenders = Object.entries(welcomeCopy('es'))
      .filter(([, v]) => TU_FORMS.test(v))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('the interpolated messages keep usted too', () => {
    const label = welcomeCopy('es').forgotPassword;
    for (const s of [
      badCredentials(label, 'es'),
      emailNeededForReset(label, 'es'),
      confirmationSent('a@b.com', 'es'),
      resetSent('a@b.com', 'es'),
    ]) {
      expect(s, s).not.toMatch(TU_FORMS);
    }
  });
});

describe('every error auth.ts can return reaches the parent translated', () => {
  // THE COUPLING PIN. `localizeAuthError` matches on prose that lives in
  // another module. Reword `auth.ts` and the Spanish silently reverts to
  // English — unless this test reads that file and fails first.
  const AUTH_SRC = readFileSync(new URL('./auth.ts', import.meta.url), 'utf8');
  const literals = [...AUTH_SRC.matchAll(/error: '([^']+)'/g)].map((m) => m[1]);

  it('auth.ts still returns the literals this module was written against', () => {
    // If this fails, someone changed auth.ts's prose — update the patterns in
    // `localizeAuthError` in the same commit.
    expect(literals.length).toBeGreaterThan(0);
    expect(literals).toContain('An account with this email already exists. Try signing in instead.');
    expect(literals).toContain('Network error. Please check your connection.');
    expect(literals).toContain('Sign-in cancelled');
  });

  it.each(TRANSLATED)('%s: no auth literal renders as raw English', (locale) => {
    const c = welcomeCopy(locale);
    for (const raw of literals) {
      // 'Sign-in cancelled' never reaches the banner — the screen filters it
      // before calling the localizer.
      if (raw === 'Sign-in cancelled') continue;
      const shown = localizeAuthError(raw, c, locale);
      expect(shown, `${locale}: "${raw}" fell through`).not.toBe(raw);
    }
  });

  it.each(TRANSLATED)('%s: Supabase messages are mapped too', (locale) => {
    const c = welcomeCopy(locale);
    const SUPABASE = [
      'Invalid login credentials',
      'Email not confirmed',
      'For security purposes, you can only request this after 60 seconds',
    ];
    for (const raw of SUPABASE) {
      expect(localizeAuthError(raw, c, locale), raw).not.toBe(raw);
    }
  });

  it('a bad password quotes the localized forgot-password label', () => {
    for (const locale of TRANSLATED) {
      const c = welcomeCopy(locale);
      expect(localizeAuthError('Invalid login credentials', c, locale)).toContain(
        `"${c.forgotPassword}"`,
      );
    }
  });

  it('anything unrecognized becomes the generic message, never raw English', () => {
    for (const locale of ALL) {
      const c = welcomeCopy(locale);
      expect(localizeAuthError('Some new upstream failure', c, locale)).toBe(c.genericFailure);
      expect(localizeAuthError(undefined, c, locale)).toBe(c.genericFailure);
    }
  });
});
