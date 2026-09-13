/**
 * The one place the app touches the device's language (initiative 009, PR 2).
 *
 * WHY IT IS ITS OWN MODULE, AND WHY THE REQUIRE IS LAZY.
 *
 * `expo-localization`'s native entry calls `requireNativeModule('ExpoLocalization')`
 * at MODULE SCOPE. A static `import` therefore throws while the importing file
 * is being *evaluated* on any binary that lacks the native module — a
 * dev-client or internal build from `eas.json` made before this dependency
 * existed, or a stale install if `expo-updates` is ever added (`app.json` pins
 * a literal `runtimeVersion`, so it would not be gated by a fingerprint).
 *
 * `App.tsx` imports the i18n module at top level, OUTSIDE its `ErrorBoundary`.
 * So a module-scope throw there is a white screen at launch, not a graceful
 * fallback to English — and a try/catch around only the CALL cannot catch it,
 * because the import has already failed by then.
 *
 * Requiring inside the function keeps the failure catchable. Keeping it in its
 * own module means tests can substitute a device without mocking the native
 * package at all — see `vitest.setup.ui.tsx`.
 *
 * On web this resolves to the `navigator.languages` implementation, which
 * touches no native module and carries its own fallback.
 */

/**
 * The device's language preferences, most-preferred first.
 *
 * Order is real, not incidental: iOS returns `Locale.preferredLanguages` and
 * Android `LocaleListCompat.getDefault()`, both ranked by the user. Callers
 * may walk the list and take the first language the app speaks.
 *
 * Returns `[]` rather than throwing when the platform cannot answer, so a
 * family gets an English app instead of no app.
 */
export function deviceLanguageTags(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization') as typeof import('expo-localization');
    return Localization.getLocales().map((l) => l.languageTag);
  } catch {
    return [];
  }
}
