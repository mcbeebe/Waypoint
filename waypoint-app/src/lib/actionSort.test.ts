/**
 * Sorting and filtering the action plan.
 *
 * Two things here are load-bearing beyond "does it sort":
 *
 * 1. **Identity.** The plan's focus view keeps its "next 3" by object identity.
 *    A sort that returned clones would break the just-saved carve-out with no
 *    type error and no failing render test, so it is asserted directly.
 * 2. **Local calendar days.** `due_date` is a Postgres `date`. Parsed the
 *    obvious way it becomes UTC midnight, which is the previous evening in
 *    California — so a step due today reads as overdue for every family west
 *    of Greenwich. The `.tz.test.ts` sibling runs the same boundaries from
 *    Asia/Ho_Chi_Minh.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DIR,
  NO_FILTERS,
  SORT_FIELDS,
  activeFilterCount,
  createdFilterLabel,
  daysFromToday,
  dueFilterLabel,
  filterActions,
  hasActiveFilters,
  isReversibleField,
  sortActions,
  sortDirArrow,
  sortDirLabel,
  sortLabel,
  sortUiLabel,
  type ActionFilters,
  type ActionSortField,
} from './actionSort';
import type { Action } from '@/types/database';

/** Noon on Sep 3 2026, local — the clock every case below is asked about. */
const NOW = new Date(2026, 8, 3, 12, 0, 0).getTime();

/** A day offset from NOW, as the `YYYY-MM-DD` a Postgres `date` column holds. */
function day(offset: number): string {
  const d = new Date(2026, 8, 3 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** A timestamp `n` days before NOW, as Postgres would return it. */
function daysAgo(n: number): string {
  return new Date(NOW - n * 86400000).toISOString();
}

function act(over: Partial<Action> = {}): Action {
  return {
    id: 'a1',
    title: 'Step',
    priority: 'medium',
    status: 'not_started',
    due_date: null,
    created_at: daysAgo(1),
    ...over,
  } as Action;
}

// ─── Identity ───────────────────────────────────────────────────────────────

describe('the same objects come back out', () => {
  const a = act({ id: 'a', priority: 'low' });
  const b = act({ id: 'b', priority: 'urgent' });

  it('sortActions reorders without cloning', () => {
    const out = sortActions([a, b], 'priority');
    expect(out[0]).toBe(b);
    expect(out[1]).toBe(a);
  });

  it('filterActions narrows without cloning', () => {
    const out = filterActions([a, b], { ...NO_FILTERS, priorities: ['urgent'] }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(b);
  });

  it('neither mutates the input array', () => {
    const input = [a, b];
    sortActions(input, 'priority');
    expect(input[0]).toBe(a);
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

describe('sortActions', () => {
  it('smart keeps the order the plan has always shipped: priority, deadline, newest', () => {
    const urgentLate = act({ id: 'urgentLate', priority: 'urgent', due_date: day(30) });
    const lowSoon = act({ id: 'lowSoon', priority: 'low', due_date: day(1) });
    const urgentSoon = act({ id: 'urgentSoon', priority: 'urgent', due_date: day(2) });
    const out = sortActions([lowSoon, urgentLate, urgentSoon], 'smart');
    expect(out.map((a) => a.id)).toEqual(['urgentSoon', 'urgentLate', 'lowSoon']);
  });

  it('due_date puts the soonest deadline first, whatever its priority', () => {
    const urgentLate = act({ id: 'urgentLate', priority: 'urgent', due_date: day(30) });
    const lowSoon = act({ id: 'lowSoon', priority: 'low', due_date: day(1) });
    const out = sortActions([urgentLate, lowSoon], 'due_date');
    expect(out.map((a) => a.id)).toEqual(['lowSoon', 'urgentLate']);
  });

  it('due_date puts undated steps last rather than first', () => {
    // Sorting `null` naively floats undated steps to the top, which reads as
    // "these are the most urgent" — the exact opposite of the truth.
    const undated = act({ id: 'undated', due_date: null });
    const dated = act({ id: 'dated', due_date: day(90) });
    expect(sortActions([undated, dated], 'due_date').map((a) => a.id)).toEqual([
      'dated',
      'undated',
    ]);
  });

  it('priority ignores the deadline, unlike smart', () => {
    const urgentLate = act({ id: 'urgentLate', priority: 'urgent', due_date: day(30) });
    const highSoon = act({ id: 'highSoon', priority: 'high', due_date: day(0) });
    expect(sortActions([highSoon, urgentLate], 'priority').map((a) => a.id)).toEqual([
      'urgentLate',
      'highSoon',
    ]);
  });

  it('created desc is newest first and asc is its exact reverse', () => {
    const old = act({ id: 'old', created_at: daysAgo(40) });
    const mid = act({ id: 'mid', created_at: daysAgo(10) });
    const fresh = act({ id: 'fresh', created_at: daysAgo(0) });
    expect(sortActions([mid, old, fresh], 'created', 'desc').map((a) => a.id)).toEqual([
      'fresh',
      'mid',
      'old',
    ]);
    expect(sortActions([mid, old, fresh], 'created', 'asc').map((a) => a.id)).toEqual([
      'old',
      'mid',
      'fresh',
    ]);
  });

  it('created defaults to newest first when no direction is given', () => {
    const old = act({ id: 'old', created_at: daysAgo(40) });
    const fresh = act({ id: 'fresh', created_at: daysAgo(0) });
    expect(sortActions([old, fresh], 'created').map((a) => a.id)).toEqual(['fresh', 'old']);
  });

  it('due_date reverses to latest-first, and keeps undated LAST in both directions', () => {
    // Reversing "soonest first" must give "latest first", not "undated first":
    // an undated step is not a step due in the year 9999.
    const soon = act({ id: 'soon', due_date: day(1) });
    const late = act({ id: 'late', due_date: day(30) });
    const undated = act({ id: 'undated', due_date: null });
    expect(sortActions([late, soon, undated], 'due_date', 'asc').map((a) => a.id)).toEqual([
      'soon', 'late', 'undated',
    ]);
    expect(sortActions([soon, late, undated], 'due_date', 'desc').map((a) => a.id)).toEqual([
      'late', 'soon', 'undated',
    ]);
  });

  it('priority reverses to least-urgent-first', () => {
    const urgent = act({ id: 'urgent', priority: 'urgent' });
    const low = act({ id: 'low', priority: 'low' });
    expect(sortActions([low, urgent], 'priority', 'desc').map((a) => a.id)).toEqual(['urgent', 'low']);
    expect(sortActions([urgent, low], 'priority', 'asc').map((a) => a.id)).toEqual(['low', 'urgent']);
  });

  it('keeps its tiebreaks in ONE orientation whichever way the primary points', () => {
    // Two steps that tie on the primary key must land in the same relative
    // order in both directions — otherwise "reverse" means different things at
    // different tie depths. Same priority, same created_at → id decides, asc or desc.
    const a = act({ id: 'aaa', priority: 'high', created_at: daysAgo(5) });
    const b = act({ id: 'bbb', priority: 'high', created_at: daysAgo(5) });
    expect(sortActions([b, a], 'priority', 'desc').map((x) => x.id)).toEqual(['aaa', 'bbb']);
    expect(sortActions([b, a], 'priority', 'asc').map((x) => x.id)).toEqual(['aaa', 'bbb']);
  });

  it('is deterministic when a whole batch shares a timestamp', () => {
    // Onboarding inserts seven generated steps at once, so ties are the norm,
    // not the edge case. Without the id tiebreak the list can reshuffle
    // between renders for no reason a parent can see.
    const stamp = daysAgo(3);
    const batch = ['c', 'a', 'b'].map((id) => act({ id, created_at: stamp }));
    for (const field of SORT_FIELDS) {
      for (const dir of ['asc', 'desc'] as const) {
        expect(sortActions(batch, field, dir).map((a) => a.id)).toEqual(['a', 'b', 'c']);
      }
    }
  });

  it('survives an unparsable created_at rather than throwing', () => {
    const bad = act({ id: 'bad', created_at: 'not-a-timestamp' });
    const good = act({ id: 'good', created_at: daysAgo(1) });
    expect(() => sortActions([bad, good], 'created', 'desc')).not.toThrow();
    expect(sortActions([bad, good], 'created', 'desc')).toHaveLength(2);
  });

  it('falls back to smart for an unknown field rather than returning nothing', () => {
    const items = [act({ id: 'a' }), act({ id: 'b' })];
    expect(sortActions(items, 'bogus' as never)).toHaveLength(2);
  });
});

// ─── Deadline filters ───────────────────────────────────────────────────────

describe('daysFromToday', () => {
  it('reads a Postgres date on the LOCAL calendar day, not UTC midnight', () => {
    expect(daysFromToday(day(0), NOW)).toBe(0);
    expect(daysFromToday(day(-1), NOW)).toBe(-1);
    expect(daysFromToday(day(7), NOW)).toBe(7);
  });

  it('is null for a missing or unparsable date', () => {
    expect(daysFromToday(null, NOW)).toBeNull();
    expect(daysFromToday('sometime next week', NOW)).toBeNull();
  });
});

describe('the deadline filter', () => {
  const overdue = act({ id: 'overdue', due_date: day(-3) });
  const dueToday = act({ id: 'dueToday', due_date: day(0) });
  const dueIn5 = act({ id: 'dueIn5', due_date: day(5) });
  const dueIn30 = act({ id: 'dueIn30', due_date: day(30) });
  const undated = act({ id: 'undated', due_date: null });
  const all = [overdue, dueToday, dueIn5, dueIn30, undated];

  const ids = (due: ActionFilters['due']) =>
    filterActions(all, { ...NO_FILTERS, due }, NOW).map((a) => a.id);

  it('any keeps everything', () => {
    expect(ids('any')).toHaveLength(5);
  });

  it('overdue is strictly in the past — today is not overdue', () => {
    expect(ids('overdue')).toEqual(['overdue']);
  });

  it('does not call a finished step overdue, however old its deadline', () => {
    // "3 overdue" that counts things a parent has already done is worse than
    // no count at all.
    const done = act({ id: 'done', due_date: day(-90), status: 'completed' });
    expect(
      filterActions([done, overdue], { ...NO_FILTERS, due: 'overdue' }, NOW).map((a) => a.id)
    ).toEqual(['overdue']);
  });

  it('next7 spans today through day seven inclusive, and stops there', () => {
    expect(ids('next7')).toEqual(['dueToday', 'dueIn5']);
    expect(filterActions([act({ due_date: day(8) })], { ...NO_FILTERS, due: 'next7' }, NOW)).toEqual(
      []
    );
    expect(
      filterActions([act({ due_date: day(7) })], { ...NO_FILTERS, due: 'next7' }, NOW)
    ).toHaveLength(1);
  });

  it('has_date and no_date partition the plan exactly', () => {
    expect(ids('has_date')).toEqual(['overdue', 'dueToday', 'dueIn5', 'dueIn30']);
    expect(ids('no_date')).toEqual(['undated']);
  });
});

// ─── Date-added filters ─────────────────────────────────────────────────────

describe('the date-added filter', () => {
  const today = act({ id: 'today', created_at: daysAgo(0) });
  const week = act({ id: 'week', created_at: daysAgo(6) });
  const month = act({ id: 'month', created_at: daysAgo(20) });
  const ancient = act({ id: 'ancient', created_at: daysAgo(90) });
  const all = [today, week, month, ancient];

  const ids = (created: ActionFilters['created']) =>
    filterActions(all, { ...NO_FILTERS, created }, NOW).map((a) => a.id);

  it('last7 and last30 are inclusive windows that nest', () => {
    expect(ids('last7')).toEqual(['today', 'week']);
    expect(ids('last30')).toEqual(['today', 'week', 'month']);
  });

  it('older is everything the windows leave out', () => {
    expect(ids('older')).toEqual(['ancient']);
  });

  it('never claims an unparsable stamp is recent', () => {
    const bad = act({ id: 'bad', created_at: 'not-a-timestamp' });
    expect(filterActions([bad], { ...NO_FILTERS, created: 'last7' }, NOW)).toEqual([]);
    expect(filterActions([bad], { ...NO_FILTERS, created: 'older' }, NOW)).toHaveLength(1);
  });
});

// ─── Priority filter and combinations ───────────────────────────────────────

describe('the priority filter', () => {
  const urgent = act({ id: 'urgent', priority: 'urgent' });
  const high = act({ id: 'high', priority: 'high' });
  const low = act({ id: 'low', priority: 'low' });

  it('an empty list means ANY priority, never "match nothing"', () => {
    expect(filterActions([urgent, high, low], NO_FILTERS, NOW)).toHaveLength(3);
  });

  it('several priorities are an OR, not an AND', () => {
    const out = filterActions(
      [urgent, high, low],
      { ...NO_FILTERS, priorities: ['urgent', 'low'] },
      NOW
    );
    expect(out.map((a) => a.id)).toEqual(['urgent', 'low']);
  });
});

describe('filters combine as an AND across dimensions', () => {
  it('urgent AND overdue is narrower than either alone', () => {
    const urgentOverdue = act({ id: 'both', priority: 'urgent', due_date: day(-1) });
    const urgentFuture = act({ id: 'urgentFuture', priority: 'urgent', due_date: day(9) });
    const lowOverdue = act({ id: 'lowOverdue', priority: 'low', due_date: day(-1) });
    const out = filterActions(
      [urgentOverdue, urgentFuture, lowOverdue],
      { priorities: ['urgent'], due: 'overdue', created: 'any' },
      NOW
    );
    expect(out.map((a) => a.id)).toEqual(['both']);
  });
});

// ─── The count on the Filters button ────────────────────────────────────────

describe('activeFilterCount', () => {
  it('is zero for the default view', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });

  it('counts dimensions, not selections — three urgent-ish priorities is one filter', () => {
    expect(activeFilterCount({ ...NO_FILTERS, priorities: ['urgent', 'high', 'low'] })).toBe(1);
  });

  it('adds up across dimensions', () => {
    expect(activeFilterCount({ priorities: ['urgent'], due: 'overdue', created: 'last7' })).toBe(3);
    expect(hasActiveFilters({ priorities: [], due: 'overdue', created: 'any' })).toBe(true);
  });
});

// ─── Labels ─────────────────────────────────────────────────────────────────

describe('labels', () => {
  it('never uses the word "Added" for a sort', () => {
    // The list card renders "Added Aug 18" on every row. A sort chip carrying
    // the same word makes every text query for that line ambiguous — and the
    // suite queries it directly.
    for (const field of SORT_FIELDS) {
      for (const locale of ['en', 'es', 'vi'] as const) {
        expect(sortLabel(field, locale)).not.toMatch(/added/i);
      }
    }
  });

  it('never renders a sort chip as the bare word "New"', () => {
    // `getByText('New')` pins the just-added badge. "Newest" is a different
    // string; "New" would collide.
    for (const field of SORT_FIELDS) {
      expect(sortLabel(field, 'en')).not.toBe('New');
    }
  });

  it('translates every sort key, deadline bucket and date bucket in all three locales', () => {
    for (const locale of ['en', 'es', 'vi'] as const) {
      for (const field of SORT_FIELDS) expect(sortLabel(field, locale)).toBeTruthy();
      for (const d of ['any', 'overdue', 'next7', 'has_date', 'no_date'] as const) {
        expect(dueFilterLabel(d, locale)).toBeTruthy();
      }
      for (const c of ['any', 'last7', 'last30', 'older'] as const) {
        expect(createdFilterLabel(c, locale)).toBeTruthy();
      }
      for (const h of ['sort', 'filters', 'dateAdded', 'clear'] as const) {
        expect(sortUiLabel(h, locale)).toBeTruthy();
      }
    }
  });

  it('is genuinely translated, not English copied into three tables', () => {
    expect(sortLabel('due_date', 'es')).not.toBe(sortLabel('due_date', 'en'));
    expect(sortLabel('due_date', 'vi')).not.toBe(sortLabel('due_date', 'en'));
  });

  it('falls back to English for a locale it does not carry', () => {
    expect(sortLabel('priority', 'fr' as never)).toBe(sortLabel('priority', 'en'));
  });
});

// ─── Sorting both ways (owner, Sep 3) ───────────────────────────────────────

describe('direction', () => {
  const REVERSIBLE: ActionSortField[] = ['due_date', 'priority', 'created'];

  it('smart is the only field that does not reverse', () => {
    expect(isReversibleField('smart')).toBe(false);
    for (const field of REVERSIBLE) expect(isReversibleField(field)).toBe(true);
  });

  it('names both directions of every reversible field, in all three locales', () => {
    for (const locale of ['en', 'es', 'vi'] as const) {
      for (const field of REVERSIBLE) {
        for (const dir of ['asc', 'desc'] as const) {
          expect(sortDirLabel(field, dir, locale)).toBeTruthy();
        }
        // The two directions must READ differently — or the toggle says nothing.
        expect(sortDirLabel(field, 'asc', locale)).not.toBe(sortDirLabel(field, 'desc', locale));
      }
    }
  });

  it('has no direction phrase for smart', () => {
    expect(sortDirLabel('smart', 'asc')).toBe('');
    expect(sortDirLabel('smart', 'desc')).toBe('');
  });

  it('points the arrow up for ascending and down for descending', () => {
    expect(sortDirArrow('asc')).toBe('↑');
    expect(sortDirArrow('desc')).toBe('↓');
  });

  it('gives every field a sensible default direction', () => {
    expect(DEFAULT_DIR.due_date).toBe('asc'); // soonest first
    expect(DEFAULT_DIR.priority).toBe('desc'); // most urgent first
    expect(DEFAULT_DIR.created).toBe('desc'); // newest first
  });
});
