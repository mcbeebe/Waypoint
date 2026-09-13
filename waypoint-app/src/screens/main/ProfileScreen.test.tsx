/**
 * Profile, rendered in Spanish and Vietnamese (initiative 009, PR 1).
 *
 * WHY THIS TEST EXISTS. `profileCopy.test.ts` proves the strings are
 * translated; it cannot prove the screen USES them. Before this change
 * ProfileScreen imported `t` and then rendered 42 hardcoded English strings
 * anyway — a defect every logic test passed straight over.
 *
 * The load-bearing assertion here is the WHOLE-CONTAINER SWEEP: render the
 * real screen under `es`, then fail if any English string from the copy
 * modules survives anywhere in the output. A first version of this file
 * checked six named headings instead, and an adversarial review used exactly
 * that gap to find four more English blocks it could not see — the auto-save
 * toasts, `DiagnosisSelector`'s 21 option labels, and `ContactsCard`'s ~35
 * strings, the last of which the test had itself mocked away. Named-element
 * assertions test what you remembered; the sweep tests what you forgot.
 *
 * `ContactsCard` and `DiagnosisSelector` therefore render for real here. Only
 * their data hooks are stubbed.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  aiConsentAt: null as string | null,
  google: { connected: false, email: null as string | null, gmail: false },
  memories: [] as { id: string; kind: string; content: string }[],
  contacts: [] as { id: string; name: string; role: string | null; organization: string | null; email: string | null; phone: string | null }[],
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    family: { id: 'fam1', ai_consent_at: h.aiConsentAt, parent_first_name: 'Ana' },
    updateFamily: vi.fn(),
    loading: false,
  }),
  useChildren: () => ({
    children: [
      { id: 'c1', first_name: 'Teddy', is_primary: true, date_of_birth: '2019-04-02', school_name: null, grade: null },
      { id: 'c2', first_name: 'Mia', is_primary: false, date_of_birth: null, school_name: 'Glenview', grade: '3rd' },
    ],
    addChild: vi.fn(),
    updateChild: vi.fn(),
    deleteChild: vi.fn(),
  }),
  useDiagnoses: () => ({ diagnoses: [], setDiagnoses: vi.fn() }),
}));
vi.mock('@/hooks/useMemories', () => ({
  useMemories: () => ({ memories: h.memories, forgetMemory: vi.fn(), forgetAll: vi.fn() }),
}));
vi.mock('@/hooks/useContacts', () => ({
  useContacts: () => ({
    contacts: h.contacts,
    addContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
  }),
}));
vi.mock('@/hooks/usePremiumGuard', () => ({ usePremiumGuard: () => ({ guard: () => true }) }));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/lib/googleAuth', () => ({
  connectGmailWeb: vi.fn(),
  disconnectGoogleWeb: vi.fn(),
  isGoogleConnectedWeb: async () => h.google,
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
import { contactsCopy, orgOptions, roleSuggestions } from '@/lib/contactsCopy';
import { diagnosisOptions, diagnosisSelectorCopy } from '@/components/DiagnosisSelector';
import type { FunnelLocale } from '@/lib/eligibility';

function renderIn(locale: FunnelLocale) {
  return render(
    <I18nProvider initialLocale={locale}>
      <ProfileScreen />
    </I18nProvider>,
  );
}

/**
 * Every English string the screen can render, from all three copy modules.
 * Strings that are legitimately identical across languages are excluded —
 * comparing those would fail for the wrong reason.
 */
function englishStrings(locale: FunnelLocale): string[] {
  const en = profileCopy('en');
  const other = profileCopy(locale);
  const out: string[] = [];

  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    if (en[key] !== other[key]) out.push(en[key]);
  }

  const enContacts = contactsCopy('en');
  const otherContacts = contactsCopy(locale);
  for (const key of Object.keys(enContacts) as (keyof typeof enContacts)[]) {
    if (enContacts[key] !== otherContacts[key]) out.push(enContacts[key]);
  }

  const enDx = diagnosisOptions('en');
  const otherDx = diagnosisOptions(locale);
  enDx.forEach((o, i) => {
    if (o.label !== otherDx[i].label) out.push(o.label);
  });

  const enOrg = orgOptions('en');
  const otherOrg = orgOptions(locale);
  enOrg.forEach((o, i) => {
    if (o.label !== otherOrg[i].label) out.push(o.label);
  });

  const enHint = diagnosisSelectorCopy('en');
  const otherHint = diagnosisSelectorCopy(locale);
  if (enHint.hint !== otherHint.hint) out.push(enHint.hint);
  if (enHint.validation !== otherHint.validation) out.push(enHint.validation);

  // Short or punctuation-only strings produce false positives inside longer
  // sentences ("Save" inside "Save Changes"); the sweep uses the rest.
  return out.filter((s) => s.length > 6);
}

describe('no English survives anywhere on the screen', () => {
  it.each(['es', 'vi'] as const)('%s: whole-container sweep', (locale) => {
    const { container } = renderIn(locale);
    const text = container.textContent ?? '';
    const leaked = englishStrings(locale).filter((s) => text.includes(s));
    expect(leaked, `English leaked into ${locale}`).toEqual([]);
  });

  it.each(['es', 'vi'] as const)('%s: sweep also covers the AI-consented state', (locale) => {
    // Memories, the "what Waypoint knows" blurb and `aiOnDetail` only render
    // once the family has consented — a state the first version never reached.
    h.aiConsentAt = '2026-09-01T00:00:00Z';
    h.memories = [{ id: 'm1', kind: 'fact', content: 'ABA authorized 10 hrs/week' }];
    try {
      const { container } = renderIn(locale);
      const text = container.textContent ?? '';
      expect(screen.getByText(profileCopy(locale).whatWaypointKnows)).toBeTruthy();
      const leaked = englishStrings(locale).filter((s) => text.includes(s));
      expect(leaked, `English leaked into ${locale}`).toEqual([]);
    } finally {
      h.aiConsentAt = null;
      h.memories = [];
    }
  });

  it.each(['es', 'vi'] as const)('%s: sweep also covers a populated contacts card', (locale) => {
    h.contacts = [
      { id: 'k1', name: 'Maria Lopez', role: null, organization: 'school', email: null, phone: null },
    ];
    try {
      const { container } = renderIn(locale);
      const text = container.textContent ?? '';
      // The row with no details renders the "tap to add" hint — a string the
      // mocked-away version of this test could never have seen.
      expect(text).toContain(contactsCopy(locale).tapToAdd);
      const leaked = englishStrings(locale).filter((s) => text.includes(s));
      expect(leaked, `English leaked into ${locale}`).toEqual([]);
    } finally {
      h.contacts = [];
    }
  });
});

describe('every section heading is translated', () => {
  // All twelve, not the six that were easy to remember.
  const HEADINGS = [
    'familyInfo', 'keyContacts', 'children', 'diagnosis', 'rcStatus', 'iepStatus',
    'insurance', 'displayAccessibility', 'privacyAi', 'yourData', 'googleAccount',
    'deleteAccount',
  ] as const;

  it('English under en', () => {
    renderIn('en');
    for (const key of HEADINGS) {
      // Google only renders on web; jsdom reports Platform.OS === 'web'.
      expect(screen.getByText(profileCopy('en')[key]), key).toBeTruthy();
    }
  });

  it.each(['es', 'vi'] as const)('%s', (locale) => {
    renderIn(locale);
    for (const key of HEADINGS) {
      expect(screen.getByText(profileCopy(locale)[key]), key).toBeTruthy();
      expect(screen.queryByText(profileCopy('en')[key]), `English leaked: ${key}`).toBeNull();
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

describe('values stay invariant while labels translate', () => {
  it('Medi-Cal stays Medi-Cal in Spanish', () => {
    renderIn('es');
    expect(screen.getByText('Medi-Cal')).toBeTruthy();
  });

  it('the Spanish RC-status grid is not the English one', () => {
    renderIn('es');
    expect(screen.getByText('Solicitado')).toBeTruthy();
    expect(screen.queryByText('Applied')).toBeNull();
  });

  it('diagnosis labels translate while their keys stay English', () => {
    renderIn('es');
    expect(screen.getByText('Parálisis cerebral')).toBeTruthy();
    expect(screen.queryByText('Cerebral palsy')).toBeNull();
    // The key `cp` is what planGenerator reads; it must never be rendered or
    // translated. Verified structurally in profileCopy/diagnosis tests.
    expect(diagnosisOptions('es').map((o) => o.value)).toEqual(
      diagnosisOptions('en').map((o) => o.value),
    );
  });

  it('contact role suggestions are offered in the parent\'s language', () => {
    // These land in `contacts.role` and then inside generated letters.
    expect(roleSuggestions('es')).toContain('Coordinador de Servicios');
    expect(roleSuggestions('es')).not.toContain('Service Coordinator');
  });
});

describe('a child row with no school or grade renders no empty line', () => {
  // Regression: the `c` → `child` rename briefly left `child.school_name ||
  // copy.grade`, where `copy.grade` is the LABEL "Grade" and always truthy —
  // so every child without a school gained a blank text node, and a screen
  // reader hit an empty leaf between the name and "Edit ›".
  it('Teddy has neither, so only Mia gets a detail line', () => {
    const { container } = renderIn('en');
    const detailLines = Array.from(container.querySelectorAll('div'))
      .map((el) => el.textContent ?? '')
      .filter((t) => t.includes('Glenview'));
    expect(detailLines.length).toBeGreaterThan(0);
    // No element anywhere renders the bare label as a child's detail line.
    const stray = Array.from(container.querySelectorAll('div')).filter(
      (el) => (el.textContent ?? '').trim() === '' && el.children.length === 0,
    );
    expect(stray.length, 'empty text nodes in child rows').toBe(0);
  });
});
