import { describe, it, expect } from 'vitest';
import {
  reminderPlan,
  fmtDate,
  DEFAULT_PREFS,
  MAX_SCHEDULED,
  type PolicyInput,
  type NotifPrefs,
  type PolicyRequest,
} from './notificationPolicy';
import type { FunnelLocale } from '@/lib/eligibility';

// A fixed "now" so every case is deterministic. Requests use the 30-day IPP
// meeting clock (W&I §4646.5(b)) — requested_on + 30 days = the due date.
const NOW = new Date(2026, 0, 15, 10, 0, 0); // Jan 15 2026, 10am local

const ON: NotifPrefs = { ...DEFAULT_PREFS, enabled: true };

function req(over: Partial<PolicyRequest> = {}): PolicyRequest {
  return {
    id: 'r1',
    request_type: 'ipp_meeting',
    title: "Teddy's assessment",
    requested_on: '2026-01-10', // + 30 days → due Feb 9 2026
    status: 'in_progress',
    ...over,
  };
}

function input(over: Partial<PolicyInput> = {}): PolicyInput {
  return {
    requests: [],
    deadlines: [],
    actions: [],
    now: NOW,
    locale: 'en',
    prefs: ON,
    ...over,
  };
}

describe('the master switch and category gates', () => {
  it('disabled prefs yield no reminders at all', () => {
    expect(reminderPlan(input({ requests: [req()], prefs: DEFAULT_PREFS }))).toEqual([]);
  });

  it('deadlines-off drops request + deadline reminders but keeps actions', () => {
    const plan = reminderPlan(
      input({
        requests: [req()],
        actions: [{ id: 'a1', title: 'Call the SC', status: 'not_started', dueOn: '2026-02-01' }],
        prefs: { ...ON, deadlines: false },
      })
    );
    expect(plan.every((s) => s.category === 'action')).toBe(true);
    expect(plan.length).toBe(1);
  });

  it('actions-off drops action reminders but keeps request clocks', () => {
    const plan = reminderPlan(
      input({
        requests: [req()],
        actions: [{ id: 'a1', title: 'Call the SC', status: 'not_started', dueOn: '2026-02-01' }],
        prefs: { ...ON, actions: false },
      })
    );
    expect(plan.some((s) => s.category === 'action')).toBe(false);
    expect(plan.some((s) => s.category === 'deadline')).toBe(true);
  });
});

describe('the promise-keeper: a past-due reminder exists for an open request clock', () => {
  it('produces the day-after-due "past due" reminder, tone-correct', () => {
    const plan = reminderPlan(input({ requests: [req()] }));
    const overdue = plan.find((s) => s.data.type === 'clock_overdue');
    expect(overdue).toBeTruthy();
    // Fires the morning AFTER the statutory date (Feb 9 → Feb 10).
    expect(overdue!.fireAt.startsWith('2026-02-10')).toBe(true);
    expect(overdue!.title).toBe('An answer on Teddy\'s assessment is past due');
    expect(overdue!.data.requestId).toBe('r1');
  });

  it('carries the request forward so the tap can draft the follow-up', () => {
    const plan = reminderPlan(input({ requests: [req()] }));
    expect(plan.every((s) => s.data.requestId === 'r1' || s.category === 'action')).toBe(true);
  });
});

describe('escalation tone — status of the answer, never blame', () => {
  const BLAME = [
    /they (missed|failed|owe|ignored)/i,
    /missed the deadline/i,
    /\bowes? you\b/i,
    /didn'?t (reply|respond|answer)/i,
  ];
  it('no reminder in any locale blames the agency', () => {
    for (const locale of ['en', 'es', 'vi'] as FunnelLocale[]) {
      const plan = reminderPlan(
        input({
          locale,
          requests: [req()],
          deadlines: [{ id: 'd1', title: 'IEP signature', due_date: '2026-02-20', status: 'pending' }],
          actions: [{ id: 'a1', title: 'Call the SC', status: 'in_progress', dueOn: '2026-02-01' }],
        })
      );
      for (const s of plan) {
        for (const re of BLAME) {
          expect(re.test(s.title), `${locale} title: ${s.title}`).toBe(false);
          expect(re.test(s.body), `${locale} body: ${s.body}`).toBe(false);
        }
      }
    }
  });
});

describe('locale parity — same specs, translated prose', () => {
  const LOCALES: FunnelLocale[] = ['en', 'es', 'vi'];
  it('every locale returns the same keys, categories, and fire times', () => {
    const shape = (locale: FunnelLocale) =>
      reminderPlan(
        input({
          locale,
          requests: [req()],
          deadlines: [{ id: 'd1', title: 'IEP', due_date: '2026-02-20', status: 'pending' }],
          actions: [{ id: 'a1', title: 'Call', status: 'in_progress', dueOn: '2026-02-01' }],
        })
      ).map((s) => ({ key: s.key, category: s.category, fireAt: s.fireAt }));
    const [en, es, vi] = LOCALES.map(shape);
    expect(es).toEqual(en);
    expect(vi).toEqual(en);
  });

  it('the prose actually differs between locales', () => {
    const t = (locale: FunnelLocale) =>
      reminderPlan(input({ locale, requests: [req()] })).find((s) => s.data.type === 'clock_overdue')!.title;
    expect(t('es')).not.toBe(t('en'));
    expect(t('vi')).not.toBe(t('en'));
    expect(t('vi')).not.toBe(t('es'));
  });
});

describe('never schedule the past, and cap the count', () => {
  it('a request whose clock already lapsed weeks ago yields no future specs', () => {
    // requested_on long ago → due date and even T+1 are all behind NOW.
    const plan = reminderPlan(input({ requests: [req({ requested_on: '2025-06-01' })] }));
    expect(plan.length).toBe(0);
  });

  it('caps at MAX_SCHEDULED, keeping the soonest', () => {
    // 40 open requests → 120 candidate specs, all in the future.
    const many = Array.from({ length: 40 }, (_, i) =>
      req({ id: `r${i}`, requested_on: '2026-01-14' })
    );
    const plan = reminderPlan(input({ requests: many }));
    expect(plan.length).toBe(MAX_SCHEDULED);
    // Sorted soonest-first.
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i - 1].fireAt <= plan[i].fireAt).toBe(true);
    }
  });
});

describe('quiet hours', () => {
  it('by default a 9am fire is outside 21:00–08:00 quiet and is not shifted', () => {
    const plan = reminderPlan(input({ requests: [req()] }));
    for (const s of plan) expect(new Date(s.fireAt).getHours()).toBe(9);
  });

  it('a quiet window covering 9am pushes the fire to quietEndHour', () => {
    const plan = reminderPlan(
      input({ requests: [req()], prefs: { ...ON, quietStartHour: 8, quietEndHour: 11 } })
    );
    expect(plan.length).toBeGreaterThan(0);
    for (const s of plan) expect(new Date(s.fireAt).getHours()).toBe(11);
  });

  it('equal start/end disables quiet hours (no shift)', () => {
    const plan = reminderPlan(
      input({ requests: [req()], prefs: { ...ON, quietStartHour: 9, quietEndHour: 9 } })
    );
    for (const s of plan) expect(new Date(s.fireAt).getHours()).toBe(9);
  });
});

describe('closed/decided requests stop generating reminders', () => {
  it('a granted or withdrawn request produces nothing', () => {
    expect(reminderPlan(input({ requests: [req({ status: 'granted' })] }))).toEqual([]);
    expect(reminderPlan(input({ requests: [req({ status: 'withdrawn' })] }))).toEqual([]);
  });
});

describe('fmtDate is timezone-safe and per-locale', () => {
  it('formats a YMD without constructing a UTC-sliced Date', () => {
    expect(fmtDate('2026-09-12', 'en')).toBe('Sep 12');
    expect(fmtDate('2026-09-12', 'es')).toBe('sep 12');
    expect(fmtDate('2026-09-12', 'vi')).toBe('12 Th9');
  });
});
