import { describe, it, expect } from 'vitest';
import { deriveResourceStack, unlockGuideFor, deriveStackInsight } from './resourceStack';
import type { StackInput } from './resourceStack';
import { LETTER_TEMPLATES } from './lettersCatalog';

const BASE: StackInput = {
  ageYears: 6,
  rcStatus: 'active',
  iepStatus: 'active',
  mediCalStatus: 'unknown',
  ihssStatus: 'unknown',
  ssiStatus: 'unknown',
  sdpStep: null,
};

describe('deriveResourceStack', () => {
  it('renders six layers, foundation first', () => {
    const s = deriveResourceStack(BASE);
    expect(s.layers.map((l) => l.key)).toEqual([
      'school', 'regional_center', 'medi_cal', 'ihss', 'sdp', 'ssi',
    ]);
    expect(s.layers.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.totalCount).toBe(6);
  });

  it('the mockup family: 2 secured, Medi-Cal is the next unlock, IHSS locked by it', () => {
    const s = deriveResourceStack(BASE);
    expect(s.securedCount).toBe(2);
    expect(s.nextUnlock?.key).toBe('medi_cal');
    const ihss = s.layers.find((l) => l.key === 'ihss')!;
    expect(ihss.status).toBe('locked');
    expect(ihss.lockedBy).toBe('medi_cal');
  });

  it('securing Medi-Cal unlocks IHSS and moves the next unlock', () => {
    const s = deriveResourceStack({ ...BASE, mediCalStatus: 'active' });
    expect(s.layers.find((l) => l.key === 'ihss')!.status).toBe('available');
    expect(s.nextUnlock?.key).toBe('ihss');
  });

  it('SDP is locked without an active RC, in progress mid-journey, secured at step 8', () => {
    const locked = deriveResourceStack({ ...BASE, rcStatus: 'applied' });
    const sdpLocked = locked.layers.find((l) => l.key === 'sdp')!;
    expect(sdpLocked.status).toBe('locked');
    expect(sdpLocked.lockedBy).toBe('regional_center');
    expect(
      deriveResourceStack({ ...BASE, sdpStep: 3 }).layers.find((l) => l.key === 'sdp')!.status
    ).toBe('in_progress');
    expect(
      deriveResourceStack({ ...BASE, sdpStep: 8 }).layers.find((l) => l.key === 'sdp')!.status
    ).toBe('secured');
  });

  it('SSI is later for a child, available at 18, honest about the income flip', () => {
    const child = deriveResourceStack(BASE);
    expect(child.layers.find((l) => l.key === 'ssi')!.status).toBe('later');
    const adult = deriveResourceStack({ ...BASE, ageYears: 18 });
    expect(adult.layers.find((l) => l.key === 'ssi')!.status).toBe('available');
    expect(child.layers.find((l) => l.key === 'ssi')!.gets).toContain('month after');
  });

  it('school reads from IEP status and respects the 3–22 window', () => {
    expect(
      deriveResourceStack({ ...BASE, iepStatus: 'no' }).layers.find((l) => l.key === 'school')!
        .status
    ).toBe('available');
    expect(
      deriveResourceStack({ ...BASE, ageYears: 1, iepStatus: 'no' }).layers.find(
        (l) => l.key === 'school'
      )!.status
    ).toBe('later');
  });

  it('missing self-reported statuses derive like none — invite action, never assume', () => {
    const bare = deriveResourceStack({ ageYears: 6, rcStatus: 'active', iepStatus: 'active' });
    expect(bare.layers.find((l) => l.key === 'medi_cal')!.status).toBe('available');
  });

  it('a tracked deeming request reads as Medi-Cal in progress', () => {
    const s = deriveResourceStack({ ...BASE, mediCalRequested: true });
    expect(s.layers.find((l) => l.key === 'medi_cal')!.status).toBe('in_progress');
    expect(s.nextUnlock?.key).not.toBe('medi_cal');
    // Explicit statuses always win over the request signal.
    expect(
      deriveResourceStack({ ...BASE, mediCalStatus: 'active', mediCalRequested: true }).layers.find(
        (l) => l.key === 'medi_cal'
      )!.status
    ).toBe('secured');
  });

  it('every layer carries a citation and a status label', () => {
    for (const l of deriveResourceStack(BASE).layers) {
      expect(l.citation.length, l.key).toBeGreaterThan(0);
      expect(l.statusLabel.length, l.key).toBeGreaterThan(0);
    }
  });
});

describe('unlockGuideFor', () => {
  it('deep-dive guides exist for Medi-Cal and IHSS; other layers get none', () => {
    expect(unlockGuideFor('medi_cal', 'en', 'Leo')).not.toBeNull();
    expect(unlockGuideFor('ihss')).not.toBeNull();
    expect(unlockGuideFor('school')).toBeNull();
    expect(unlockGuideFor('ssi')).toBeNull();
  });

  it('guide lever templates exist in the letters catalog', () => {
    const known = new Set(LETTER_TEMPLATES.map((t) => t.key));
    for (const key of ['medi_cal', 'ihss'] as const) {
      expect(known.has(unlockGuideFor(key)!.leverTemplate), key).toBe(true);
    }
  });

  it('the Medi-Cal guide teaches the by-name ask and names the child', () => {
    const g = unlockGuideFor('medi_cal', 'en', 'Leo')!;
    expect(g.tip).toContain('institutional deeming');
    expect(g.what).toContain('Leo');
    expect(g.leverTemplate).toBe('medi_cal_deeming');
  });
});

describe('deriveStackInsight', () => {
  it('renders for the mockup family: Medi-Cal is the fastest unlock', () => {
    const i = deriveStackInsight(BASE, 'en', 'Leo')!;
    expect(i).not.toBeNull();
    expect(i.guide.layerKey).toBe('medi_cal');
    expect(i.title).toContain('2 of 6');
    expect(i.title).toContain('Leo');
    expect(i.bars).toHaveLength(6);
    expect(i.bars.filter((b) => b.status === 'secured')).toHaveLength(2);
  });

  it('moves to IHSS once Medi-Cal is secured', () => {
    const i = deriveStackInsight({ ...BASE, mediCalStatus: 'active' }, 'en', 'Leo')!;
    expect(i.guide.layerKey).toBe('ihss');
  });

  it('stays quiet when the next unlock has no deep-dive guide', () => {
    // IEP missing → next unlock is school, whose lever is a whole flow.
    expect(deriveStackInsight({ ...BASE, iepStatus: 'no' })).toBeNull();
    // Everything secured → nothing to say.
    expect(
      deriveStackInsight({
        ...BASE,
        mediCalStatus: 'active',
        ihssStatus: 'active',
        sdpStep: 8,
        ssiStatus: 'active',
      })
    ).toBeNull();
  });
});
