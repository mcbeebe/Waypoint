/**
 * The Journey page, rendered — after This Stage was merged in (Aug 31 2026).
 *
 * JourneyScreen reads live child/family data, so it isn't in the default ui
 * suite; here the hooks are mocked so the merged page actually renders. It
 * proves the old "This Stage" detail now lives inline (Recommended next steps,
 * Learn more, the ＋), that the stage ask bar seeds the Navigator, that a step
 * already on the plan shows "✓ On plan" plus the "See your Action Plan" card,
 * and that the ＋ fires createAction — the gaps a contract-only test can't see,
 * and the proof there's no dead tap-through to the retired screen.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// A primary child aged into the "School Years" stage, with an active IEP + IPP.
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({
    children: [
      {
        id: 'c1',
        first_name: 'Teddy',
        is_primary: true,
        date_of_birth: '2018-01-01',
        rc_status: 'active',
        iep_status: 'active',
      },
    ],
  }),
  useDiagnoses: () => ({ diagnoses: [] }), // → the default journey
}));

vi.mock('@/hooks/useRequests', () => ({ useRequests: () => ({ requests: [] }) }));

// Parametrizable plan state + a spyable createAction.
const h = vi.hoisted(() => ({
  actions: [] as any[],
  createAction: vi.fn(async (_input: Record<string, unknown>) => ({ id: 'a1' })),
}));
vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({ createAction: h.createAction, actions: h.actions }),
}));

import JourneyScreen from './JourneyScreen';
import { navigateCalls } from '../../../vitest.setup.ui';

// The default journey's "School Years" step titles (entityToAction shape).
const SCHOOL_DISTRICT_TITLE = 'School District: Evaluation → IEP or 504 Plan';

beforeEach(() => {
  h.actions = [];
  h.createAction.mockClear();
});

describe('the merged Journey page renders This Stage inline', () => {
  it('opens the current stage with its steps, the ask bar, and Learn more inline', () => {
    render(<JourneyScreen />);
    // The current stage is expanded by default, with the absorbed detail.
    expect(screen.getByText(/Recommended next steps/i)).toBeTruthy();
    expect(screen.getByText(/Ongoing services if eligible/)).toBeTruthy();
    // Inline expandability — no tap-through to a separate screen.
    expect(screen.getAllByText(/Learn more/i).length).toBeGreaterThanOrEqual(1);
    // The stage-scoped ask bar is present, below the stage header.
    expect(screen.getByPlaceholderText(/Ask about School Years/)).toBeTruthy();
  });

  it('the ask bar seeds the Navigator with a question about this stage', () => {
    render(<JourneyScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Ask Waypoint your question/i }));
    expect(navigateCalls).toHaveLength(1);
    const [tab, opts] = navigateCalls[0].args as [string, { screen: string; params: { ask: string } }];
    expect(tab).toBe('Navigator');
    expect(opts.screen).toBe('NavigatorMain');
    expect(opts.params.ask).toContain('School Years');
  });

  it('the ＋ adds a step to the plan (fires createAction as a system add)', () => {
    render(<JourneyScreen />);
    fireEvent.click(
      screen.getByRole('button', { name: /Add "Ongoing services if eligible" to my plan/i })
    );
    expect(h.createAction).toHaveBeenCalledTimes(1);
    expect(h.createAction.mock.calls[0][0]).toMatchObject({ source: 'system', child_id: 'c1' });
  });
});

describe('a step already on the plan reconciles from the real actions list', () => {
  it('shows "✓ On plan" (not a ＋) and the "See your Action Plan" card', () => {
    h.actions = [
      {
        id: 'x',
        title: SCHOOL_DISTRICT_TITLE,
        status: 'not_started',
        source: 'system',
        child_id: 'c1',
      },
    ];
    render(<JourneyScreen />);
    expect(screen.getByText(/On plan/)).toBeTruthy();
    expect(screen.getByText('See your Action Plan')).toBeTruthy();
    // The already-added step no longer offers a ＋.
    expect(
      screen.queryByRole('button', { name: /Add "Evaluation → IEP or 504 Plan" to my plan/i })
    ).toBeNull();
  });
});
