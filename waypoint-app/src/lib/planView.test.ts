import { describe, it, expect } from 'vitest';
import {
  buildPlan,
  buildMonth,
  entriesByDay,
  formatDay,
  monthOfNextItem,
  WEEK_DAYS,
} from './planView';
import type { PlanInput } from './planView';

const NOW = new Date('2026-08-29T09:00:00');

function base(over: Partial<PlanInput> = {}): PlanInput {
  return { actions: [], appointments: [], deadlines: [], now: NOW, ...over };
}
const action = (over: Record<string, unknown> = {}) => ({
  id: 'a1', title: 'Call the Service Coordinator', status: 'not_started',
  priority: 'medium', due_date: null, category: 'regional_center', ...over,
});
const appt = (over: Record<string, unknown> = {}) => ({
  id: 'p1', title: 'IEP meeting', start_time: '2026-08-29T15:00:00', ...over,
});
const deadline = (over: Record<string, unknown> = {}) => ({
  id: 'd1', title: 'Triennial due', due_date: '2026-09-04', status: 'upcoming', ...over,
});
const request = (over: Record<string, unknown> = {}) => ({
  id: 'r1', title: 'IPP meeting', request_type: 'ipp_meeting' as const,
  requested_on: '2026-08-20', status: 'requested', ...over,
});

const allEntries = (input: PlanInput) =>
  buildPlan(input).sections.flatMap((s) => s.entries);
const sectionOf = (input: PlanInput, id: string) =>
  buildPlan(input).sections.find((s) => s.entries.some((e) => e.id === id))?.key;

describe('nothing is dropped and nothing is doubled', () => {
  const populated = () =>
    base({
      actions: [
        action({ id: 'past', due_date: '2026-08-20', title: 'Overdue task' }),
        action({ id: 'today', due_date: '2026-08-29', title: 'Due today' }),
        action({ id: 'soon', due_date: '2026-09-02', title: 'Due this week' }),
        action({ id: 'far', due_date: '2026-10-15', title: 'Due next month' }),
        action({ id: 'none', due_date: null, title: 'No date yet' }),
      ],
      appointments: [appt()],
      deadlines: [deadline()],
      requests: [request()],
      later: [{ id: 'later:1', title: 'Set aside', returnsOn: '2026-09-05' }],
    });

  it('places every obligation in exactly one section', () => {
    const entries = allEntries(populated());
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // five actions, one appointment, one deadline, one clock, one set aside
    expect(ids).toHaveLength(9);
  });

  it('buckets dated work by how far away it is', () => {
    const input = populated();
    expect(sectionOf(input, 'action:past')).toBe('overdue');
    expect(sectionOf(input, 'action:today')).toBe('today');
    expect(sectionOf(input, 'action:soon')).toBe('week');
    // The prototype's list stopped at this week; a date three weeks out would
    // have existed only in the month grid.
    expect(sectionOf(input, 'action:far')).toBe('upcoming');
    expect(sectionOf(input, 'action:none')).toBe('undated');
  });

  it('keeps what an agency owes separate from what the family owes', () => {
    expect(sectionOf(populated(), 'clock:r1')).toBe('waiting');
  });

  it('keeps set-aside items visible with the day they come back', () => {
    const later = allEntries(populated()).find((e) => e.kind === 'later')!;
    expect(later.returnsOn).toBe('2026-09-05');
    expect(later.source).toContain('Comes back');
  });

  it('boundary: day 7 is this week, day 8 is coming up', () => {
    const input = base({
      actions: [
        action({ id: 'edge', due_date: '2026-09-05' }),   // +7
        action({ id: 'over', due_date: '2026-09-06' }),   // +8
      ],
    });
    expect(WEEK_DAYS).toBe(7);
    expect(sectionOf(input, 'action:edge')).toBe('week');
    expect(sectionOf(input, 'action:over')).toBe('upcoming');
  });
});

describe('finished and closed work leaves the plan', () => {
  it('drops completed actions and completed deadlines', () => {
    const input = base({
      actions: [action({ id: 'done', status: 'completed', due_date: '2026-08-29' })],
      deadlines: [deadline({ id: 'gone', status: 'completed' })],
    });
    expect(buildPlan(input).isEmpty).toBe(true);
  });

  it('drops a request that has already been answered', () => {
    const granted = base({ requests: [request({ status: 'granted' })] });
    expect(buildPlan(granted).isEmpty).toBe(true);
  });

  it('says so plainly when there is genuinely nothing', () => {
    const plan = buildPlan(base());
    expect(plan.isEmpty).toBe(true);
    expect(plan.emptyLine).toContain('its clock appears here');
  });
});

describe('every row carries its provenance', () => {
  it('cites the law on an agency clock', () => {
    const clock = allEntries(base({ requests: [request()] }))[0];
    expect(clock.source).toBe('W&I §4646.5(b)');
    expect(clock.target?.screen).toBe('RequestCase');
  });

  it('distinguishes a synced calendar event from one the family entered', () => {
    const entries = allEntries(
      base({ appointments: [appt({ id: 'g', source: 'google' }), appt({ id: 'own' })] })
    );
    expect(entries.find((e) => e.id === 'appointment:g')?.source).toBe('Synced calendar');
    expect(entries.find((e) => e.id === 'appointment:own')?.source).toBe('Your calendar');
  });

  it('honours the waypoint-only scope', () => {
    const input = base({ appointments: [appt({ id: 'g', source: 'google' })], scope: 'waypoint' });
    expect(buildPlan(input).isEmpty).toBe(true);
  });
});

describe('the month grid', () => {
  const input = () =>
    base({
      appointments: [appt({ start_time: '2026-08-29T15:00:00' })],
      deadlines: [deadline({ due_date: '2026-09-04' })],
    });

  it('lays August 2026 out from the right weekday, with 31 days', () => {
    const grid = buildMonth(input(), 2026, 7);
    const days = grid.cells.filter((c) => c.day !== null);
    expect(days).toHaveLength(31);
    // Aug 1 2026 is a Saturday: six blanks precede it.
    expect(grid.cells.filter((c) => c.day === null)).toHaveLength(6);
    expect(grid.weekdayLabels).toHaveLength(7);
  });

  it('marks today and distinguishes a deadline from an appointment', () => {
    const aug = buildMonth(input(), 2026, 7);
    const today = aug.cells.find((c) => c.dateKey === '2026-08-29')!;
    expect(today.isToday).toBe(true);
    expect(today.markers).toEqual(['appointment']);
    const sep = buildMonth(input(), 2026, 8);
    expect(sep.cells.find((c) => c.dateKey === '2026-09-04')!.markers).toEqual(['deadline']);
  });

  it('opens on the month holding the next item, not always this one', () => {
    const far = base({ deadlines: [deadline({ due_date: '2026-11-12' })] });
    expect(monthOfNextItem(far)).toEqual({ year: 2026, month: 10 });
  });

  it('falls back to the current month when nothing is dated', () => {
    expect(monthOfNextItem(base())).toEqual({ year: 2026, month: 7 });
  });

  it('gives the day list the same entries the grid marked', () => {
    const byDay = entriesByDay(input());
    expect(byDay['2026-08-29'].map((e) => e.kind)).toEqual(['appointment']);
    expect(byDay['2026-09-04'].map((e) => e.kind)).toEqual(['deadline']);
  });
});

describe('dates are local and readable', () => {
  it('names today and tomorrow rather than printing their dates', () => {
    expect(formatDay('2026-08-29', NOW, 'en')).toBe('Today');
    expect(formatDay('2026-08-30', NOW, 'en')).toBe('Tomorrow');
  });

  it('never slices a UTC date into a local day', () => {
    // 5pm local on the 29th is the 30th in UTC. The row must still say Today.
    const evening = new Date('2026-08-29T17:00:00');
    const entries = allEntries(
      base({ now: evening, appointments: [appt({ start_time: '2026-08-29T18:00:00' })] })
    );
    expect(entries[0].dayLabel).toBe('Today');
  });
});

describe('locale parity', () => {
  const populated = (locale: 'en' | 'es' | 'vi') =>
    buildPlan(
      base({
        locale,
        actions: [action({ due_date: '2026-09-02' })],
        appointments: [appt()],
        deadlines: [deadline()],
        requests: [request()],
      })
    );

  it('gives every locale the same sections, ids and citations', () => {
    const en = populated('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = populated(loc);
      expect(other.sections.map((s) => s.key)).toEqual(en.sections.map((s) => s.key));
      expect(other.sections.flatMap((s) => s.entries.map((e) => e.id))).toEqual(
        en.sections.flatMap((s) => s.entries.map((e) => e.id))
      );
      // Citations are legal references — they stay in English.
      const cite = (p: typeof en) =>
        p.sections.flatMap((s) => s.entries.filter((e) => e.kind === 'clock').map((e) => e.source));
      expect(cite(other)).toEqual(cite(en));
    }
  });

  it('translates the labels rather than repeating English', () => {
    const en = populated('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = populated(loc);
      other.sections.forEach((s, i) => {
        expect(s.label).not.toBe(en.sections[i].label);
      });
    }
  });
});
