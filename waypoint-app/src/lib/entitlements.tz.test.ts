import { describe, it, expect } from 'vitest';
import { resolveEntitlement } from './entitlements';
import type { SponsorType, EntitlementStatus } from '@/types/database';

/**
 * Runs in BOTH tz projects (Asia/Ho_Chi_Minh and America/Los_Angeles), so
 * every `now` is built with the local-time Date constructor — the local
 * calendar day is then the same in both zones while the UTC day differs.
 * West catches Premium dropped early (UTC flips ahead at 5pm PDT); east
 * catches Premium granted late on the start day and held past local
 * midnight at the end.
 *
 * The contract is asymmetric on purpose (see resolveEntitlement): a period
 * ENDS on the family's local day, but a row counts as STARTED on either
 * the local or the UTC day — the writers (stripe-webhook, the column's
 * current_date default) stamp the UTC day, and a family that pays at
 * 5:30pm PDT must not wait until midnight for Premium.
 */

function row(overrides: Partial<{
  sponsor_type: SponsorType;
  status: EntitlementStatus;
  period_start: string;
  period_end: string | null;
}> = {}) {
  return {
    sponsor_type: 'self' as SponsorType,
    status: 'active' as EntitlementStatus,
    period_start: '2026-01-01',
    period_end: null,
    ...overrides,
  };
}

describe('resolveEntitlement uses the local calendar day', () => {
  it('a subscriber is still Premium at 5pm local on the expiry day', () => {
    const fivePmOnExpiryDay = new Date(2026, 8, 30, 17, 0, 0);
    const r = resolveEntitlement([row({ period_end: '2026-09-30' })], fivePmOnExpiryDay);
    expect(r.isPremium).toBe(true);
  });

  it('a subscriber is still Premium at 11:59pm local on the expiry day', () => {
    const lastMinute = new Date(2026, 8, 30, 23, 59, 0);
    const r = resolveEntitlement([row({ period_end: '2026-09-30' })], lastMinute);
    expect(r.isPremium).toBe(true);
  });

  it('Premium ends at local midnight after the expiry day, not the UTC one', () => {
    const justPastMidnight = new Date(2026, 9, 1, 0, 1, 0);
    const r = resolveEntitlement([row({ period_end: '2026-09-30' })], justPastMidnight);
    expect(r.isPremium).toBe(false);
  });

  it('a grant starting today is live from local morning, not the UTC day', () => {
    const earlyOnStartDay = new Date(2026, 8, 1, 6, 0, 0);
    const r = resolveEntitlement([row({ period_start: '2026-09-01' })], earlyOnStartDay);
    expect(r.isPremium).toBe(true);
  });

  it('a subscription bought this evening is Premium immediately, even though the webhook stamps the UTC day', () => {
    const eveningPurchase = new Date(2026, 8, 1, 17, 30, 0);
    // What stripe-webhook writes for a purchase at this instant.
    const stampedStart = eveningPurchase.toISOString().slice(0, 10);
    const r = resolveEntitlement([row({ period_start: stampedStart })], eveningPurchase);
    expect(r.isPremium).toBe(true);
  });

  it('a grant starting well in the future is not live tonight', () => {
    const tonight = new Date(2026, 8, 1, 17, 30, 0);
    const r = resolveEntitlement([row({ period_start: '2026-09-03' })], tonight);
    expect(r.isPremium).toBe(false);
  });
});
