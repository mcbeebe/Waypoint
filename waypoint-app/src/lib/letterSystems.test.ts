/**
 * A template's legal clock runs against the agency it addresses. On
 * 2026-10-07 a note to a provider, routed through the IPP template, opened a
 * 30-day Regional Center clock for a request nobody made. These pin when a
 * letter counts as reaching its template's system, and the question put to
 * the parent when it doesn't — asked, never decided silently either way.
 */
import { describe, it, expect } from 'vitest';
import {
  reachesTemplateSystem,
  anyReachesTemplateSystem,
  clockCheckCopy,
  ORG_BY_TEMPLATE,
} from './letterSystems';
import { LETTER_TEMPLATES } from './lettersCatalog';
import { sentNextFor } from './sentNext';

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
    expect(reachesTemplateSystem('ipp_review_request', null)).toBe(true);
    expect(reachesTemplateSystem('ipp_review_request', undefined)).toBe(true);
  });

  it('a letter with no system of its own never mismatches', () => {
    expect(reachesTemplateSystem('general', 'medical')).toBe(true);
    expect(reachesTemplateSystem('complaint', 'school')).toBe(true);
    expect(reachesTemplateSystem('no_such_template', 'school')).toBe(true);
  });
});

describe('anyReachesTemplateSystem', () => {
  it('a copied Service Coordinator puts the request in the Regional Center’s hands', () => {
    expect(anyReachesTemplateSystem('ipp_review_request', 'medical', ['regional_center'])).toBe(true);
  });

  it('a copied person of unknown organization proves nothing', () => {
    expect(anyReachesTemplateSystem('ipp_review_request', 'medical', [null, undefined])).toBe(false);
    expect(anyReachesTemplateSystem('ipp_review_request', 'medical', ['school'])).toBe(false);
  });
});

describe('every template that tracks a request', () => {
  // Derived from the catalog, so a new tracked template cannot silently skip
  // the check by missing from ORG_BY_TEMPLATE.
  const tracked = LETTER_TEMPLATES.map((t) => t.key).filter((key) => sentNextFor(key)?.track);

  it('is covered', () => {
    expect(tracked.length).toBeGreaterThan(5);
  });

  for (const key of tracked) {
    it(`${key} names the system it writes to, and can ask about it`, () => {
      expect(['regional_center', 'school']).toContain(ORG_BY_TEMPLATE[key]);
      expect(clockCheckCopy(key, 'Dana Whitfield', 'medical', null)).not.toBeNull();
    });
  }
});

describe('clockCheckCopy', () => {
  it('says what the letter is and where it is going — and asks', () => {
    const c = clockCheckCopy('ipp_review_request', 'Dana Whitfield', 'medical', 30)!;
    expect(c.question).toBe('Is this a request to the Regional Center?');
    expect(c.explain).toContain('addressed to Dana Whitfield, saved in your contacts under “Medical”');
    expect(c.yes).toBe('Yes — track the 30-day deadline');
  });

  it('promises a deadline only when the request has one', () => {
    expect(clockCheckCopy('records_request', 'Dana', 'medical', null)!.yes).toBe('Yes — track it');
  });

  it('names the right system', () => {
    expect(clockCheckCopy('assessment_request', 'Pat', 'medical', null)!.question).toBe(
      'Is this a request to the school district?'
    );
    expect(clockCheckCopy('records_request', 'Pat', 'medical', null)!.question).toBe(
      'Is this a request to the Regional Center or the school district?'
    );
  });

  it('asks nothing rather than naming the wrong agency', () => {
    expect(clockCheckCopy('appeal_letter', 'Pat', 'medical', null)).toBeNull();
    expect(clockCheckCopy('general', 'Pat', 'medical', null)).toBeNull();
  });

  it('never says anyone did anything wrong, in any language (escalation tone rule)', () => {
    for (const locale of ['en', 'es', 'vi'] as const) {
      const all = Object.values(clockCheckCopy('ipp_review_request', 'Dana', 'medical', 30, locale)!).join(' ');
      expect(all).not.toMatch(/\b(wrong|mistake|error|failed|misrouted|equivoc|culpa)\w*/i);
      expect(all).not.toMatch(/\bsai\b|\blỗi\b/);
    }
  });

  it('speaks the family’s language, with the contact form’s own organization names', () => {
    const es = clockCheckCopy('ipp_review_request', 'Dana', 'medical', 30, 'es')!;
    expect(es.question).toBe('¿Es esta una solicitud al Centro Regional?');
    expect(es.explain).toContain('en la categoría «Médico»');
    expect(es.explain).not.toMatch(/\ba el\b/); // "a" + "el" contracts to "al"
    expect(es.noClock).toMatch(/^Guardada/); // la carta
    expect(clockCheckCopy('ipp_review_request', 'Dana', 'school', null, 'vi')!.explain).toContain('Trường học');
  });
});
