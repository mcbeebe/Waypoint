import { describe, it, expect } from 'vitest';
import { buildAgenda, weekSummaryLine, dayKey, type AgendaInput } from './agenda';

// A fixed local "now": Wed Aug 19 2026, 9am
const NOW = new Date(2026, 7, 19, 9, 0, 0);
const at = (day: number, hour: number) => new Date(2026, 7, day, hour, 0, 0).toISOString();
const on = (day: number) => `2026-08-${String(day).padStart(2, '0')}`;

const base: AgendaInput = { actions: [], appointments: [], deadlines: [], now: NOW };

const action = (over: Partial<AgendaInput['actions'][0]> & { id: string }) => ({
  title: `Action ${over.id}`,
  status: 'not_started',
  priority: 'medium',
  due_date: null,
  category: 'general',
  ...over,
});

describe('buildAgenda — today', () => {
  it('gathers today’s appointments in time order', () => {
    const agenda = buildAgenda({
      ...base,
      appointments: [
        { id: 'pm', title: 'OT', start_time: at(19, 15) },
        { id: 'am', title: 'Speech', start_time: at(19, 10) },
        { id: 'tomorrow', title: 'IEP', start_time: at(20, 9) },
      ],
    });
    expect(agenda.todayAppointments.map((a) => a.id)).toEqual(['am', 'pm']);
  });

  it('separates overdue from due-today', () => {
    const agenda = buildAgenda({
      ...base,
      actions: [
        action({ id: 'late', due_date: on(14) }),
        action({ id: 'today', due_date: on(19) }),
        action({ id: 'later', due_date: on(25) }),
      ],
    });
    expect(agenda.overdue.map((a) => a.id)).toEqual(['late']);
    expect(agenda.todayActions.map((a) => a.id)).toEqual(['today']);
  });

  it('ignores work that is already done or cancelled', () => {
    const agenda = buildAgenda({
      ...base,
      actions: [
        action({ id: 'done', due_date: on(14), status: 'completed' }),
        action({ id: 'dropped', due_date: on(19), status: 'dismissed' }),
      ],
    });
    expect(agenda.overdue).toHaveLength(0);
    expect(agenda.todayActions).toHaveLength(0);
    expect(agenda.isClearToday).toBe(true);
  });

  it('counts a day as clear only when nothing at all is pending', () => {
    expect(buildAgenda(base).isClearToday).toBe(true);
    const withOverdue = buildAgenda({ ...base, actions: [action({ id: 'x', due_date: on(1) })] });
    expect(withOverdue.isClearToday).toBe(false);
  });
});

describe('buildAgenda — focus', () => {
  it('picks the most overdue urgent item first', () => {
    const agenda = buildAgenda({
      ...base,
      actions: [
        action({ id: 'today-urgent', due_date: on(19), priority: 'urgent' }),
        action({ id: 'overdue-urgent', due_date: on(10), priority: 'urgent' }),
        action({ id: 'overdue-low', due_date: on(5), priority: 'low' }),
      ],
    });
    expect(agenda.focus?.id).toBe('overdue-urgent');
  });

  it('falls back to the most pressing open item when nothing is due', () => {
    const agenda = buildAgenda({
      ...base,
      actions: [
        action({ id: 'someday', priority: 'low' }),
        action({ id: 'important', priority: 'urgent' }),
      ],
    });
    expect(agenda.focus?.id).toBe('important');
  });

  it('is null when there is genuinely nothing open', () => {
    expect(buildAgenda({ ...base, actions: [action({ id: 'a', status: 'completed' })] }).focus).toBeNull();
  });
});

describe('buildAgenda — week', () => {
  it('starts today and runs seven days', () => {
    const { week } = buildAgenda(base);
    expect(week).toHaveLength(7);
    expect(week[0].isToday).toBe(true);
    expect(week[0].label).toBe('We');
    expect(week[0].dayOfMonth).toBe(19);
    expect(week[6].dayOfMonth).toBe(25);
    expect(week.slice(1).every((d) => !d.isToday)).toBe(true);
  });

  it('counts appointments and due items per day', () => {
    const { week } = buildAgenda({
      ...base,
      appointments: [{ id: 'a', title: 'OT', start_time: at(21, 14) }],
      actions: [action({ id: 'due-fri', due_date: on(21) })],
      deadlines: [{ id: 'd', title: 'IEP review', due_date: on(21), status: 'upcoming' }],
    });
    const friday = week.find((d) => d.dayOfMonth === 21)!;
    expect(friday.appointmentCount).toBe(1);
    expect(friday.dueCount).toBe(2); // action + deadline
  });

  it('uses local dates, so a late-evening appointment stays on its own day', () => {
    const evening = new Date(2026, 7, 19, 23, 30).toISOString();
    const { todayAppointments } = buildAgenda({
      ...base,
      appointments: [{ id: 'late', title: 'Call', start_time: evening }],
    });
    expect(todayAppointments).toHaveLength(1);
  });
});

describe('weekSummaryLine', () => {
  it('summarises the week in one line', () => {
    const { week } = buildAgenda({
      ...base,
      appointments: [{ id: 'a', title: 'OT', start_time: at(20, 9) }],
      actions: [action({ id: 'x', due_date: on(22) })],
    });
    expect(weekSummaryLine(week)).toBe('1 appointment · 1 due');
  });

  it('says nothing when the week is clear', () => {
    expect(weekSummaryLine(buildAgenda(base).week)).toBeNull();
  });
});

describe('dayKey', () => {
  it('formats local dates without drifting to UTC', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 0))).toBe('2026-01-05');
  });
});

describe('buildAgenda — scope', () => {
  const mixed = {
    ...base,
    appointments: [
      { id: 'school-run', title: 'Double drop off', start_time: at(19, 7), source: 'google' },
      { id: 'ot', title: 'OT session', start_time: at(19, 15), source: 'waypoint' },
      { id: 'legacy', title: 'Older row, pre-031', start_time: at(19, 16) },
    ],
  };

  it('shows everything by default', () => {
    expect(buildAgenda(mixed).todayAppointments).toHaveLength(3);
  });

  it('hides synced Google events in waypoint scope', () => {
    const agenda = buildAgenda({ ...mixed, scope: 'waypoint' });
    expect(agenda.todayAppointments.map((a) => a.id)).toEqual(['ot', 'legacy']);
  });

  it('keeps rows from before the source column existed', () => {
    // undefined source must not vanish — that would empty a pre-031 calendar
    const agenda = buildAgenda({ ...mixed, scope: 'waypoint' });
    expect(agenda.todayAppointments.some((a) => a.id === 'legacy')).toBe(true);
  });

  it('narrows the week counts too', () => {
    const all = buildAgenda(mixed).week[0].appointmentCount;
    const mine = buildAgenda({ ...mixed, scope: 'waypoint' }).week[0].appointmentCount;
    expect(all).toBe(3);
    expect(mine).toBe(2);
  });
});
