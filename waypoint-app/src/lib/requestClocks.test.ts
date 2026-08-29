import { describe, it, expect } from 'vitest';
import { deadlineFor, REQUEST_LEVERS } from './requestClocks';
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

  it('computes the 120-day RC assessment clock', () => {
    const d = deadlineFor('rc_assessment', '2026-05-01', now);
    expect(d?.dueOn).toBe('2026-08-29');
    expect(d?.overdue).toBe(false);
  });

  it('returns null honestly when no statutory clock applies', () => {
    expect(deadlineFor('service_request', '2026-08-01', now)).toBeNull();
    expect(deadlineFor('reimbursement', '2026-08-01', now)).toBeNull();
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
