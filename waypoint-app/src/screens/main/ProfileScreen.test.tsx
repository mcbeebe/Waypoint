/**
 * Profile, rendered in Spanish (initiative 009, PR 1).
 *
 * WHY THIS TEST EXISTS. `profileCopy.test.ts` proves the strings are
 * translated; it cannot prove the screen USES them. Before this change
 * ProfileScreen imported `t` and then rendered 42 hardcoded English strings
 * anyway — a defect that every logic test passed straight over, because from
 * the logic suite's point of view nothing was wrong.
 *
 * So this renders the real component under `es` and asserts the English is
 * actually gone from the output. The failure mode it guards is specific and
 * has already happened once: a screen that holds the locale and ignores it.
 *
 * It also pins the thing the screen is FOR — the language picker names each
 * language in its own tongue, so it must read the same in every locale.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    family: { id: 'fam1', ai_consent_at: null, parent_first_name: 'Ana' },
    updateFamily: vi.fn(),
    loading: false,
  }),
  useChildren: () => ({
    children: [
      { id: 'c1', first_name: 'Teddy', is_primary: true, date_of_birth: '2019-04-02', school_name: null, grade: null },
    ],
    addChild: vi.fn(),
    updateChild: vi.fn(),
    deleteChild: vi.fn(),
  }),
  useDiagnoses: () => ({ diagnoses: [], setDiagnoses: vi.fn() }),
}));
vi.mock('@/hooks/useMemories', () => ({
  useMemories: () => ({ memories: [], forgetMemory: vi.fn(), forgetAll: vi.fn() }),
}));
vi.mock('@/hooks/usePremiumGuard', () => ({
  usePremiumGuard: () => ({ guard: () => true }),
}));
vi.mock('@/components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('@/components/ContactsCard', () => ({ default: () => null }));
vi.mock('@/lib/googleAuth', () => ({
  connectGmailWeb: vi.fn(),
  disconnectGoogleWeb: vi.fn(),
  isGoogleConnectedWeb: async () => ({ connected: false, email: null, gmail: false }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: {} }) } } }));
vi.mock('@/lib/planGenerator', () => ({ reseedStarterPlan: vi.fn() }));
vi.mock('@/lib/dataExport', () => ({ exportFamilyData: vi.fn() }));
vi.mock('@/lib/actionReconcile', () => ({ closeObsoleteActions: async () => [] }));
vi.mock('@/lib/auth', () => ({ signOut: vi.fn() }));
vi.mock('@/lib/pushTokens', () => ({ unregisterPushToken: vi.fn() }));
vi.mock('@/components/OnboardingTutorial', () => ({ resetTutorial: vi.fn() }));

import ProfileScreen from './ProfileScreen';
import { I18nProvider } from '@/i18n';
import { profileCopy } from '@/lib/profileCopy';

function renderIn(locale: 'en' | 'es' | 'vi') {
  return render(
    <I18nProvider initialLocale={locale}>
      <ProfileScreen />
    </I18nProvider>,
  );
}

/**
 * Headings a parent cannot miss on this screen. If the screen ever stops
 * reading `locale` again, these are the first strings to revert to English.
 */
const HEADINGS = [
  'familyInfo',
  'children',
  'displayAccessibility',
  'privacyAi',
  'yourData',
  'deleteAccount',
] as const;

describe('ProfileScreen renders in the selected language', () => {
  it('shows English headings under en', () => {
    renderIn('en');
    const en = profileCopy('en');
    for (const key of HEADINGS) {
      expect(screen.getByText(en[key]), key).toBeTruthy();
    }
  });

  it('shows Spanish headings under es — and no English twin survives', () => {
    renderIn('es');
    const es = profileCopy('es');
    const en = profileCopy('en');
    for (const key of HEADINGS) {
      expect(screen.getByText(es[key]), key).toBeTruthy();
      // The defect this whole initiative exists to remove.
      expect(screen.queryByText(en[key]), `English leaked: ${key}`).toBeNull();
    }
  });

  it('shows Vietnamese headings under vi', () => {
    renderIn('vi');
    const vi = profileCopy('vi');
    const en = profileCopy('en');
    for (const key of HEADINGS) {
      expect(screen.getByText(vi[key]), key).toBeTruthy();
      expect(screen.queryByText(en[key]), `English leaked: ${key}`).toBeNull();
    }
  });
});

describe('the destructive control is translated, not just the friendly copy', () => {
  // A parent who cannot read the delete button is the one who taps it by
  // accident. This is the highest-stakes string on the screen.
  it.each(['es', 'vi'] as const)('%s: delete-account row is localized', (locale) => {
    renderIn(locale);
    expect(screen.getByText(profileCopy(locale).deleteAccount)).toBeTruthy();
    expect(screen.queryByText(profileCopy('en').deleteAccount)).toBeNull();
  });
});

describe('the language picker is legible whatever language you are in', () => {
  // Each option names its own language, so it never translates — a parent who
  // has accidentally set Vietnamese must still be able to find "English".
  it.each(['en', 'es', 'vi'] as const)('%s: all three languages are offered by name', (locale) => {
    renderIn(locale);
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('Español')).toBeTruthy();
    expect(screen.getByText('Tiếng Việt')).toBeTruthy();
  });
});

describe('intake grids keep their values while translating their labels', () => {
  it('Medi-Cal stays Medi-Cal in Spanish', () => {
    renderIn('es');
    // A translated proper noun would be wrong, and a translated VALUE would
    // write a row the rest of the app cannot read.
    expect(screen.getByText('Medi-Cal')).toBeTruthy();
  });

  it('the Spanish RC-status grid is not the English one', () => {
    renderIn('es');
    expect(screen.getByText('Solicitado')).toBeTruthy();
    expect(screen.queryByText('Applied')).toBeNull();
  });
});
