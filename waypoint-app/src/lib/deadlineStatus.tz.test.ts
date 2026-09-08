/**
 * Runs in BOTH timezone projects — `tz` (Asia/Ho_Chi_Minh, UTC+) and
 * `tz-west` (America/Los_Angeles, UTC−) — so nothing here may assume which
 * side of Greenwich it is on. Every assertion states what must hold on ANY
 * device clock.
 *
 * The bug this guards is not a label. `refreshStatuses` PERSISTS
 * `status: 'overdue'`, and it derived "today" from
 * `new Date().toISOString().split('T')[0]` — the UTC day — so a deadline due
 * today was written to the database as overdue every evening after 17:00
 * Pacific, and unlike a display bug it did not self-correct at midnight.
 *
 * The load-bearing tests are the pinned-clock ones at the bottom: they call
 * `newlyOverdue` with its DEFAULT day, which is the only thing a revert to
 * the UTC slice would change. Handing the function a `today` computed by
 * `localDayISO` only re-tests `localDayISO`, which `dateOnly.tz.test.ts`
 * already owns.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { newlyOverdue } from './deadlineStatus';
import { localDayISO } from './dateOnly';

const d = (id: string, due_date: string, status = 'upcoming') => ({ id, due_date, status });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('newlyOverdue', () => {
  it('runs this file OFF UTC, or it proves nothing', () => {
    // Guard the guard: if the project config stops applying TZ, local and UTC
    // agree and the pinned-clock tests below silently become no-ops.
    expect(new Date(2026, 7, 1).getTimezoneOffset()).not.toBe(0);
  });

  describe('against an explicit day', () => {
    const today = '2026-08-01';

    it('leaves a deadline due TODAY alone — the family still has the day', () => {
      expect(newlyOverdue([d('a', today)], today)).toEqual([]);
    });

    it('leaves a FUTURE deadline alone', () => {
      expect(newlyOverdue([d('a', '2026-08-02')], today)).toEqual([]);
    });

    it('marks a deadline whose day has actually passed', () => {
      expect(ids(newlyOverdue([d('a', '2026-07-31')], today))).toEqual(['a']);
    });

    it('never re-writes a row already recorded as overdue', () => {
      expect(newlyOverdue([d('a', '2026-07-01', 'overdue')], today)).toEqual([]);
    });

    it('never reopens a completed deadline', () => {
      expect(newlyOverdue([d('a', '2026-07-01', 'completed')], today)).toEqual([]);
    });

    it('keeps the other statuses in play', () => {
      const rows = [d('a', '2026-07-01', 'action_needed'), d('b', '2026-07-02', 'upcoming')];
      expect(ids(newlyOverdue(rows, today))).toEqual(['a', 'b']);
    });

    it('compares on the date part when a value arrives as a full timestamp', () => {
      expect(newlyOverdue([d('a', '2026-08-01T00:00:00+00:00')], today)).toEqual([]);
    });
  });

  /**
   * Two instants, chosen so that each project catches one direction of the
   * bug and neither assertion has to know its own sign:
   *
   * - 03:00 UTC is Jul 31 20:00 in Los Angeles — the UTC day is a day AHEAD
   *   of the family's. That is the west-coast evening where the old code
   *   stamped a deadline due today as overdue.
   * - 18:00 UTC is Aug 2 01:00 in Ho Chi Minh City — the UTC day is a day
   *   BEHIND. There the old code failed to notice a day that had passed.
   *
   * At each instant the other project sits inside the same UTC day and passes
   * trivially; together they cover both. Both statements below are true on
   * any clock in any zone.
   */
  describe.each([
    ['03:00 UTC — an evening west of Greenwich', '2026-08-01T03:00:00.000Z'],
    ['18:00 UTC — a small hour east of Greenwich', '2026-08-01T18:00:00.000Z'],
  ])('with the device clock at %s', (_label, instant) => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Yesterday by local calendar arithmetic, so a DST edge can't shift it. */
    const localYesterday = () => {
      const n = new Date();
      return localDayISO(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1));
    };

    it('never calls the family’s own day overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(instant));
      expect(newlyOverdue([d('a', localDayISO())])).toEqual([]);
    });

    it('does call yesterday overdue — the clock is not simply frozen', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(instant));
      expect(ids(newlyOverdue([d('a', localYesterday())]))).toEqual(['a']);
    });
  });
});
