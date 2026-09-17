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

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedLocale, TranslationStrings } from './types';
import { LOCALES } from './types';
import { deviceLanguageTags } from './deviceLocale';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY as STORAGE_KEY,
  resolveInitialLocale,
} from './resolveLocale';
import en from './en';
import es from './es';
import vi from './vi';

export { LOCALES } from './types';
export type { SupportedLocale, TranslationStrings } from './types';
export {
  resolveInitialLocale,
  localeFromTag,
  isSupportedLocale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
} from './resolveLocale';

// ─── Translation Map ───────────────────────────────────────────────────────

const TRANSLATIONS: Record<SupportedLocale, TranslationStrings> = { en, es, vi };

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
   * Open in the device's language straight away, rather than English-then-
   * correct. Synchronous on purpose: an async seed paints English first,
   * which is the frame this exists to remove.
   *
   * SCOPE, stated honestly: this only decides which language the ALREADY
   * TRANSLATED surfaces render in. `WelcomeScreen` and `OnboardingFlow` carry
   * their own hardcoded English and are unaffected until they are wired —
   * see `Roadmap/initiatives/009-i18n-sweep/`.
   */
  const [locale, setLocaleState] = useState<SupportedLocale>(
    () => initialLocale ?? resolveInitialLocale(null, deviceLanguageTags()),
  );

  /**
   * A parent's explicit pick, once made, outranks the phone forever. Tracked
   * in a ref so the in-flight storage read below cannot undo a choice made
   * while it was still resolving.
   */
  const chosen = useRef(false);

  /**
   * Correct the device seed from storage. Runs the SAME resolver as the seed,
   * so precedence lives in one place (`resolveLocale.ts`) rather than being
   * re-implemented here and drifting from the tests that pin it.
   *
   * KNOWN EDGE: the correction lands after first paint, so a RETURNING parent
   * whose stored choice differs from their phone sees the device language
   * briefly — on native that is an AsyncStorage bridge round-trip during cold
   * start, not merely a render tick. They had no such frame before this
   * change. The trade buys a correct first paint for new installs, which is
   * the case this is for; if it proves ugly on device, the fix is to await
   * storage inside the existing `LoadingScreen` gate in `App.tsx`.
   */
  useEffect(() => {
    if (initialLocale) return; // Explicit prop wins; used by tests and previews.
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        // Don't clobber a pick the parent made while this was in flight, and
        // don't set state on an unmounted provider.
        if (cancelled || chosen.current) return;
        setLocaleState(resolveInitialLocale(stored, deviceLanguageTags()));
      })
      .catch(() => {
        // Unreadable storage: we cannot tell "no choice yet" from "choice we
        // can't read", so the device seed stands. That is right for a fresh
        // install (the usual cause) and wrong for a parent who had stored a
        // language differing from their phone — they get the phone's for this
        // session. Rare, and the alternative strands first-run families in
        // English on exactly the devices this change is meant to serve.
      });
    return () => {
      cancelled = true;
    };
  }, [initialLocale]);

  /**
   * Persist ONLY an explicit pick. Detection is deliberately not written
   * back, so a family that later changes their phone's language is followed
   * rather than pinned to whatever it said on the day they installed.
   */
  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    chosen.current = true;
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
