/**
 * The process map's live action rows, rendered — specifically the one thing
 * about them that is easy to get wrong and impossible to see: where the row
 * sends the parent, and how they get back.
 *
 * An adversary pass (Oct 15 2026) caught this call site being excluded from
 * the action round trip on a claim that its `goBack()` "already lands on the
 * Home tab". It does not: this caller passes `initial: false`, so the Tracker
 * stack can pop, and Back landed on that hidden tab's own action list with
 * nothing lit on the bar.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({ actions: [] as any[] }));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', rc_status: 'applied' } }),
  useChildren: () => ({ children: [{ id: 'c1', first_name: 'Teddy' }], updateChild: vi.fn() }),
  useDiagnoses: () => ({ diagnoses: [] }),
}));
vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({
    actions: h.actions,
    loading: false,
    error: null,
    stats: null,
    updateStatus: vi.fn(),
    updateAction: vi.fn(),
    createAction: vi.fn(),
    refetch: vi.fn(),
  }),
}));

import ProcessMapScreen from './ProcessMapScreen';
import { navigateCalls } from '../../../vitest.setup.ui';
import { resolvesFrom, ROUTE_GRAPH } from '@/navigation/routeGraph';
import { actionReturnNavigation } from '@/lib/actionReturn';

/** A title in the stable-key catalog, so the map shows it live. */
const MAPPED_TITLE = 'Call Regional Center to start your referral';

beforeEach(() => {
  h.actions = [
    {
      id: 'a1',
      family_id: 'fam1',
      title: MAPPED_TITLE,
      description: null,
      category: 'regional_center',
      priority: 'high',
      status: 'not_started',
      steps: null,
      script: null,
      due_date: null,
      depends_on: null,
      created_at: new Date().toISOString(),
    },
  ];
});

describe('tapping one of the map\'s live action rows', () => {
  it('names the tab, and names the way back to the map', () => {
    render(<ProcessMapScreen />);
    fireEvent.click(screen.getByText(new RegExp(MAPPED_TITLE)));

    const [tab, options] = navigateCalls[0].args as [
      string,
      { screen: string; params: { actionId: string; returnTo?: unknown } },
    ];
    // ActionDetail is a sibling stack's screen: the tab must be named or the
    // tap does nothing at all.
    expect(resolvesFrom('Home', { screen: options.screen, tab })).toBe(true);
    expect(options.params.actionId).toBe('a1');

    const back = actionReturnNavigation(options.params.returnTo);
    expect(back, 'the row offers no way back').not.toBeNull();
    expect(back!.tab).toBe('Home');
    // The MAP, not the Home landing screen: the parent was reading a stage.
    expect(back!.options.screen).toBe('ProcessMap');
    expect(ROUTE_GRAPH.Home.screens).toContain(back!.options.screen);
    // And pushed, so HomeMain stays beneath it where the stack expects it.
    expect(back!.options.initial).toBe(false);
  });
});
