/**
 * Which language the app opens in (initiative 009, PR 2).
 *
 * WHY THIS EXISTS. Until now `I18nProvider` defaulted to English and read
 * only AsyncStorage — and the ONLY writer of that key is the picker on
 * ProfileScreen. So the Spanish a family needs was unreachable until they had
 * already navigated an English Welcome, an English six-step onboarding, and
 * an English Home to find Ajustes. Translating those screens would not have
 * helped on its own: the locale was still 'en' while a parent read them.
 *
 * This seeds the opening language from the device on first launch, which is
 * how ~19% of Regional Center consumers who are Spanish-primary
 * (`Roadmap/Market-Sizing-CA-Aug2026.md`) will actually meet the app.
 *
 * TWO RULES, both load-bearing:
 *
 * 1. **A stored choice always wins.** If a parent has ever picked a language
 *    in Settings, that is their answer, even when the phone disagrees. A
 *    Spanish speaker who prefers the app in English (common — the agency
 *    paperwork is in English) must not be re-Spanished on every launch.
 * 2. **Detection is never persisted.** Only an explicit pick writes storage.
 *    So a family that changes the phone's language later is followed, rather
 *    than pinned to whatever their phone said the day they installed.
 *
 * Kept pure and separate from the provider so it can be tested without
 * mocking React, AsyncStorage, or the native localization module.
 */
import type { SupportedLocale } from './types';

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Storage key for an explicit in-app choice. Written only by `setLocale`. */
export const LOCALE_STORAGE_KEY = '@waypoint_locale';

/** Narrow any string to a language the app actually speaks. */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === 'en' || value === 'es' || value === 'vi';
}

/**
 * Map one BCP-47 tag to a supported language.
 *
 * Matches on the PRIMARY SUBTAG only, so every regional variant lands
 * correctly: `es-MX`, `es-419` and `es_US` are all Spanish, and `vi-VN` is
 * Vietnamese. Anything the app does not speak — including `pt`, which is a
 * common near-miss for Spanish — falls back to English rather than guessing.
 *
 * Returns null when the tag is unusable, so callers can try the next tag in
 * the device's preference list instead of stopping at English.
 */
export function localeFromTag(tag: string | null | undefined): SupportedLocale | null {
  if (typeof tag !== 'string') return null;
  // Both '-' and '_' appear in the wild; take the primary subtag either way.
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'es') return 'es';
  if (primary === 'vi') return 'vi';
  if (primary === 'en') return 'en';
  return null;
}

/**
 * The language the app should open in.
 *
 * @param stored  The persisted explicit choice, or null/undefined if none.
 * @param deviceTags The device's language preferences, most-preferred first.
 *
 * A stored choice wins outright. Otherwise the first device tag the app
 * speaks wins — walking the whole list matters on Android, where a family
 * may list Spanish second behind a language Waypoint does not support.
 * English is the floor.
 */
export function resolveInitialLocale(
  stored: string | null | undefined,
  deviceTags: readonly (string | null | undefined)[] = [],
): SupportedLocale {
  if (isSupportedLocale(stored)) return stored;
  for (const tag of deviceTags) {
    const hit = localeFromTag(tag);
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
