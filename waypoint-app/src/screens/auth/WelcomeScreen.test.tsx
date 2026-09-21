/**
 * Welcome, rendered in each language (initiative 009, PR 3).
 *
 * This is the first screen a human being sees, and the first place the
 * device-language seed from `src/i18n/resolveLocale.ts` is visible to a
 * parent. So the assertion that matters is end-to-end: set a Spanish phone,
 * render the REAL provider and the REAL screen, and check no English survives.
 *
 * The whole-container sweep is deliberate. An adversarial review of the
 * ProfileScreen PR used exactly the gap left by named-element assertions to
 * find four more English blocks — including a component the test had mocked
 * away. Named assertions test what you remembered; the sweep tests what you
 * forgot.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * The auth result the next call returns. A bare `vi.fn()` resolves to
 * `undefined`, which threw at `result.success` before any error copy could
 * render — so the error paths, the ones this screen's copy exists for, were
 * unreachable from a test.
 */
const h = vi.hoisted(() => ({
  result: { success: true } as { success: boolean; error?: string; needsConfirmation?: boolean },
}));
vi.mock('@/lib/auth', () => ({
  signInWithApple: async () => h.result,
  signInWithGoogle: async () => h.result,
  signInWithEmail: async () => h.result,
  signUpWithEmail: async () => h.result,
  requestPasswordReset: async () => h.result,
}));
// Brandmark is NOT mocked: it renders only Views, and mocking components is
// how the previous review found leaked English hiding behind a stub.

import WelcomeScreen from './WelcomeScreen';
import { I18nProvider } from '@/i18n';
import {
  welcomeCopy,
  badCredentials,
  emailNeededForReset,
  confirmationSent,
} from '@/lib/welcomeCopy';
import { deviceLocales } from '../../../vitest.setup.ui';
import type { FunnelLocale } from '@/lib/eligibility';

beforeEach(() => {
  h.result = { success: true };
});

/** Render the real screen under the real provider, seeded by a real phone. */
function renderOnPhone(tag: string) {
  deviceLocales.tags = [tag];
  return render(
    <I18nProvider>
      <WelcomeScreen />
    </I18nProvider>,
  );
}

/** Every English string that differs from its twin, so the sweep can look for it. */
function englishStrings(locale: FunnelLocale): string[] {
  const en = welcomeCopy('en');
  const other = welcomeCopy(locale);
  return (Object.keys(en) as (keyof typeof en)[])
    .filter((k) => en[k] !== other[k])
    .map((k) => en[k])
    // Short fragments (" and ") produce false hits inside longer sentences.
    .filter((s) => s.length > 8);
}

describe('the first screen opens in the phone\'s language', () => {
  it('a Spanish phone sees Spanish, with no English left anywhere', () => {
    const { container } = renderOnPhone('es-MX');
    const es = welcomeCopy('es');
    expect(screen.getByText(es.signUpWithEmail)).toBeTruthy();
    expect(screen.getByText(es.valueProp3)).toBeTruthy();

    const text = container.textContent ?? '';
    const leaked = englishStrings('es').filter((s) => text.includes(s));
    expect(leaked, 'English leaked into es').toEqual([]);
  });

  it('a Vietnamese phone sees Vietnamese, with no English left anywhere', () => {
    const { container } = renderOnPhone('vi-VN');
    expect(screen.getByText(welcomeCopy('vi').signUpWithEmail)).toBeTruthy();

    const text = container.textContent ?? '';
    const leaked = englishStrings('vi').filter((s) => text.includes(s));
    expect(leaked, 'English leaked into vi').toEqual([]);
  });

  it('an English phone still sees English', () => {
    renderOnPhone('en-US');
    expect(screen.getByText(welcomeCopy('en').signUpWithEmail)).toBeTruthy();
  });

  it('a phone in a language Waypoint does not speak falls back to English', () => {
    renderOnPhone('fr-FR');
    expect(screen.getByText(welcomeCopy('en').signUpWithEmail)).toBeTruthy();
  });
});

describe('the email form is translated too', () => {
  // The form is behind a tap, so a sweep of the initial render never sees it —
  // exactly the "state the test never reaches" gap the last review found.
  it.each(['es', 'vi'] as const)('%s: form, errors and links are localized', (locale) => {
    const tag = locale === 'es' ? 'es-MX' : 'vi-VN';
    const { container } = renderOnPhone(tag);
    const c = welcomeCopy(locale);

    fireEvent.click(screen.getByText(c.signUpWithEmail));

    expect(screen.getByPlaceholderText(c.emailPlaceholder)).toBeTruthy();
    expect(screen.getByPlaceholderText(c.passwordPlaceholder)).toBeTruthy();
    expect(screen.getByText(c.haveAccount)).toBeTruthy();
    expect(screen.getByText(c.backToOptions)).toBeTruthy();

    const text = container.textContent ?? '';
    const leaked = englishStrings(locale).filter((s) => text.includes(s));
    expect(leaked, `English leaked into ${locale} form`).toEqual([]);
  });

  it.each(['es', 'vi'] as const)('%s: a validation error is in the parent\'s language', (locale) => {
    const tag = locale === 'es' ? 'es-MX' : 'vi-VN';
    renderOnPhone(tag);
    const c = welcomeCopy(locale);

    fireEvent.click(screen.getByText(c.signUpWithEmail));
    // "Create Account" is both the form heading and the submit button, so the
    // button has to be picked by role rather than by text.
    fireEvent.click(screen.getByRole('button', { name: c.createAccount }));

    expect(screen.getByText(c.missingCredentials)).toBeTruthy();
    expect(screen.queryByText(welcomeCopy('en').missingCredentials)).toBeNull();
  });
});

describe('the terms footer names both documents in every language', () => {
  it.each(['en', 'es', 'vi'] as const)('%s', (locale) => {
    const tag = locale === 'es' ? 'es-MX' : locale === 'vi' ? 'vi-VN' : 'en-US';
    renderOnPhone(tag);
    const c = welcomeCopy(locale);
    // Both are tappable links to real screens; if the label went missing the
    // parent would have no way to read what they are agreeing to.
    expect(screen.getByText(c.termsOfService)).toBeTruthy();
    expect(screen.getByText(c.privacyPolicy)).toBeTruthy();
  });
});

describe('the states a first-render sweep never reaches', () => {
  /** Open the email form and switch to sign-in mode. */
  function openSignIn(locale: FunnelLocale) {
    const tag = locale === 'es' ? 'es-MX' : locale === 'vi' ? 'vi-VN' : 'en-US';
    renderOnPhone(tag);
    const c = welcomeCopy(locale);
    fireEvent.click(screen.getByText(c.signUpWithEmail));
    fireEvent.click(screen.getByText(c.haveAccount)); // → sign-in mode
    return c;
  }

  it.each(['es', 'vi'] as const)('%s: sign-in mode is localized', (locale) => {
    const c = openSignIn(locale);
    // `signIn`, `noAccount` and the forgot-password link only exist here —
    // nine strings were revertible to English with a green suite before this.
    expect(screen.getByRole('button', { name: c.signIn })).toBeTruthy();
    expect(screen.getByText(c.noAccount)).toBeTruthy();
    expect(screen.getByText(c.forgotPassword)).toBeTruthy();
    const en = welcomeCopy('en');
    expect(screen.queryByText(en.noAccount)).toBeNull();
    expect(screen.queryByText(en.forgotPassword)).toBeNull();
  });

  it.each(['es', 'vi'] as const)(
    '%s: tapping forgot-password with no email shows the localized prompt',
    (locale) => {
      const c = openSignIn(locale);
      fireEvent.click(screen.getByText(c.forgotPassword));
      // Pins the CALL SITE, not just the helper: passing 'en' here instead of
      // the live locale used to leave the whole suite green.
      expect(screen.getByText(emailNeededForReset(c.forgotPassword, locale))).toBeTruthy();
    },
  );

  it.each(['es', 'vi'] as const)('%s: a wrong password is explained in their language', async (locale) => {
    const c = openSignIn(locale);
    h.result = { success: false, error: 'Invalid login credentials' };
    fireEvent.change(screen.getByPlaceholderText(c.emailPlaceholder), {
      target: { value: 'parent@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(c.passwordPlaceholder), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: c.signIn }));

    const expected = badCredentials(c.forgotPassword, locale);
    await waitFor(() => expect(screen.getByText(expected)).toBeTruthy());
  });

  it.each(['es', 'vi'] as const)(
    '%s: the most common sign-up error is not raw English',
    async (locale) => {
      // auth.ts returns this one as its OWN hardcoded English prose, so before
      // `localizeAuthError` a Spanish parent read it verbatim.
      const tag = locale === 'es' ? 'es-MX' : 'vi-VN';
      renderOnPhone(tag);
      const c = welcomeCopy(locale);
      fireEvent.click(screen.getByText(c.signUpWithEmail));
      h.result = {
        success: false,
        error: 'An account with this email already exists. Try signing in instead.',
      };
      fireEvent.change(screen.getByPlaceholderText(c.emailPlaceholder), {
        target: { value: 'parent@example.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(c.passwordPlaceholder), {
        target: { value: 'abcdef' },
      });
      fireEvent.click(screen.getByRole('button', { name: c.createAccount }));

      await waitFor(() => expect(screen.getByText(c.accountExists)).toBeTruthy());
      expect(
        screen.queryByText('An account with this email already exists. Try signing in instead.'),
      ).toBeNull();
    },
  );

  it.each(['es', 'vi'] as const)('%s: the confirmation notice is localized', async (locale) => {
    const tag = locale === 'es' ? 'es-MX' : 'vi-VN';
    renderOnPhone(tag);
    const c = welcomeCopy(locale);
    fireEvent.click(screen.getByText(c.signUpWithEmail));
    h.result = { success: true, needsConfirmation: true };
    fireEvent.change(screen.getByPlaceholderText(c.emailPlaceholder), {
      target: { value: 'parent@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(c.passwordPlaceholder), {
      target: { value: 'abcdef' },
    });
    fireEvent.click(screen.getByRole('button', { name: c.createAccount }));

    await waitFor(() =>
      expect(screen.getByText(confirmationSent('parent@example.com', locale))).toBeTruthy(),
    );
  });
});

/**
 * NOT covered here, and deliberately named rather than silently missing:
 * the Apple button renders only when `Platform.OS === 'ios'` (false under
 * react-native-web) and the Google button only when the client-ID env vars are
 * set. Both titles are pinned by `welcomeCopy.test.ts` parity instead, and
 * their call sites are one-line `title={copy.x}` swaps.
 */
