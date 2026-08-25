import { describe, it, expect } from 'vitest';
import {
  getSdpJourneySteps,
  deriveSdpJourney,
  SDP_JOURNEY_TOTAL,
} from './sdpJourney';
import { LETTER_TEMPLATES } from './lettersCatalog';

describe('getSdpJourneySteps', () => {
  const steps = getSdpJourneySteps('en');

  it('renders nine cards numbered 0–8 with no gaps', () => {
    expect(steps.map((s) => s.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(SDP_JOURNEY_TOTAL).toBe(8);
  });

  it('every lever template exists in the letters catalog', () => {
    const known = new Set(LETTER_TEMPLATES.map((t) => t.key));
    for (const s of steps) {
      if (s.leverTemplate) expect(known.has(s.leverTemplate), s.key).toBe(true);
    }
  });

  it('the directive-defined mechanics are first-class', () => {
    const orientation = steps.find((s) => s.key === 'orientation')!;
    expect(orientation.checklist).toHaveLength(2);
    expect(orientation.citation).toContain('D-2026-SDP-002');
    expect(orientation.body).toContain('SCDD');
    const certs = steps.find((s) => s.key === 'certificates')!;
    expect(certs.checklist).toHaveLength(4);
    expect(certs.leverTemplate).toBe('sdp_info_request');
  });

  it('step 0 teaches the budget basis before anything else', () => {
    expect(steps[0].key).toBe('fix_ipp');
    expect(steps[0].body).toContain('12 months');
    expect(steps[0].leverTemplate).toBe('ipp_review_request');
  });
});

describe('deriveSdpJourney', () => {
  it('null means not started: step 0 is current, nothing done', () => {
    const j = deriveSdpJourney(null);
    expect(j.currentIndex).toBe(0);
    expect(j.progressPct).toBe(0);
    expect(j.steps.filter((s) => s.status === 'done')).toHaveLength(0);
  });

  it('mid-journey: earlier steps done, one current, rest upcoming', () => {
    const j = deriveSdpJourney(2);
    expect(j.steps.map((s) => s.status)).toEqual([
      'done', 'done', 'current', 'upcoming', 'upcoming',
      'upcoming', 'upcoming', 'upcoming', 'upcoming',
    ]);
    expect(j.progressPct).toBe(25);
  });

  it('complete: all done, progress 100', () => {
    const j = deriveSdpJourney(8);
    expect(j.steps.filter((s) => s.status === 'done')).toHaveLength(8);
    expect(j.steps[8].status).toBe('current');
    expect(j.progressPct).toBe(100);
  });

  it('clamps out-of-range data instead of rendering an impossible journey', () => {
    expect(deriveSdpJourney(-3).currentIndex).toBe(0);
    expect(deriveSdpJourney(99).progressPct).toBe(100);
  });
});
