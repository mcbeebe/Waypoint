import { describe, it, expect } from 'vitest';
import { RC_STAGES, SCHOOL_STAGES, SDP_FORK, deriveStageIndex, sdpAvailable } from './processMap';
import { ESCALATION_RUNGS } from './escalationLadder';
import { LETTER_TEMPLATES } from './lettersCatalog';

describe('processMap', () => {
  it('places families at the right stage from rc_status', () => {
    expect(deriveStageIndex('unknown')).toBe(0);
    expect(deriveStageIndex('known')).toBe(0);
    expect(deriveStageIndex('applied')).toBe(1);
    expect(deriveStageIndex('active')).toBe(2);
    expect(deriveStageIndex(null)).toBe(0);
  });

  it('offers SDP only to active consumers', () => {
    expect(sdpAvailable('active')).toBe(true);
    expect(sdpAvailable('applied')).toBe(false);
    expect(sdpAvailable(null)).toBe(false);
  });

  it('every lever points at a real letter template', () => {
    const keys = new Set(LETTER_TEMPLATES.map((t) => t.key));
    for (const stage of [...RC_STAGES, ...SCHOOL_STAGES, SDP_FORK]) {
      if (stage.leverTemplate) {
        expect(keys.has(stage.leverTemplate), `${stage.key} → ${stage.leverTemplate}`).toBe(true);
      }
    }
    for (const rung of ESCALATION_RUNGS) {
      if (rung.leverTemplate) {
        expect(keys.has(rung.leverTemplate), `${rung.key} → ${rung.leverTemplate}`).toBe(true);
      }
    }
  });

  it('every stage states its clock honestly (never empty)', () => {
    for (const stage of [...RC_STAGES, ...SCHOOL_STAGES, SDP_FORK]) {
      expect(stage.clock.length).toBeGreaterThan(10);
      expect(stage.citation.length).toBeGreaterThan(0);
    }
  });
});
