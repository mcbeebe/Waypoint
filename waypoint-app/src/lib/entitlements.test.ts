import { describe, it, expect } from 'vitest';
import {
  resolveEntitlement,
  gateCopy,
  FREE_FEATURES,
  FREE_NAVIGATOR_MONTHLY_LIMIT,
} from './entitlements';
import type { SponsorType, EntitlementStatus } from '@/types/database';

const NOW = new Date('2026-08-23T12:00:00Z');

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

describe('resolveEntitlement', () => {
  it('no rows = free tier', () => {
    const r = resolveEntitlement([], NOW);
    expect(r.isPremium).toBe(false);
    expect(r.sponsorLabel).toBeNull();
  });

  it('a live self subscription is Premium without a sponsor banner', () => {
    const r = resolveEntitlement([row()], NOW);
    expect(r.isPremium).toBe(true);
    expect(r.sponsorType).toBe('self');
    expect(r.sponsorLabel).toBeNull();
  });

  it('facilitation clients see the you-pay-$0 label', () => {
    const r = resolveEntitlement([row({ sponsor_type: 'facilitation' })], NOW);
    expect(r.isPremium).toBe(true);
    expect(r.sponsorLabel).toContain('$0');
    expect(r.sponsorLabel).toContain('facilitation');
  });

  it('expired, canceled, and future grants do not count', () => {
    expect(resolveEntitlement([row({ status: 'expired' })], NOW).isPremium).toBe(false);
    expect(resolveEntitlement([row({ status: 'canceled' })], NOW).isPremium).toBe(false);
    expect(
      resolveEntitlement([row({ period_end: '2026-08-01' })], NOW).isPremium
    ).toBe(false);
    expect(
      resolveEntitlement([row({ period_start: '2026-09-01' })], NOW).isPremium
    ).toBe(false);
  });

  it('a sponsored grant labels the experience even alongside a self sub', () => {
    const r = resolveEntitlement(
      [row(), row({ sponsor_type: 'facilitation' })],
      NOW
    );
    expect(r.sponsorType).toBe('facilitation');
  });
});

describe('tier copy', () => {
  it('gate copy explains value and never reads as a dead end', () => {
    const c = gateCopy('IEP document analysis');
    expect(c.body).toContain('free forever');
    expect(c.body).toContain('money-back');
  });

  it('the free feature list states the Navigator cap it enforces', () => {
    expect(FREE_FEATURES.join(' ')).toContain(String(FREE_NAVIGATOR_MONTHLY_LIMIT));
  });
});
