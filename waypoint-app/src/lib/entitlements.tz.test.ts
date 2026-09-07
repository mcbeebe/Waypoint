/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on.
 *
 * `resolveEntitlement` deliberately compares on the UTC day, unlike the rest
 * of the app: the only production writer of these rows (stripe-webhook) and
 * the server-side enforcer (ai-proxy) both stamp and compare the server's
 * UTC day. Moving the client alone to the local calendar would lock a family
 * out of what they just bought until local midnight — a purchase in a
 * California evening gets `period_start` = UTC-tomorrow. So the pin here is
 * DEVICE-INVARIANCE: one instant resolves the same on every device clock.
 */
import { describe, it, expect } from 'vitest';
import { resolveEntitlement } from './entitlements';

const grant = (period_start: string, period_end: string | null) => ({
  sponsor_type: 'self' as const,
  status: 'active' as const,
  period_start,
  period_end,
});

// 2026-08-02T03:00Z is Aug 1, 8:00pm in California and Aug 2, 10:00am in
// Vietnam — an instant whose LOCAL day differs by suite, so any drift onto
// the device calendar fails one project.
const INSTANT = new Date('2026-08-02T03:00:00Z');

describe('resolveEntitlement stays on the writer’s (UTC) calendar', () => {
  it('a grant starting on the UTC day of purchase is live immediately, in every zone', () => {
    // The paid-lockout scenario: subscribe at 8pm Pacific, webhook writes
    // period_start '2026-08-02'. A local-day compare would say "not started
    // yet" until midnight; the UTC compare says Premium now.
    expect(resolveEntitlement([grant('2026-08-02', null)], INSTANT).isPremium).toBe(true);
  });

  it('a grant through the previous UTC day is expired at the same instant, in every zone', () => {
    expect(resolveEntitlement([grant('2026-07-01', '2026-08-01')], INSTANT).isPremium).toBe(false);
  });
});
