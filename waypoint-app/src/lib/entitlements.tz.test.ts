/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on.
 *
 * `period_start`/`period_end` are Postgres `date` columns — calendar days on
 * the family's own clock. Resolving them against `toISOString().slice(0, 10)`
 * ("today" in UTC) ended a grant at 5pm Pacific on its last covered day, and
 * refused a grant starting "today" until mid-morning east of Greenwich.
 */
import { describe, it, expect } from 'vitest';
import { resolveEntitlement } from './entitlements';

const grant = (period_start: string, period_end: string | null) => ({
  sponsor_type: 'self' as const,
  status: 'active' as const,
  period_start,
  period_end,
});

describe('resolveEntitlement on the local calendar', () => {
  it('a grant through local today is still premium late that evening', () => {
    // 23:30 local on Aug 1 is already Aug 2 in UTC west of Greenwich — the
    // UTC slice read `period_end >= today` as false and dropped Premium
    // seven hours early on the last day the family paid for.
    const now = new Date(2026, 7, 1, 23, 30);
    expect(resolveEntitlement([grant('2026-07-01', '2026-08-01')], now).isPremium).toBe(true);
  });

  it('a grant starting local today is premium just after local midnight', () => {
    // 00:30 local on Aug 1 is still Jul 31 in UTC east of Greenwich — the
    // UTC slice read `period_start <= today` as false and gated a family
    // whose coverage had already begun.
    const now = new Date(2026, 7, 1, 0, 30);
    expect(resolveEntitlement([grant('2026-08-01', null)], now).isPremium).toBe(true);
  });

  it('a grant that ended before local today stays expired', () => {
    // The fix must not widen the window: the day AFTER period_end is out in
    // every zone, at both edges of the local day.
    expect(
      resolveEntitlement([grant('2026-07-01', '2026-07-31')], new Date(2026, 7, 1, 0, 30)).isPremium
    ).toBe(false);
    expect(
      resolveEntitlement([grant('2026-07-01', '2026-07-31')], new Date(2026, 7, 1, 23, 30)).isPremium
    ).toBe(false);
  });
});
