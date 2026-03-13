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
import type { SupportedLocale, TranslationStrings } from './types';
import { LOCALES } from './types';
import en from './en';
import es from './es';
import vi from './vi';

export { LOCALES } from './types';
export type { SupportedLocale, TranslationStrings } from './types';

// ─── Translation Map ───────────────────────────────────────────────────────

const TRANSLATIONS: Record<SupportedLocale, TranslationStrings> = { en, es, vi };

const STORAGE_KEY = '@waypoint_locale';
const DEFAULT_LOCALE: SupportedLocale = 'en';

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
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale ?? DEFAULT_LOCALE);

  // Load persisted locale on mount
  useEffect(() => {
    if (initialLocale) return; // Skip if explicitly set
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && (stored === 'en' || stored === 'es' || stored === 'vi')) {
        setLocaleState(stored as SupportedLocale);
      }
    });
  }, [initialLocale]);

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
