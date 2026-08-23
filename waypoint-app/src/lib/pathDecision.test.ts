import { describe, it, expect } from 'vitest';
import { decidePath } from './pathDecision';
import { LETTER_TEMPLATES } from './lettersCatalog';

describe('decidePath', () => {
  it('is incomplete until all three questions are answered', () => {
    expect(
      decidePath({ hasAuthorizationHistory: true, unmetNeedsDocumented: null, wantsControl: true })
        .recommendation
    ).toBe('incomplete');
  });

  it('respects a family that does not want the admin', () => {
    const r = decidePath({
      hasAuthorizationHistory: true,
      unmetNeedsDocumented: true,
      wantsControl: false,
    });
    expect(r.recommendation).toBe('stay_traditional');
  });

  it('says document-first when needs are not in the IPP — the budget-protecting advice', () => {
    const r = decidePath({
      hasAuthorizationHistory: true,
      unmetNeedsDocumented: false,
      wantsControl: true,
    });
    expect(r.recommendation).toBe('document_first');
    expect(r.leverTemplate).toBe('ipp_review_request');
  });

  it('recommends SDP when control is wanted and needs are documented', () => {
    const r = decidePath({
      hasAuthorizationHistory: false,
      unmetNeedsDocumented: true,
      wantsControl: true,
    });
    expect(r.recommendation).toBe('sdp_ready');
    expect(r.body).toContain('authorization history');
  });

  it('every lever points at a real letter template', () => {
    const keys = new Set(LETTER_TEMPLATES.map((t) => t.key));
    const combos: Array<[boolean, boolean, boolean]> = [
      [true, true, true],
      [true, false, true],
      [true, true, false],
      [false, true, true],
    ];
    for (const [a, b, c] of combos) {
      const r = decidePath({
        hasAuthorizationHistory: a,
        unmetNeedsDocumented: b,
        wantsControl: c,
      });
      if (r.leverTemplate) expect(keys.has(r.leverTemplate)).toBe(true);
    }
  });
});
