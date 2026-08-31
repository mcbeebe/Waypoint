/**
 * Plan membership (owner, Aug 31 2026) — the reconcile that stops the journey
 * "＋" from re-adding a step that's already on the plan.
 */
import { describe, it, expect } from 'vitest';
import { onPlanTitles } from './planMembership';
import type { Action } from '@/types/database';

const act = (title: string, status: Action['status']): Pick<Action, 'title' | 'status'> => ({
  title,
  status,
});

describe('onPlanTitles reflects what is OPEN on the plan', () => {
  it('includes not_started and in_progress actions by title', () => {
    const titles = onPlanTitles([
      act('School District: Annual IEP reviews', 'not_started'),
      act('Regional Center: Annual IPP review', 'in_progress'),
    ]);
    expect(titles.has('School District: Annual IEP reviews')).toBe(true);
    expect(titles.has('Regional Center: Annual IPP review')).toBe(true);
  });

  it('excludes dismissed actions — a step set aside can be added again', () => {
    const titles = onPlanTitles([act('IHSS: Annual hour reassessment', 'dismissed')]);
    expect(titles.has('IHSS: Annual hour reassessment')).toBe(false);
  });

  it('excludes completed actions — a recurring task can come back next cycle', () => {
    const titles = onPlanTitles([act('Regional Center: Annual IPP review', 'completed')]);
    expect(titles.has('Regional Center: Annual IPP review')).toBe(false);
  });

  it('is empty for an empty plan (so nothing reads as already-added)', () => {
    expect(onPlanTitles([]).size).toBe(0);
  });

  it('dedupes identical titles into one set entry', () => {
    // The exact bug: the same step inserted many times. The set collapses them,
    // so one open copy reads as "on your plan".
    const titles = onPlanTitles([
      act('School District: Annual IEP reviews', 'not_started'),
      act('School District: Annual IEP reviews', 'not_started'),
      act('School District: Annual IEP reviews', 'not_started'),
    ]);
    expect(titles.size).toBe(1);
    expect(titles.has('School District: Annual IEP reviews')).toBe(true);
  });
});
