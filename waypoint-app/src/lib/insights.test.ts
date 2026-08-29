import { describe, it, expect } from 'vitest';
import { deriveHomeInsight } from './insights';
import type { InsightInput } from './insights';

function input(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    ageYears: 6,
    rcStatus: 'unknown',
    iepStatus: 'active',
    hasDiagnosis: true,
    childName: 'Teddy',
    ...overrides,
  };
}

describe('deriveHomeInsight', () => {
  it('active RC consumers get the SDP nudge above everything else', () => {
    const i = deriveHomeInsight(input({ rcStatus: 'active', iepStatus: 'no' }));
    expect(i?.key).toBe('sdp_path');
    expect(i?.title).toContain('Teddy');
    expect(i?.citation).toBe('W&I §4685.8');
    expect(i?.target.screen).toBe('ProcessMap');
  });

  it('an applied family is pointed at the 120-day clock', () => {
    const i = deriveHomeInsight(input({ rcStatus: 'applied' }));
    expect(i?.key).toBe('rc_clock');
    expect(i?.target.screen).toBe('RequestTracker');
    expect(i?.body).toContain('120 days');
    expect(i?.citation).toBe('W&I §4643');
  });

  it('an applied family with an under-3 child gets the 45-day Early Start clock, never 120', () => {
    const i = deriveHomeInsight(input({ rcStatus: 'applied', ageYears: 1 }));
    expect(i?.key).toBe('rc_clock');
    expect(i?.body).toContain('45 days');
    expect(i?.body).not.toContain('120');
    expect(i?.citation).toBe('34 CFR §303.310 · Early Start');
  });

  it('diagnosed but not applied → the RC entitlement', () => {
    const i = deriveHomeInsight(input({ rcStatus: 'known' }));
    expect(i?.key).toBe('rc_apply');
  });

  it('school-age without an IEP → the 15-day letter', () => {
    const i = deriveHomeInsight(input({ hasDiagnosis: false, iepStatus: 'unknown' }));
    expect(i?.key).toBe('iep_eval');
    expect(i?.target.params?.template).toBe('assessment_request');
  });

  it('nothing to notice → null, not a filler card', () => {
    expect(
      deriveHomeInsight(input({ hasDiagnosis: false, iepStatus: 'active', ageYears: 6 }))
    ).toBeNull();
  });

  it('Spanish changes prose but never the key, target, or citation', () => {
    const en = deriveHomeInsight(input({ rcStatus: 'active' }), 'en');
    const es = deriveHomeInsight(input({ rcStatus: 'active' }), 'es');
    expect(es?.key).toBe(en?.key);
    expect(es?.target).toEqual(en?.target);
    expect(es?.citation).toBe(en?.citation);
    expect(es?.title).not.toBe(en?.title);
  });
});
