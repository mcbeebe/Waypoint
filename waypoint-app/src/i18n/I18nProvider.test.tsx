/**
 * The opening language, end to end (initiative 009, PR 2).
 *
 * `resolveLocale.test.ts` pins the decision; this pins that the PROVIDER
 * actually asks it, and in the right order. The bug it guards is the one that
 * shipped: a provider that defaults to English and reads only a storage key
 * no new user has ever written, so the Spanish exists and no family reaches
 * it. A unit test of the resolver would have passed the whole time.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nProvider, useI18n } from './index';
import { LOCALE_STORAGE_KEY } from './resolveLocale';
import { deviceLocales } from '../../vitest.setup.ui';
import { act } from 'react';

/** Renders the current locale and one real translated string. */
function Probe() {
  const { locale, t } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="tab-home">{t.tabs.home}</span>
    </div>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('first launch follows the phone', () => {
  it('a Spanish phone opens the app in Spanish', async () => {
    deviceLocales.tags = ['es-MX'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    // Synchronously, on the FIRST paint — not after an async correction.
    // A parent must not read an English frame before the Spanish arrives.
    expect(screen.getByTestId('locale').textContent).toBe('es');
    expect(screen.getByTestId('tab-home').textContent).toBe('Inicio');
  });

  it('a Vietnamese phone opens the app in Vietnamese', () => {
    deviceLocales.tags = ['vi-VN'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('vi');
  });

  it('a phone in a language Waypoint does not speak opens in English', () => {
    deviceLocales.tags = ['fr-FR'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('tab-home').textContent).toBe('Home');
  });

  it('survives a device that reports nothing', () => {
    // `getLocales()` guarantees at least one entry, but `deviceLanguageTags()`
    // returns [] when the native module is absent — the dev-client case the
    // lazy require exists for. That path is real and lands here.
    deviceLocales.tags = [];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });
});

describe('an explicit choice outranks the phone', () => {
  it('a stored English choice survives a Spanish phone', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    deviceLocales.tags = ['es-MX'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    // First paint is the DEVICE seed — asserted so this test cannot pass with
    // detection removed, which it previously could: English is also the
    // default, so the settled value alone proved nothing.
    expect(screen.getByTestId('locale').textContent).toBe('es');
    // Then storage corrects it, and that is where it must settle.
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('en'));
  });

  it('a stored Spanish choice survives an English phone', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'es');
    deviceLocales.tags = ['en-US'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('es'));
  });

  it('a corrupt stored value does not strand the parent — the phone still wins', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'klingon');
    deviceLocales.tags = ['es-MX'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('es');
    // …and it stays Spanish once storage resolves, rather than flipping blank.
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('es'));
  });
});

describe('an explicit pick mid-flight is not undone by the storage read', () => {
  it('setLocale during the in-flight read survives it', async () => {
    // The provider dispatches getItem on mount. A parent who changes language
    // before it resolves must not have their choice reverted by a read that
    // started before they made it. Without the `chosen` guard the stale read
    // wins and the app silently snaps back.
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    deviceLocales.tags = ['en-US'];

    let setLocale!: (l: 'en' | 'es' | 'vi') => Promise<void>;
    function Grab() {
      setLocale = useI18n().setLocale;
      return null;
    }
    render(
      <I18nProvider>
        <Probe />
        <Grab />
      </I18nProvider>,
    );

    // Fire the pick in the same tick the read is still outstanding.
    await act(async () => {
      await setLocale('vi');
    });

    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('vi'));
    // And it must still be 'vi' after the read has definitely resolved.
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByTestId('locale').textContent).toBe('vi');
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBe('vi');
  });
});

describe('detection is not written back to storage', () => {
  it('a Spanish phone leaves no stored preference', async () => {
    deviceLocales.tags = ['es-MX'];
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('es'));
    // If detection persisted, a family who later switched their phone to
    // English would stay pinned to Spanish forever with no way back except
    // Settings. Only an explicit pick may write this key.
    expect(await AsyncStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });
});

describe('an explicit initialLocale prop still wins outright', () => {
  it('beats both the phone and storage', async () => {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, 'es');
    deviceLocales.tags = ['vi-VN'];
    render(
      <I18nProvider initialLocale="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
    // And storage must not override it a render later.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });
});
