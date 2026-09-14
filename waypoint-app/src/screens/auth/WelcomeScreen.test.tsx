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
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/auth', () => ({
  signInWithApple: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
}));
vi.mock('@/components/Brandmark', () => ({ Brandmark: () => null }));

import WelcomeScreen from './WelcomeScreen';
import { I18nProvider } from '@/i18n';
import { welcomeCopy } from '@/lib/welcomeCopy';
import { deviceLocales } from '../../../vitest.setup.ui';
import type { FunnelLocale } from '@/lib/eligibility';

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
