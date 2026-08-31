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

describe('the Action Plan segment sends a row somewhere that resolves', () => {
  it('an action row opens ActionDetail — resolves from the Plan tab (Calendar)', () => {
    // PlanScreen does navigate('Tracker', { screen: 'ActionDetail', params }).
    expect(resolvesFrom('Calendar', { screen: 'ActionDetail', tab: 'Tracker' })).toBe(true);
  });

  it('the full-list fallback still resolves too', () => {
    expect(resolvesFrom('Calendar', { screen: 'TrackerList', tab: 'Tracker' })).toBe(true);
  });
});
