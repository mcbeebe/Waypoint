/**
 * Onboarding, rendered in each language (initiative 009, PR 4).
 *
 * This walks ALL SIX steps and sweeps each one for English, then completes
 * the flow. Five of the six are behind a "Next" tap, so a test that stops
 * early proves almost nothing — and an earlier draft of this file stopped at
 * step 2 while claiming otherwise. With the grids unreached, changing
 * `rcStatusOptions(fl)` to `rcStatusOptions()` left all 14 tests green: three
 * fully English intake grids, shipped past a suite that said they were
 * translated. Reaching the step is the whole assertion.
 *
 * `DiagnosisSelector` renders for real (its 21 option labels are the biggest
 * single block of text in the flow); only the data and network edges are
 * stubbed.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'p@example.com' } } }) },
    from: () => ({
      upsert: () => ({ select: () => ({ single: async () => ({ data: { id: 'f1' }, error: null }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'c1' }, error: null }) }) }),
    }),
  },
}));
vi.mock('@/lib/planGenerator', () => ({ generateStarterPlan: () => [] }));
vi.mock('@/lib/attribution', () => ({ applyFirstTouch: vi.fn() }));
vi.mock('@/lib/dialogs', () => ({ showAlert: vi.fn() }));
vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null }));
// Required for the module to LOAD, not for the branch to run. Under jsdom
// `Platform.OS === 'web'`, so step 2 renders a real <input type="date"> and
// the native picker never executes — but `OnboardingFlow` still imports it at
// module scope, and the real package is Flow-typed, which rolldown cannot
// parse. So: mocked, and its presence is NOT a reason a test may stop at
// step 2 — the web date input is fully drivable, which is how the steps
// below are reached.

import OnboardingFlow from './OnboardingFlow';
import { I18nProvider } from '@/i18n';
import {
  onboardingCopy,
  rcStatusOptions,
  iepStatusOptions,
  insuranceOptions,
} from '@/lib/onboardingCopy';
import { diagnosisOptions, diagnosisSelectorCopy } from '@/components/DiagnosisSelector';
import type { FunnelLocale } from '@/lib/eligibility';

function renderIn(locale: FunnelLocale) {
  return render(
    <I18nProvider initialLocale={locale}>
      <OnboardingFlow onComplete={vi.fn()} />
    </I18nProvider>,
  );
}

/**
 * Every English string the flow can render, minus the ones that legitimately
 * do not change. Short values are dropped because they produce false hits
 * inside longer sentences.
 */
function englishStrings(locale: FunnelLocale): string[] {
  const out: string[] = [];
  const en = onboardingCopy('en');
  const other = onboardingCopy(locale);
  for (const k of Object.keys(en) as (keyof typeof en)[]) {
    if (en[k] !== other[k]) out.push(en[k]);
  }
  for (const [fn] of [[rcStatusOptions], [iepStatusOptions], [insuranceOptions]] as const) {
    const enOpts = fn('en');
    const otherOpts = fn(locale);
    enOpts.forEach((o, i) => {
      if (o.label !== otherOpts[i].label) out.push(o.label);
      if (o.description && o.description !== otherOpts[i].description) out.push(o.description);
    });
  }
  const enDx = diagnosisOptions('en');
  const otherDx = diagnosisOptions(locale);
  enDx.forEach((o, i) => {
    if (o.label !== otherDx[i].label) out.push(o.label);
  });
  const enHint = diagnosisSelectorCopy('en');
  const otherHint = diagnosisSelectorCopy(locale);
  if (enHint.hint !== otherHint.hint) out.push(enHint.hint);
  if (enHint.validation !== otherHint.validation) out.push(enHint.validation);
  return out.filter((s) => s.length > 6);
}

/** Fill step 0 and advance, so the later steps can be reached. */
function completeStepZero(locale: FunnelLocale) {
  const c = onboardingCopy(locale);
  fireEvent.change(screen.getByPlaceholderText(c.parentFirstNameExample), {
    target: { value: 'Ana' },
  });
  fireEvent.change(screen.getByPlaceholderText(c.childFirstNameExample), {
    target: { value: 'Teddy' },
  });
  fireEvent.click(screen.getByRole('button', { name: c.next }));
}

/** Advance one step by tapping Next. */
function next(locale: FunnelLocale) {
  fireEvent.click(screen.getByRole('button', { name: onboardingCopy(locale).next }));
}

/**
 * Walk from step 0 to the step requested, satisfying each gate on the way.
 * Step 2 needs a real date — under jsdom that is the web `<input type="date">`.
 */
function advanceTo(step: number, locale: FunnelLocale, container: HTMLElement) {
  const c = onboardingCopy(locale);
  completeStepZero(locale); // → 1
  if (step === 1) return c;
  fireEvent.click(screen.getByText(diagnosisOptions(locale)[0].label));
  next(locale); // → 2
  if (step === 2) return c;
  const date = container.querySelector('input[type=date]');
  if (!date) throw new Error('step 2 did not render a date input');
  fireEvent.change(date, { target: { value: '2020-03-15' } });
  next(locale); // → 3
  if (step === 3) return c;
  fireEvent.click(screen.getByText(rcStatusOptions(locale)[3].label));
  next(locale); // → 4
  if (step === 4) return c;
  fireEvent.click(screen.getByText(iepStatusOptions(locale)[3].label));
  next(locale); // → 5
  return c;
}

describe('every step of onboarding is in the family\'s language', () => {
  it.each(['es', 'vi'] as const)('%s: step 0 — the first thing after signup', (locale) => {
    const { container } = renderIn(locale);
    const c = onboardingCopy(locale);
    expect(screen.getByText(c.welcomeTitle)).toBeTruthy();
    expect(screen.getByText(c.welcomeSubtitle)).toBeTruthy();

    const leaked = englishStrings(locale).filter((s) => (container.textContent ?? '').includes(s));
    expect(leaked, `English leaked into ${locale} step 0`).toEqual([]);
  });

  it.each(['es', 'vi'] as const)('%s: step 1 — diagnosis, the biggest block of text', (locale) => {
    const { container } = renderIn(locale);
    completeStepZero(locale);

    const c = onboardingCopy(locale);
    expect(screen.getByText(c.diagnosisTitle)).toBeTruthy();
    // The 21 diagnosis labels render here via DiagnosisSelector.
    expect(screen.getByText(diagnosisOptions(locale)[0].label)).toBeTruthy();

    const leaked = englishStrings(locale).filter((s) => (container.textContent ?? '').includes(s));
    expect(leaked, `English leaked into ${locale} step 1`).toEqual([]);
  });

  it.each(['es', 'vi'] as const)('%s: step 2 — birthday, and the age badge', (locale) => {
    const { container } = renderIn(locale);
    const c = advanceTo(2, locale, container);
    expect(screen.getByText(c.birthdayTitle)).toBeTruthy();
    expect(screen.getByText(c.birthdaySubtitle)).toBeTruthy();

    // A date makes the age badge render — "1 año, 2 meses", not "1 años".
    const date = container.querySelector('input[type=date]');
    fireEvent.change(date!, { target: { value: '2020-03-15' } });
    const leaked = englishStrings(locale).filter((s) => (container.textContent ?? '').includes(s));
    expect(leaked, `English leaked into ${locale} step 2`).toEqual([]);
    expect(container.textContent, 'age badge is not English').not.toMatch(/\byears?\b|Age band/);
  });

  it.each(['es', 'vi'] as const)('%s: step 3 — the Regional Center grid', (locale) => {
    const { container } = renderIn(locale);
    const c = advanceTo(3, locale, container);
    expect(screen.getByText(c.rcStatusTitle)).toBeTruthy();
    expect(screen.getByText(c.rcStatusSubtitle)).toBeTruthy();
    // Labels AND descriptions — the sub-labels a parent skims to pick a bucket.
    for (const o of rcStatusOptions(locale)) {
      expect(screen.getByText(o.label), o.value).toBeTruthy();
      if (o.description) expect(screen.getByText(o.description), o.value).toBeTruthy();
    }
    const leaked = englishStrings(locale).filter((s) => (container.textContent ?? '').includes(s));
    expect(leaked, `English leaked into ${locale} step 3`).toEqual([]);
  });

  it.each(['es', 'vi'] as const)('%s: step 4 — the IEP grid', (locale) => {
    const { container } = renderIn(locale);
    const c = advanceTo(4, locale, container);
    expect(screen.getByText(c.iepStatusTitle)).toBeTruthy();
    for (const o of iepStatusOptions(locale)) {
      expect(screen.getByText(o.label), o.value).toBeTruthy();
      if (o.description) expect(screen.getByText(o.description), o.value).toBeTruthy();
    }
    const leaked = englishStrings(locale).filter((s) => (container.textContent ?? '').includes(s));
    expect(leaked, `English leaked into ${locale} step 4`).toEqual([]);
  });

  it.each(['es', 'vi'] as const)('%s: step 5 — insurance, and the final button', (locale) => {
    const { container } = renderIn(locale);
    const c = advanceTo(5, locale, container);
    expect(screen.getByText(c.insuranceTitle)).toBeTruthy();
    for (const o of insuranceOptions(locale)) {
      expect(screen.getByText(o.label), o.value).toBeTruthy();
    }
    // The last step swaps Next for the reward button.
    expect(screen.getByRole('button', { name: c.letsGo })).toBeTruthy();
    expect(screen.queryByRole('button', { name: c.next })).toBeNull();

    const leaked = englishStrings(locale).filter((s) => (container.textContent ?? '').includes(s));
    expect(leaked, `English leaked into ${locale} step 5`).toEqual([]);
  });

  it('a family can actually finish — the write path runs', async () => {
    // `handleComplete` writes families, children, diagnoses and the starter
    // plan. Nothing reached it before, so the elaborate mocks below were never
    // invoked and a crash in the final tap would have shipped green.
    const onComplete = vi.fn();
    const { container } = render(
      <I18nProvider initialLocale="es">
        <OnboardingFlow onComplete={onComplete} />
      </I18nProvider>,
    );
    const c = advanceTo(5, 'es', container);
    fireEvent.click(screen.getByText(insuranceOptions('es')[0].label));
    fireEvent.click(screen.getByRole('button', { name: c.letsGo }));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
  });

  it('English still renders in English', () => {
    renderIn('en');
    expect(screen.getByText(onboardingCopy('en').welcomeTitle)).toBeTruthy();
  });
});

describe('the county picker — the fallback for a parent without a ZIP', () => {
  it.each(['es', 'vi'] as const)('%s: link and sheet are localized', (locale) => {
    renderIn(locale);
    const c = onboardingCopy(locale);

    expect(screen.getByText(c.findByCounty)).toBeTruthy();
    fireEvent.click(screen.getByText(c.findByCounty));
    expect(screen.getByText(c.chooseCounty)).toBeTruthy();
    // County names are California place names and stay as they are.
    expect(screen.getByText('Alameda')).toBeTruthy();
    expect(screen.queryByText(onboardingCopy('en').chooseCounty)).toBeNull();
  });
});

describe('the footer button says the right thing in the right language', () => {
  it.each(['es', 'vi'] as const)('%s: starts as Next, not the final button', (locale) => {
    renderIn(locale);
    const c = onboardingCopy(locale);
    expect(screen.getByRole('button', { name: c.next })).toBeTruthy();
    expect(screen.queryByRole('button', { name: c.letsGo })).toBeNull();
    expect(screen.queryByRole('button', { name: onboardingCopy('en').next })).toBeNull();
  });

  it.each(['es', 'vi'] as const)('%s: Back appears once past step 0', (locale) => {
    renderIn(locale);
    const c = onboardingCopy(locale);
    expect(screen.queryByText(c.back)).toBeNull();
    completeStepZero(locale);
    expect(screen.getByText(c.back)).toBeTruthy();
    expect(screen.queryByText(onboardingCopy('en').back)).toBeNull();
  });
});

describe('a persisted answer is the same value in every language', () => {
  // The silent-corruption case: if a Spanish parent's tap wrote a translated
  // value, ProfileScreen and planGenerator could not read their answer back.
  it('the grids expose identical values across locales', () => {
    for (const fn of [rcStatusOptions, iepStatusOptions, insuranceOptions]) {
      const en = fn('en').map((o) => o.value);
      expect(fn('es').map((o) => o.value)).toEqual(en);
      expect(fn('vi').map((o) => o.value)).toEqual(en);
    }
  });
});
