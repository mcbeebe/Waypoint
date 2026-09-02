/**
 * The shared Action Plan tracker, rendered.
 *
 * What this pins (owner request, Sep 2 2026): "the newly created items should
 * be identified and flagged in the list (need a created date)". Merging the
 * Plan tab's Action Plan segment into this one component (PR #180) dropped the
 * "Added <date>" line the Plan-only row used to render, and the focus view —
 * next 3 doable steps, rest collapsed — can hide a step a parent saved
 * seconds ago behind "Show everything". Both are behaviours a logic test
 * cannot see, so they are asserted against the real component here.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', regional_center: null } }),
  useChildren: () => ({ children: [{ id: 'c1', first_name: 'Teddy', is_primary: true }] }),
  useDiagnoses: () => ({ diagnoses: [] }),
}));

const h = vi.hoisted(() => ({ actions: [] as any[] }));
vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({
    actions: h.actions,
    loading: false,
    error: null,
    stats: null,
    updateStatus: vi.fn(),
    createAction: vi.fn(),
    refetch: vi.fn(),
  }),
}));

import ActionsScreen from './ActionsScreen';

const hoursAgo = (n: number) => new Date(Date.now() - n * 3600_000).toISOString();

function action(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    family_id: 'fam1',
    title: 'Ask the Regional Center for a speech assessment',
    description: null,
    category: 'regional_center',
    priority: 'medium',
    status: 'not_started',
    steps: null,
    script: null,
    due_date: null,
    depends_on: null,
    google_event_id: null,
    local_id: null,
    synced_at: null,
    deadline_warning_days: 7,
    follow_up_key: null,
    created_at: hoursAgo(2),
    ...over,
  };
}

beforeEach(() => { h.actions = []; });

describe('a step that just landed in the plan', () => {
  it('is flagged New and dated', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('Added today')).toBeTruthy();
  });

  it('drops the New flag once it is more than a day old, but keeps the date', () => {
    h.actions = [action({ created_at: hoursAgo(72) })];
    render(<ActionsScreen />);
    expect(screen.queryByText('New')).toBeNull();
    expect(screen.getByText(/^Added /)).toBeTruthy();
  });

  it('is not flagged New once it is done — the flag is about what to look at next', () => {
    h.actions = [action({ status: 'completed' })];
    render(<ActionsScreen />);
    expect(screen.queryByText('New')).toBeNull();
  });

  it('shows no added line at all rather than "Invalid Date"', () => {
    h.actions = [action({ created_at: 'not-a-timestamp' })];
    render(<ActionsScreen />);
    expect(screen.queryByText(/Added/)).toBeNull();
  });
});

describe('the focus view and brand-new items', () => {
  /** Four low-priority items ahead of it would push a new item out of the top 3. */
  const filler = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      action({
        id: `old${i}`,
        title: `Older step ${i}`,
        priority: 'urgent',
        created_at: hoursAgo(200 + i),
      })
    );

  it('shows a just-saved step even when the next-3 view would collapse it', () => {
    h.actions = [
      ...filler(4),
      action({ id: 'fresh', title: 'Just saved from an answer', priority: 'low', created_at: hoursAgo(0.05) }),
    ];
    render(<ActionsScreen />);
    // Focus mode is on (filter "All", not expanded) — without the carve-out
    // this row would sit behind "Show everything".
    expect(screen.getByText('Just saved from an answer')).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('caps the carve-out, so onboarding does not render the whole wall', () => {
    // generateStarterPlan emits SEVEN actions inserted in one batch, so
    // without a cap a brand-new account spent its first 24 hours looking at
    // the entire plan in the view that exists to prevent exactly that.
    h.actions = Array.from({ length: 7 }, (_, i) =>
      action({ id: `s${i}`, title: `Starter step ${i}`, created_at: hoursAgo(0.05) })
    );
    render(<ActionsScreen />);
    const shown = Array.from({ length: 7 }, (_, i) =>
      screen.queryByText(`Starter step ${i}`)
    ).filter(Boolean);
    expect(shown.length).toBeLessThanOrEqual(5); // next 3 + at most 2 fresh
    expect(screen.getByText(/Show everything \(\d+ more\)/)).toBeTruthy();
  });

  it('never offers "Show everything (0 more)"', () => {
    // A live button that does nothing: the toggle keyed on list length while
    // its label counted what was hidden, which the carve-out could zero out.
    h.actions = Array.from({ length: 4 }, (_, i) =>
      action({ id: `s${i}`, title: `Step ${i}`, created_at: hoursAgo(0.05) })
    );
    render(<ActionsScreen />);
    expect(screen.queryByText(/\(0 more\)/)).toBeNull();
  });

  it('does not surface a brand-new step the parent cannot act on yet', () => {
    // The focus view has never shown a locked step; the carve-out must not
    // start, or "your next steps" includes one that is not yet a step.
    h.actions = [
      ...filler(4),
      action({ id: 'gate', title: 'Gate', status: 'not_started', created_at: hoursAgo(300) }),
      action({
        id: 'fresh',
        title: 'Blocked but brand new',
        priority: 'low',
        depends_on: 'gate',
        created_at: hoursAgo(0.05),
      }),
    ];
    render(<ActionsScreen />);
    expect(screen.queryByText('Blocked but brand new')).toBeNull();
  });

  it('still collapses the old ones, so the focus view stays a focus view', () => {
    h.actions = [
      ...filler(6),
      action({ id: 'fresh', title: 'Just saved from an answer', priority: 'low', created_at: hoursAgo(0.05) }),
    ];
    render(<ActionsScreen />);
    expect(screen.getByText('Just saved from an answer')).toBeTruthy();
    expect(screen.queryByText('Older step 5')).toBeNull();
    expect(screen.getByText(/Show everything/)).toBeTruthy();
  });
});
