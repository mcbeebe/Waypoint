/**
 * i18n system — React context + hook for translations
 *
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   <Text>{t.home.goodMorning}</Text>
 *   <Text>{t.tabs.askAi}</Text>
 *
 * Wrapping:
 *   <I18nProvider>
 *     <App />
 *   </I18nProvider>
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import type { SupportedLocale, TranslationStrings } from './types';
import { LOCALES } from './types';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY as STORAGE_KEY,
  isSupportedLocale,
  resolveInitialLocale,
} from './resolveLocale';
import en from './en';
import es from './es';
import vi from './vi';

export { LOCALES } from './types';
export type { SupportedLocale, TranslationStrings } from './types';
export { resolveInitialLocale, localeFromTag } from './resolveLocale';

// ─── Translation Map ───────────────────────────────────────────────────────

const TRANSLATIONS: Record<SupportedLocale, TranslationStrings> = { en, es, vi };

/**
 * The device's language preferences, most-preferred first.
 *
 * Wrapped because this is the one native call in the i18n path: if the module
 * is unavailable or throws on some platform, a family must still get an app,
 * in English, rather than a crash on the very first screen.
 */
function deviceLanguageTags(): string[] {
  try {
    return Localization.getLocales()
      .map((l) => l.languageTag)
      .filter((t): t is string => typeof t === 'string');
  } catch {
    return [];
  }
}

// ─── Context ───────────────────────────────────────────────────────────────

interface I18nContextValue {
  /** Current locale code */
  locale: SupportedLocale;
  /** Translation strings for current locale */
  t: TranslationStrings;
  /** Switch to a different locale (persisted to AsyncStorage) */
  setLocale: (locale: SupportedLocale) => Promise<void>;
  /** All available locales */
  locales: typeof LOCALES;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: en,
  setLocale: async () => {},
  locales: LOCALES,
});

// ─── Provider ──────────────────────────────────────────────────────────────

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  /**
   * Open in the device's language straight away, so a Spanish-speaking parent
   * meets Welcome and onboarding in Spanish rather than after finding
   * Ajustes. Synchronous on purpose: an async seed would paint English first,
   * which is the exact frame this change exists to remove.
   */
  const [locale, setLocaleState] = useState<SupportedLocale>(
    () => initialLocale ?? resolveInitialLocale(null, deviceLanguageTags()),
  );

  /**
   * Then let an explicit choice override the device. Storage is the authority
   * — see `resolveLocale.ts` — so this corrects the device seed when a parent
   * has previously picked a language that differs from their phone.
   *
   * KNOWN EDGE: that correction lands one render after first paint, so a
   * returning parent whose stored choice differs from their phone's language
   * can see a single frame of the device language. Only reachable when the
   * two disagree, never on first launch (the case this change is for), and
   * preferable to blocking first paint on a storage read.
   */
  useEffect(() => {
    if (initialLocale) return; // Explicit prop wins; used by tests and previews.
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isSupportedLocale(stored)) setLocaleState(stored);
      })
      .catch(() => {
        // Unreadable storage is not a reason to fail: the device seed stands.
      });
  }, [initialLocale]);

  /**
   * Persist ONLY an explicit pick. Detection is deliberately not written
   * back, so a family that later changes their phone's language is followed
   * rather than pinned to whatever it said on the day they installed.
   */
  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    await AsyncStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const value: I18nContextValue = {
    locale,
    t: TRANSLATIONS[locale],
    setLocale,
    locales: LOCALES,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/** Access translations and locale controls */
export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/**
 * Simple template interpolation for strings with {{placeholders}}.
 * Usage: interpolate(t.home.deadlineCount, { count: 3, plural: 's' })
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
  );
}
