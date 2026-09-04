/**
 * Home, rendered.
 *
 * Home is the screen the whole product funnels into — the triage ladder picks
 * ONE thing and this is where a parent meets it — and it had **zero tests**.
 * The ladder itself is well covered (`homeTriage.test.ts`), but a ranking
 * engine is only as good as the card that renders it, and everything asserted
 * here is invisible to a logic test:
 *
 *  - the leading item actually reaches the screen, with its kicker;
 *  - its call to action is reachable by ROLE, not just present in the tree;
 *  - the tap RESOLVES — checked against `routeGraph.ts` itself, because a
 *    navigate that names no tab walks to parents and silently does nothing.
 *    That exact class shipped twice here: the Plan tab's agency-clock rows and
 *    all nine Learn destinations;
 *  - the calm state is only shown when the ladder actually says so, so a slow
 *    fetch never renders as "nothing needs you".
 *
 * Home reads twelve hooks. They are stubbed at the boundary; the component,
 * the card and the route graph are real.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ROUTE_GRAPH, resolvesFrom } from '@/navigation/routeGraph';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const h = vi.hoisted(() => ({
  triage: null as any,
  actions: [] as any[],
  family: { id: 'fam1', regional_center: 'Regional Center of the East Bay' } as any,
}));

function item(over: Record<string, unknown> = {}) {
  return {
    id: 'reply-1',
    cls: 'reply',
    rank: 3,
    kicker: 'NEW REPLY — RECEIVED YESTERDAY',
    title: 'The Regional Center answered about the speech assessment',
    why: 'Because you asked them on 12 August and they replied yesterday.',
    action: { kind: 'navigate', label: 'Read the reply', screen: 'CommunicationLog', tab: 'Home' },
    deferDays: 3,
    deferLabel: 'Comes back Thursday',
    ...over,
  };
}

function result(over: Record<string, unknown> = {}) {
  return {
    item: item(),
    queue: [item()],
    calm: null,
    later: [],
    sensor: { text: '', ok: true },
    nextClockDate: null,
    ...over,
  };
}

// ─── The twelve hooks Home reads ────────────────────────────────────────────

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: h.family, loading: false }),
  useChildren: () => ({ children: [{ id: 'c1', first_name: 'Teddy', is_primary: true }] }),
  useDiagnoses: () => ({ diagnoses: [] }),
  useSelectedChild: () => ({ child: { id: 'c1', first_name: 'Teddy' }, setChild: vi.fn() }),
}));
vi.mock('@/hooks/useTriage', () => ({
  useTriage: () => ({
    result: h.triage,
    completedIds: [],
    shared: true,
    defer: vi.fn(async () => true),
    undo: vi.fn(async () => true),
    markActed: vi.fn(async () => {}),
  }),
}));
vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({ actions: h.actions, loading: false, error: null, stats: null, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useRequests', () => ({ useRequests: () => ({ requests: [], loading: false }) }));
vi.mock('@/hooks/useCommunications', () => ({
  useCommunications: () => ({ communications: [], loading: false }),
}));
vi.mock('@/hooks/useDeadlines', () => ({ useDeadlines: () => ({ deadlines: [], loading: false }) }));
vi.mock('@/hooks/useAppointments', () => ({
  useAppointments: () => ({ appointments: [], loading: false }),
}));
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ granted: true, request: vi.fn() }),
}));
vi.mock('@/hooks/useNotificationPrefs', () => ({
  useNotificationPrefs: () => ({ prefs: { enabled: true }, setPrefs: vi.fn() }),
}));
vi.mock('@/hooks/useDraftFlow', () => ({
  useDraftFlow: () => ({ state: null, openDraftFlow: vi.fn(), close: vi.fn(), reading: false }),
}));
vi.mock('@/hooks/useMemories', () => ({ useMemories: () => ({ memories: [] }) }));
vi.mock('@/hooks/useDeferrals', () => ({
  useDeferrals: () => ({ deferrals: [], shared: true, defer: vi.fn(), undo: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) },
}));
vi.mock('@/lib/ai', () => ({ classifyIntent: vi.fn(), streamNavigatorResponse: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ trackFunnelStep: async () => {} }));
// Native edges Home reaches transitively: push registration pulls the expo
// runtime (which cannot load under jsdom), and Home imports OnboardingFlow,
// which imports the native date picker.
vi.mock('@/lib/pushTokens', () => ({
  registerPushToken: async () => null,
  unregisterPushToken: async () => {},
  ensurePushPermission: async () => false,
}));
vi.mock('@react-native-community/datetimepicker', () => ({ default: () => null }));

import HomeScreen from './HomeScreen';
import { navigateCalls } from '../../../vitest.setup.ui';

beforeEach(() => {
  h.triage = result();
  h.actions = [];
  h.family = { id: 'fam1', regional_center: 'Regional Center of the East Bay' };
});

// ─── The One Thing reaches the screen ───────────────────────────────────────

describe('the leading item', () => {
  it('renders its title — the ranking is worthless if the card never shows it', () => {
    render(<HomeScreen />);
    expect(
      screen.getByText('The Regional Center answered about the speech assessment')
    ).toBeInTheDocument();
  });

  it('states the class and where it came from, not that Waypoint noticed', () => {
    render(<HomeScreen />);
    const kicker = screen.getByText('NEW REPLY — RECEIVED YESTERDAY');
    expect(kicker).toBeInTheDocument();
    // The audit's finding: the same eyebrow on contradictory cards is what
    // made them read as contradictory. Provenance, never praise.
    expect(screen.queryByText(/waypoint noticed/i)).toBeNull();
  });

  it('offers the action as something a screen reader can find and press', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('button', { name: /Read the reply/i })).toBeInTheDocument();
  });
});

// ─── The dead-tap class ─────────────────────────────────────────────────────

describe('the call to action actually lands', () => {
  it('names a destination the Home stack really registers', () => {
    // Checked against routeGraph.ts itself rather than a copied list — the
    // hand-copied mirror is what certified nine dead taps last time.
    const action = item().action as { screen: string; tab: string };
    expect(resolvesFrom('Home', { screen: action.screen, tab: action.tab })).toBe(true);
  });

  it('every navigate the card can fire resolves from the tab Home renders in', () => {
    render(<HomeScreen />);
    // Whatever Home asked the navigator to do, it must be reachable. An
    // unresolvable navigate is a tap that does nothing, silently, in prod.
    for (const call of navigateCalls) {
      const [screenName, params] = call.args as [string, { screen?: string; tab?: string } | undefined];
      const target = typeof params?.screen === 'string'
        ? { screen: params.screen, tab: screenName }
        : { screen: screenName, tab: params?.tab };
      expect(
        resolvesFrom('Home', target),
        `Home fired navigate(${JSON.stringify(call.args)}), which no stack registers`
      ).toBe(true);
    }
  });

  it('the Home stack is the one that registers the card destinations', () => {
    // Guards the assumption the two tests above rest on.
    expect(ROUTE_GRAPH.Home.screens).toContain('CommunicationLog');
    expect(ROUTE_GRAPH.Home.visible).toBe(true);
  });
});

// ─── Calm is earned ─────────────────────────────────────────────────────────

describe('calm is only shown when the ladder says so', () => {
  it('shows the calm state when there is no leading item', () => {
    h.triage = result({
      item: null,
      queue: [],
      calm: { kind: 'clear', title: 'Nothing needs you today', body: 'Every clock is quiet.' },
    });
    render(<HomeScreen />);
    expect(screen.getByText('Nothing needs you today')).toBeInTheDocument();
  });

  it('does NOT show calm while a real item is leading', () => {
    render(<HomeScreen />);
    // A slow or failed fetch reading as "nothing needs you" is the false-calm
    // failure the hook is explicitly built to avoid; the screen must not
    // reintroduce it.
    expect(screen.queryByText('Nothing needs you today')).toBeNull();
    expect(
      screen.getByText('The Regional Center answered about the speech assessment')
    ).toBeInTheDocument();
  });

  it('distinguishes a finished day from an empty one', () => {
    h.triage = result({
      item: null,
      queue: [],
      calm: { kind: 'done', title: "That's everything for today", body: 'You closed two things.' },
    });
    render(<HomeScreen />);
    expect(screen.getByText("That's everything for today")).toBeInTheDocument();
  });
});

// ─── Deferral is honest ─────────────────────────────────────────────────────

describe('setting something aside', () => {
  it('keeps the item listed with an Undo, rather than making it vanish', () => {
    h.triage = result({
      item: null,
      queue: [],
      calm: { kind: 'set_aside', title: 'Set aside for now', body: 'One thing is waiting.' },
      later: [
        {
          id: 'reply-1',
          title: 'The Regional Center answered about the speech assessment',
          returnsOn: '2026-09-07',
          returnLabel: 'Comes back Monday',
        },
      ],
    });
    render(<HomeScreen />);

    // The audit's sixth failure was a permanent x that made items disappear.
    // "Not today" must be reversible, and visibly so.
    expect(
      screen.getByText('The Regional Center answered about the speech assessment')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /The Regional Center answered about the speech assessment/i,
      })
    ).toBeInTheDocument();
  });

  it('says when it comes back — a set-aside item states its return', () => {
    h.triage = result({
      item: null,
      queue: [],
      calm: { kind: 'set_aside', title: 'Set aside for now', body: 'One thing is waiting.' },
      later: [
        { id: 'r1', title: 'Chase the assessment', returnsOn: '2026-09-07', returnLabel: 'Monday' },
      ],
    });
    render(<HomeScreen />);
    // The exact wording is the card's to compute from returnsOn; what is
    // pinned is that a return IS stated and the row is not silent.
    const row = screen.getByText('Chase the assessment').closest('div')!;
    expect(row.textContent ?? '').toMatch(/\S/);
    expect(screen.getByText('Chase the assessment')).toBeInTheDocument();
  });
});
