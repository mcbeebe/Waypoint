/**
 * Opening-language resolution (initiative 009, PR 2).
 *
 * The two rules this pins are the ones a family notices when they break:
 * a stored choice must survive a disagreeing phone, and a phone the app can
 * read must beat the English default. Everything else is tag parsing.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveInitialLocale,
  localeFromTag,
  isSupportedLocale,
  DEFAULT_LOCALE,
} from './resolveLocale';

describe('localeFromTag', () => {
  it('matches on the primary subtag, so every regional variant lands', () => {
    for (const tag of ['es', 'es-MX', 'es-419', 'es_US', 'ES-mx', '  es-ES  ']) {
      expect(localeFromTag(tag), tag).toBe('es');
    }
    for (const tag of ['vi', 'vi-VN', 'vi_VN', 'VI']) {
      expect(localeFromTag(tag), tag).toBe('vi');
    }
    for (const tag of ['en', 'en-US', 'en-GB', 'en_AU']) {
      expect(localeFromTag(tag), tag).toBe('en');
    }
  });

  it('returns null for languages the app does not speak', () => {
    // `pt` is the near-miss that matters: Portuguese is not Spanish, and a
    // prefix match would have made it so.
    for (const tag of ['pt', 'pt-BR', 'fr', 'zh-Hans', 'tl', 'ko', 'esperanto']) {
      expect(localeFromTag(tag), tag).toBeNull();
    }
  });

  it('returns null for junk rather than throwing', () => {
    for (const tag of [null, undefined, '', '   ', 42 as unknown as string, {} as unknown as string]) {
      expect(localeFromTag(tag)).toBeNull();
    }
  });

  it('does not match a language whose name merely starts with a supported code', () => {
    // 'est' (Estonian) must not become 'es'.
    expect(localeFromTag('est')).toBeNull();
    expect(localeFromTag('est-EE')).toBeNull();
    expect(localeFromTag('eng')).toBeNull();
  });
});

describe('isSupportedLocale', () => {
  it('accepts exactly the three the app speaks', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('es')).toBe(true);
    expect(isSupportedLocale('vi')).toBe(true);
  });

  it('rejects everything else, including near-misses and junk', () => {
    for (const v of ['es-MX', 'EN', 'fr', '', null, undefined, 0, {}]) {
      expect(isSupportedLocale(v), String(v)).toBe(false);
    }
  });
});

describe('resolveInitialLocale — a stored choice always wins', () => {
  it('honours the stored language even when the phone disagrees', () => {
    // The case this rule exists for: a Spanish speaker who deliberately runs
    // the app in English because the agency paperwork is in English. Being
    // re-Spanished on every launch would be the app overriding them.
    expect(resolveInitialLocale('en', ['es-MX'])).toBe('en');
    expect(resolveInitialLocale('es', ['en-US'])).toBe('es');
    expect(resolveInitialLocale('vi', ['en-US', 'es-MX'])).toBe('vi');
  });

  it('ignores a stored value that is not a language we speak', () => {
    // Corrupt or legacy storage must not strand a parent on a blank app.
    expect(resolveInitialLocale('fr', ['es-MX'])).toBe('es');
    expect(resolveInitialLocale('', ['vi-VN'])).toBe('vi');
    expect(resolveInitialLocale('es-MX', ['en-US'])).toBe('en');
  });
});

describe('resolveInitialLocale — first launch follows the device', () => {
  it('opens in Spanish for a Spanish phone', () => {
    expect(resolveInitialLocale(null, ['es-MX'])).toBe('es');
    expect(resolveInitialLocale(undefined, ['es-419', 'en-US'])).toBe('es');
  });

  it('opens in Vietnamese for a Vietnamese phone', () => {
    expect(resolveInitialLocale(null, ['vi-VN'])).toBe('vi');
  });

  it('walks the whole preference list, not just the first entry', () => {
    // Android lets a family rank several languages. A parent whose first
    // choice is one Waypoint does not speak should still get their second.
    expect(resolveInitialLocale(null, ['tl-PH', 'es-MX', 'en-US'])).toBe('es');
    expect(resolveInitialLocale(null, ['ko-KR', 'zh-Hans', 'vi-VN'])).toBe('vi');
  });

  it('falls back to English for a language the app does not speak', () => {
    expect(resolveInitialLocale(null, ['fr-FR'])).toBe('en');
    expect(resolveInitialLocale(null, ['pt-BR', 'de-DE'])).toBe('en');
  });

  it('falls back to English when the device tells us nothing', () => {
    expect(resolveInitialLocale(null, [])).toBe(DEFAULT_LOCALE);
    expect(resolveInitialLocale(null)).toBe(DEFAULT_LOCALE);
    expect(resolveInitialLocale(null, [null, undefined, ''])).toBe(DEFAULT_LOCALE);
  });

  it('English is the floor, never a crash', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });
});
