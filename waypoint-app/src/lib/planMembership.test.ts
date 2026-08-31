/**
 * Plan membership (owner, Aug 31 2026) — the reconcile that stops the journey
 * "＋" from re-adding a step already on the plan. It MUST agree with
 * createAction's dedup key (open · source 'system' · same child), or the UI
 * masks the ＋ for a child who doesn't have the step — the multi-child defect
 * an adversary pass caught.
 */
import { describe, it, expect } from 'vitest';
import { onPlanTitles } from './planMembership';
import type { Action } from '@/types/database';

type A = Pick<Action, 'title' | 'status' | 'source' | 'child_id'>;
const act = (title: string, status: Action['status'], source: Action['source'], child_id: string | null): A => ({
  title,
  status,
  source,
  child_id,
});

const IEP = 'School District: Annual IEP reviews';

describe('onPlanTitles reflects what is OPEN on the plan for a given child', () => {
  it('includes open system actions for the matching child', () => {
    const titles = onPlanTitles([act(IEP, 'not_started', 'system', 'childA')], 'childA');
    expect(titles.has(IEP)).toBe(true);
  });

  it('does NOT count a SIBLING’s identical-title action — the multi-child bug', () => {
    // The title is child-independent, so B's open step must not mask A's ＋.
    const titles = onPlanTitles([act(IEP, 'not_started', 'system', 'childB')], 'childA');
    expect(titles.has(IEP), 'child A should still be addable').toBe(false);
  });

  it('does NOT count a manual or AI action of the same title — different intent', () => {
    const rows = [
      act(IEP, 'not_started', 'manual', 'childA'),
      act(IEP, 'not_started', 'ai_navigator', null),
    ];
    expect(onPlanTitles(rows, 'childA').has(IEP)).toBe(false);
  });

  it('excludes dismissed and completed — a set-aside or recurring step can return', () => {
    expect(onPlanTitles([act(IEP, 'dismissed', 'system', 'childA')], 'childA').has(IEP)).toBe(false);
    expect(onPlanTitles([act(IEP, 'completed', 'system', 'childA')], 'childA').has(IEP)).toBe(false);
  });

  it('matches the family (null-child) scope symmetrically', () => {
    expect(onPlanTitles([act(IEP, 'in_progress', 'system', null)], null).has(IEP)).toBe(true);
    expect(onPlanTitles([act(IEP, 'in_progress', 'system', 'childA')], null).has(IEP)).toBe(false);
  });

  it('collapses identical open rows for the same child into one', () => {
    const rows = [
      act(IEP, 'not_started', 'system', 'childA'),
      act(IEP, 'not_started', 'system', 'childA'),
      act(IEP, 'not_started', 'system', 'childA'),
    ];
    expect(onPlanTitles(rows, 'childA').size).toBe(1);
  });
});
