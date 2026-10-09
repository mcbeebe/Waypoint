/**
 * A template's legal clock runs against the agency it addresses. On
 * 2026-10-07 a note to a provider, routed through the IPP template, opened a
 * 30-day Regional Center clock for a request nobody made. These pin when a
 * send counts as reaching its template's system — and that a mismatch is put
 * to the parent as a question, never decided silently either way.
 */
import { describe, it, expect } from 'vitest';
import { reachesTemplateSystem, clockCheckCopy, ORG_BY_TEMPLATE } from './letterSystems';

describe('reachesTemplateSystem', () => {
  it('a Regional Center request reaches only the Regional Center', () => {
    expect(reachesTemplateSystem('ipp_review_request', 'regional_center')).toBe(true);
    for (const org of ['medical', 'school', 'insurance', 'other'] as const) {
      expect(reachesTemplateSystem('ipp_review_request', org)).toBe(false);
    }
  });

  it('a school request reaches only the school', () => {
    expect(reachesTemplateSystem('assessment_request', 'school')).toBe(true);
    expect(reachesTemplateSystem('assessment_request', 'regional_center')).toBe(false);
  });

  it('a records request reaches either system — and nothing else', () => {
    expect(reachesTemplateSystem('records_request', 'school')).toBe(true);
    expect(reachesTemplateSystem('records_request', 'regional_center')).toBe(true);
    expect(reachesTemplateSystem('records_request', 'medical')).toBe(false);
  });

  it('an unknown recipient (a typed address) is not second-guessed', () => {
    // Nothing contradicts the letter's own wording — this is how every send
    // behaved before the check existed.
    expect(reachesTemplateSystem('ipp_review_request', null)).toBe(true);
    expect(reachesTemplateSystem('ipp_review_request', undefined)).toBe(true);
  });

  it('a letter with no system of its own never mismatches', () => {
    expect(reachesTemplateSystem('general', 'medical')).toBe(true);
    expect(reachesTemplateSystem('complaint', 'school')).toBe(true);
    expect(reachesTemplateSystem('no_such_template', 'school')).toBe(true);
  });

  it('every template the Letters catalog sends has a system', () => {
    // A template missing here would silently skip the check.
    for (const key of ['ipp_review_request', 'noa_request', 'rc_timeline_followup', 'sdp_info_request',
      'medi_cal_deeming', 'ipp_need_request', 'delivery_plan_request', 'assessment_request',
      'progress_data_request', 'records_request']) {
      expect(ORG_BY_TEMPLATE[key]).toBeTruthy();
    }
  });
});

describe('clockCheckCopy', () => {
  it('says what the letter is and where it went — and asks', () => {
    const c = clockCheckCopy('ipp_review_request', 'Dana Whitfield', 'medical');
    expect(c.question).toBe('Did this go to the Regional Center?');
    expect(c.explain).toContain('went to Dana Whitfield, saved in your contacts under Medical');
    expect(c.explain).toContain('only when the request reaches the Regional Center');
  });

  it('names the right system', () => {
    expect(clockCheckCopy('assessment_request', 'Pat', 'medical').question).toBe(
      'Did this go to the school district?'
    );
    expect(clockCheckCopy('records_request', 'Pat', 'medical').question).toBe(
      'Did this go to the Regional Center or the school district?'
    );
  });

  it('never says anyone did anything wrong (escalation tone rule)', () => {
    const c = clockCheckCopy('ipp_review_request', 'Dana Whitfield', 'medical');
    const all = Object.values(c).join(' ');
    expect(all).not.toMatch(/\b(wrong|mistake|error|failed|misrouted)\b/i);
  });

  it('speaks the family’s language, with the contact form’s own organization names', () => {
    const es = clockCheckCopy('ipp_review_request', 'Dana', 'medical', 'es');
    expect(es.question).toBe('¿Esto fue al Centro Regional?');
    expect(es.explain).toContain('una solicitud al Centro Regional');
    expect(es.explain).not.toMatch(/\ba el\b/); // "a" + "el" contracts to "al"
    expect(es.explain).toContain('Médico');
    expect(clockCheckCopy('ipp_review_request', 'Dana', 'school', 'vi').explain).toContain('Trường học');
  });
});
