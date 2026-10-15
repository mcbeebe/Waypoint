/**
 * Plan → Action Plan segment routing (owner request, Aug 31 2026).
 *
 * PlanScreen is too data-heavy to render in the ui suite, so — like
 * homeSearch.test.ts — this pins the CONTRACT the new segment depends on: an
 * action row opens ActionDetail, and that must resolve from the Plan tab
 * (the Calendar stack), never a dead tap.
 */
import { describe, it, expect } from 'vitest';
import { resolvesFrom } from '@/navigation/routeGraph';
import { buildPlan } from '@/lib/planView';
import { actionReturnNavigation, ACTION_DETAIL_TAB } from '@/lib/actionReturn';

describe('the Action Plan segment sends a row somewhere that resolves', () => {
  it('an action row opens ActionDetail — resolves from the Plan tab (Calendar)', () => {
    // PlanScreen does navigate('Tracker', { screen: 'ActionDetail', params }).
    expect(resolvesFrom('Calendar', { screen: 'ActionDetail', tab: 'Tracker' })).toBe(true);
  });

  it('the full-list fallback still resolves too', () => {
    expect(resolvesFrom('Calendar', { screen: 'TrackerList', tab: 'Tracker' })).toBe(true);
  });

  it('and the row says how to get BACK to Plan', () => {
    // Read off the real builder, not a literal: ActionDetail lives in the
    // hidden Tracker stack, so its own Back popped to that stack's list or
    // bubbled to the tab navigator and landed on Home — out of the Calendar
    // tab the parent was standing in (`lib/actionReturn.ts`).
    const [entry] = buildPlan({
      actions: [
        {
          id: 'a1',
          title: 'Call the Service Coordinator',
          status: 'not_started',
          priority: 'medium',
          due_date: '2026-08-29',
          category: 'regional_center',
        },
      ],
      appointments: [],
      deadlines: [],
      now: new Date('2026-08-29T09:00:00'),
    }).sections.flatMap((s) => s.entries);

    const back = actionReturnNavigation(entry.target?.params?.returnTo);
    expect(back).not.toBeNull();
    expect(back!.tab).toBe('Calendar');
    expect(back!.options.screen).toBe('PlanMain');
    expect(
      resolvesFrom(ACTION_DETAIL_TAB, { screen: back!.options.screen, tab: back!.tab })
    ).toBe(true);
  });
});
