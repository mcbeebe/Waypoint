import { describe, it, expect } from 'vitest';
import { addWorkingDays, clockAnchor, deadlineFor, REQUEST_LEVERS } from './requestClocks';
import { LETTER_TEMPLATES } from './lettersCatalog';

describe('deadlineFor', () => {
  const now = new Date('2026-08-23T12:00:00');

  it('computes the 30-day IPP meeting clock', () => {
    const d = deadlineFor('ipp_meeting', '2026-08-01', now);
    expect(d?.dueOn).toBe('2026-08-31');
    expect(d?.daysRemaining).toBe(8);
    expect(d?.overdue).toBe(false);
    expect(d?.citation).toBe('W&I §4646.5(b)');
  });

  it('flags an overdue 15-day assessment-plan clock', () => {
    const d = deadlineFor('iep_evaluation', '2026-08-01', now);
    expect(d?.dueOn).toBe('2026-08-16');
    expect(d?.overdue).toBe(true);
    expect(d?.daysRemaining).toBe(-7);
  });

  it('runs the RC assessment from a logged intake (W&I §4643)', () => {
    // Asked May 1, intake May 12: 120 days from intake is Sep 9.
    const d = deadlineFor('rc_assessment', '2026-05-01', now, '2026-05-12');
    expect(d?.dueOn).toBe('2026-09-09');
    expect(d?.basis).toBe('intake');
  });

  it('with no intake logged, shows the latest date the law allows — never an earlier one', () => {
    // Fri May 1 + 15 working days = Fri May 22 (latest lawful intake), + 120 = Sep 19.
    const d = deadlineFor('rc_assessment', '2026-05-01', now);
    expect(d?.dueOn).toBe('2026-09-19');
    expect(d?.basis).toBe('latest');
    // Any real intake inside the window gives a date no later than this one.
    for (const intake of ['2026-05-01', '2026-05-11', '2026-05-22']) {
      expect(deadlineFor('rc_assessment', '2026-05-01', now, intake)!.dueOn <= d!.dueOn, intake).toBe(true);
    }
  });

  it('ignores an intake date on a clock that runs from the request', () => {
    const d = deadlineFor('ipp_meeting', '2026-08-01', now, '2026-08-10');
    expect(d?.dueOn).toBe('2026-08-31');
    expect(d?.basis).toBe('request');
  });

  it('returns null honestly when no statutory clock applies', () => {
    expect(deadlineFor('service_request', '2026-08-01', now)).toBeNull();
    expect(deadlineFor('reimbursement', '2026-08-01', now)).toBeNull();
  });
});

describe('clockAnchor and addWorkingDays', () => {
  it('runs the RC assessment from intake, everything else from the ask', () => {
    expect(clockAnchor('rc_assessment')).toBe('intake');
    for (const t of ['ipp_meeting', 'iep_evaluation', 'service_request', 'other'] as const) {
      expect(clockAnchor(t), t).toBe('request');
    }
  });

  it('skips California state holidays, so the latest date is never early', () => {
    // Wed Nov 18 2026: Thanksgiving (Nov 26) and the day after don't count.
    expect(addWorkingDays('2026-11-18', 15)).toBe('2026-12-11');
    expect(deadlineFor('rc_assessment', '2026-11-18', new Date('2026-11-20T12:00:00'))?.dueOn).toBe('2027-04-10');
    // Mon Dec 14 2026: Christmas and New Year's Day don't count.
    expect(addWorkingDays('2026-12-14', 15)).toBe('2027-01-06');
    // A holiday on Saturday is observed Friday: Jul 4 2026 → Fri Jul 3.
    expect(addWorkingDays('2026-07-02', 1)).toBe('2026-07-06');
  });

  it('counts Monday to Friday only', () => {
    expect(addWorkingDays('2026-10-09', 1)).toBe('2026-10-12'); // Fri → Mon
    expect(addWorkingDays('2026-10-10', 1)).toBe('2026-10-12'); // Sat → Mon
    expect(addWorkingDays('2026-10-12', 15)).toBe('2026-11-02'); // three full weeks
  });
});

describe('REQUEST_LEVERS', () => {
  it('every lever points at a real letter template', () => {
    const keys = new Set(LETTER_TEMPLATES.map((t) => t.key));
    for (const lever of Object.values(REQUEST_LEVERS)) {
      expect(keys.has(lever.template), lever.template).toBe(true);
    }
  });
});

describe('a statutory date is a local calendar date', () => {
  it('does not shift a day on a UTC+ device', () => {
    // toISOString() on a local-midnight Date moved the due date back one day
    // east of Greenwich — a citation attached to a date the law never gave.
    const dl = deadlineFor('ipp_meeting', '2026-08-20', new Date('2026-08-29T09:00:00'))!;
    const due = new Date('2026-08-20T12:00:00');
    due.setDate(due.getDate() + 30);
    const expected = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(
      due.getDate()
    ).padStart(2, '0')}`;
    expect(dl.dueOn).toBe(expected);
  });
});
