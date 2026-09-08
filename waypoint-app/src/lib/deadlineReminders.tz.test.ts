/**
 * Deadline reminder trigger times, run in BOTH timezone projects
 * (Asia/Ho_Chi_Minh, UTC+7, and America/Los_Angeles, where Waypoint's families
 * live). Nothing here may assume which side of Greenwich it is on.
 *
 * The discipline that buys that: every assertion reads LOCAL calendar fields
 * (`getFullYear`/`getMonth`/`getDate`/`getHours`) and every fixture instant is
 * built with the local `new Date(y, m, d, …)` constructor. No ISO strings, no
 * `getUTC*`, no epoch numbers — each of those would bake in a zone and make
 * one of the two projects wrong.
 *
 * What this file exists to catch: `due_date` is a Postgres `date`, and parsed
 * as UTC midnight it is 17:00 the PREVIOUS DAY in California. Every reminder
 * then shifts a day early, and the "Due Today" push — the one that says *today*
 * — arrives the morning before. `tz-west` fails on that class; `tz` (east)
 * cannot see it, because there the naive parse lands on the right day anyway.
 * The `getHours()` assertions are the half that discriminates in BOTH: a fix
 * written with `setUTCHours` passes the day checks and fails these.
 */
import { describe, it, expect } from 'vitest';
import {
  deadlineTriggers,
  DEFAULT_REMINDER_DAYS,
  AHEAD_FIRE_HOUR,
  DUE_DAY_FIRE_HOUR,
} from './deadlineReminders';

/** A deadline the family reads as "October 1, 2026". */
const DUE = '2026-10-01';
/** Well before every trigger the fixtures below produce. */
const EARLY = new Date(2026, 0, 1, 9, 0);

/** The local calendar day and hour a push lands on — the family's own view. */
function landsOn(d: Date): [number, number, number, number] {
  return [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()];
}

describe('the due-day push lands on the day the row names', () => {
  it('fires at 8am local ON the due date, not the morning before', () => {
    // The reported bug: for a deadline due Oct 1, a California family got
    // "Due Today" at 8am on SEP 30. Both halves matter — Oct 1 is the day,
    // and 8 is a LOCAL hour, not 8 UTC.
    const due = deadlineTriggers({ title: 'IEP paperwork', dueDate: DUE, now: EARLY })
      .find((t) => t.kind === 'due');

    expect(due).toBeDefined();
    expect(landsOn(due!.fireAt)).toEqual([2026, 9, 1, DUE_DAY_FIRE_HOUR]);
  });

  it('still reaches the family when scheduling happens the day before', () => {
    // The worst consequence of the old parse, and the reason this is not just
    // a cosmetic off-by-one: at noon on Sep 30, every lead time has passed, so
    // the due-day push is the only one left. Parsed as UTC midnight it landed
    // at 8am on Sep 30 — already past — so it was dropped as well and the
    // family got NOTHING for a deadline due the next morning.
    const specs = deadlineTriggers({
      title: 'IEP paperwork',
      dueDate: DUE,
      now: new Date(2026, 8, 30, 12, 0),
    });

    expect(specs).toHaveLength(1);
    expect(specs[0].kind).toBe('due');
    expect(landsOn(specs[0].fireAt)).toEqual([2026, 9, 1, DUE_DAY_FIRE_HOUR]);
  });
});

describe('lead-time reminders', () => {
  it('land N days before the due date, at 9am local', () => {
    const specs = deadlineTriggers({ title: 'Fair hearing request', dueDate: DUE, now: EARLY });
    const ahead = specs.filter((t) => t.kind === 'ahead');

    expect(ahead.map((t) => t.daysBefore)).toEqual(DEFAULT_REMINDER_DAYS);
    // 30 · 14 · 7 · 1 days before Oct 1 2026 = Sep 1 · Sep 17 · Sep 24 · Sep 30.
    expect(ahead.map((t) => landsOn(t.fireAt))).toEqual([
      [2026, 8, 1, AHEAD_FIRE_HOUR],
      [2026, 8, 17, AHEAD_FIRE_HOUR],
      [2026, 8, 24, AHEAD_FIRE_HOUR],
      [2026, 8, 30, AHEAD_FIRE_HOUR],
    ]);
  });

  it("holds 9am local across a DST change it spans", () => {
    // 30 days before Nov 10 is Oct 11 — the far side of the US DST change on
    // Nov 1. The reminder is still 9am as the family reads a clock, which is
    // what local-calendar arithmetic gives and fixed-offset arithmetic does
    // not. In the east project there is no DST and the same assertion holds.
    const specs = deadlineTriggers({
      title: 'Annual review',
      dueDate: '2026-11-10',
      reminderDays: [30],
      now: EARLY,
    });

    expect(landsOn(specs[0].fireAt)).toEqual([2026, 9, 11, AHEAD_FIRE_HOUR]);
  });

  it("uses the row's own lead times when it has them", () => {
    const specs = deadlineTriggers({
      title: 'Records request',
      dueDate: DUE,
      reminderDays: [3],
      now: EARLY,
    });

    expect(specs.map((t) => t.daysBefore)).toEqual([3, 0]);
    expect(landsOn(specs[0].fireAt)).toEqual([2026, 8, 28, AHEAD_FIRE_HOUR]);
  });

  it('falls back to the defaults when the row lists none', () => {
    for (const reminderDays of [[], null, undefined]) {
      const specs = deadlineTriggers({ title: 'X', dueDate: DUE, reminderDays, now: EARLY });
      expect(specs.filter((t) => t.kind === 'ahead').map((t) => t.daysBefore))
        .toEqual(DEFAULT_REMINDER_DAYS);
    }
  });
});

describe('what never gets scheduled', () => {
  it('drops triggers already past, keeping the ones still ahead', () => {
    // Sep 20, 10am local: the 30- and 14-day reminders have gone by.
    const specs = deadlineTriggers({
      title: 'IEP paperwork',
      dueDate: DUE,
      now: new Date(2026, 8, 20, 10, 0),
    });

    expect(specs.map((t) => t.daysBefore)).toEqual([7, 1, 0]);
  });

  it('drops a trigger falling exactly on now — a phone cannot fire into the past', () => {
    const specs = deadlineTriggers({
      title: 'IEP paperwork',
      dueDate: DUE,
      reminderDays: [1],
      now: new Date(2026, 8, 30, AHEAD_FIRE_HOUR, 0, 0, 0),
    });

    expect(specs.map((t) => t.kind)).toEqual(['due']);
  });

  it('yields nothing at all once the whole deadline is behind the family', () => {
    expect(deadlineTriggers({ title: 'X', dueDate: DUE, now: new Date(2026, 9, 2, 9, 0) }))
      .toEqual([]);
  });

  it('yields nothing for an unparsable due date rather than an Invalid Date', () => {
    expect(deadlineTriggers({ title: 'X', dueDate: 'not-a-date', now: EARLY })).toEqual([]);
  });
});

describe('the words the family reads', () => {
  it('says "tomorrow" at one day out and counts the days otherwise', () => {
    const specs = deadlineTriggers({
      title: 'IEP paperwork',
      dueDate: DUE,
      reminderDays: [7, 1],
      now: EARLY,
    });

    expect(specs[0].title).toBe('Deadline: IEP paperwork');
    expect(specs[0].body).toBe('Due in 7 days. Tap to view your action plan.');
    expect(specs[1].body).toBe('Due tomorrow. Tap to view your action plan.');
  });

  it('names the deadline in the due-day push', () => {
    const due = deadlineTriggers({ title: 'IEP paperwork', dueDate: DUE, now: EARLY })
      .find((t) => t.kind === 'due')!;

    expect(due.title).toBe('Due Today: IEP paperwork');
    expect(due.body).toBe('This deadline is due today. Take action now.');
  });

  it('puts the due-day push last, after every lead time', () => {
    const specs = deadlineTriggers({ title: 'X', dueDate: DUE, now: EARLY });
    expect(specs[specs.length - 1].kind).toBe('due');
    expect(specs.filter((t) => t.kind === 'due')).toHaveLength(1);
  });
});
