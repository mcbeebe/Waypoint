/**
 * The deadline filters, run east of Greenwich (Asia/Ho_Chi_Minh, UTC+7).
 *
 * `due_date` is a Postgres `date` — `2026-09-03`, no zone. The obvious parse,
 * `new Date('2026-09-03')`, is UTC midnight, which is 07:00 the same morning
 * in Vietnam but 17:00 the PREVIOUS DAY in California. So a filter written the
 * obvious way disagrees with itself depending on where the family lives, and
 * under the default TZ both readings happen to agree — which is why this
 * project exists at all (see `vitest.config.ts`).
 *
 * The card's own inline `new Date(action.due_date) < new Date()` still has the
 * naive form; it is called out in the PR rather than changed here. Everything
 * `actionSort` decides goes through `daysFromToday`, which is asserted below.
 */
import { describe, it, expect } from 'vitest';
import { NO_FILTERS, daysFromToday, filterActions } from './actionSort';
import type { Action } from '@/types/database';

/** Just after local midnight — the worst case for a UTC-parsed date. */
const JUST_AFTER_MIDNIGHT = new Date(2026, 8, 3, 0, 30, 0).getTime();
/** Just before local midnight — the other end of the same day. */
const JUST_BEFORE_MIDNIGHT = new Date(2026, 8, 3, 23, 30, 0).getTime();

function act(over: Partial<Action> = {}): Action {
  return {
    id: 'a1',
    title: 'Step',
    priority: 'medium',
    status: 'not_started',
    due_date: null,
    created_at: '2026-09-01T00:00:00.000Z',
    ...over,
  } as Action;
}

describe('a deadline is read on the local calendar day', () => {
  it('names today as today at both ends of the day', () => {
    expect(daysFromToday('2026-09-03', JUST_AFTER_MIDNIGHT)).toBe(0);
    expect(daysFromToday('2026-09-03', JUST_BEFORE_MIDNIGHT)).toBe(0);
  });

  it('names yesterday and tomorrow correctly at both ends of the day', () => {
    expect(daysFromToday('2026-09-02', JUST_AFTER_MIDNIGHT)).toBe(-1);
    expect(daysFromToday('2026-09-04', JUST_BEFORE_MIDNIGHT)).toBe(1);
  });
});

describe('the overdue filter, east of Greenwich', () => {
  const dueToday = act({ id: 'dueToday', due_date: '2026-09-03' });
  const dueYesterday = act({ id: 'dueYesterday', due_date: '2026-09-02' });

  it('does not call a step due TODAY overdue, at any hour of that day', () => {
    for (const now of [JUST_AFTER_MIDNIGHT, JUST_BEFORE_MIDNIGHT]) {
      const out = filterActions([dueToday, dueYesterday], { ...NO_FILTERS, due: 'overdue' }, now);
      expect(out.map((a) => a.id)).toEqual(['dueYesterday']);
    }
  });

  it('still counts yesterday as overdue thirty minutes into today', () => {
    const out = filterActions([dueYesterday], { ...NO_FILTERS, due: 'overdue' }, JUST_AFTER_MIDNIGHT);
    expect(out).toHaveLength(1);
  });
});

describe('the next-7-days filter, east of Greenwich', () => {
  it('includes today and day seven, and excludes day eight', () => {
    const items = [
      act({ id: 'd0', due_date: '2026-09-03' }),
      act({ id: 'd7', due_date: '2026-09-10' }),
      act({ id: 'd8', due_date: '2026-09-11' }),
    ];
    const out = filterActions(items, { ...NO_FILTERS, due: 'next7' }, JUST_AFTER_MIDNIGHT);
    expect(out.map((a) => a.id)).toEqual(['d0', 'd7']);
  });
});

describe('the date-added filter, east of Greenwich', () => {
  it('counts a step added late last night as one day old, not zero or two', () => {
    // created_at IS a real timestamp, so this one is about the local day it
    // falls on rather than about parsing.
    const lastNight = new Date(2026, 8, 2, 23, 45, 0).toISOString();
    expect(daysFromToday(lastNight, JUST_AFTER_MIDNIGHT)).toBe(-1);
    const out = filterActions(
      [act({ id: 'x', created_at: lastNight })],
      { ...NO_FILTERS, created: 'last7' },
      JUST_AFTER_MIDNIGHT
    );
    expect(out).toHaveLength(1);
  });
});
