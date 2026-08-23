import { describe, it, expect } from 'vitest';
import { buildEvidenceReport, renderEvidenceHtml } from './evidenceReport';
import type { EvidenceInputs } from './evidenceReport';

const NOW = new Date('2026-08-23T12:00:00Z');

function inputs(overrides: Partial<EvidenceInputs> = {}): EvidenceInputs {
  return {
    funnelEvents: [
      { family_id: 'f1', step: 'registered', source: 'facebook', language: 'es' },
      { family_id: 'f2', step: 'registered', source: 'facebook', language: 'en' },
      { family_id: 'f3', step: 'registered', source: null, language: 'en' },
      { family_id: 'f1', step: 'booking_completed', source: 'facebook', language: 'es' },
      // duplicate events for the same family must not double-count
      { family_id: 'f1', step: 'registered', source: 'facebook', language: 'es' },
    ],
    serviceEvents: [
      { family_id: 'f1', case_id: 'c1', minutes: 120 },
      { family_id: 'f1', case_id: 'c1', minutes: 60 },
      { family_id: 'f2', case_id: null, minutes: 30 },
    ],
    cases: [
      { id: 'c1', stage: 'active', agreed_annual_price_cents: 240000 },
      { id: 'c2', stage: 'pcp', agreed_annual_price_cents: null },
    ],
    baselines: [
      { case_id: 'c1', kind: 'baseline', coordination_hours_per_week: 10, caregiver_strain: 4 },
      { case_id: 'c1', kind: '6mo', coordination_hours_per_week: 4, caregiver_strain: 2 },
      // baseline without a re-measure contributes nothing yet
      { case_id: 'c2', kind: 'baseline', coordination_hours_per_week: 8, caregiver_strain: 5 },
    ],
    invoices: [
      { status: 'paid', payer_type: 'fms', total_cents: 240000 },
      { status: 'submitted', payer_type: 'regional_center', total_cents: 100000 },
      { status: 'draft', payer_type: 'fms', total_cents: 99999 },
    ],
    ...overrides,
  };
}

describe('buildEvidenceReport', () => {
  it('computes the four kill-criteria numbers with honest n-counts', () => {
    const r = buildEvidenceReport(inputs(), NOW);
    expect(r.pipelineValueCents).toBe(240000);
    expect(r.invoicedCents).toBe(340000); // paid + submitted, never drafts
    expect(r.paidCents).toBe(240000);
    expect(r.paidInvoiceCount).toBe(1);
    expect(r.hoursPerFamily).toBe(1.8); // (180 + 30) / 2 families / 60
    expect(r.familiesWithTime).toBe(2);
    expect(r.registered).toBe(3); // f1 deduped
    expect(r.booked).toBe(1);
  });

  it('verdicts follow the gates and admit insufficient data', () => {
    const r = buildEvidenceReport(inputs(), NOW);
    expect(r.conversion).toBeCloseTo(1 / 3);
    expect(r.funnelVerdict).toBe('pass'); // 33% ≥ 3%
    expect(r.hoursVerdict).toBe('pass'); // 1.8h ≤ 30h
    expect(r.paidInvoiceVerdict).toBe('pass');

    const empty = buildEvidenceReport(
      inputs({ funnelEvents: [], serviceEvents: [], invoices: [] }),
      NOW
    );
    expect(empty.funnelVerdict).toBeNull();
    expect(empty.hoursVerdict).toBeNull();
    expect(empty.paidInvoiceVerdict).toBe('fail'); // no paid invoice is a real fail
  });

  it('cuts the funnel by source and language, largest first, null labeled honestly', () => {
    const r = buildEvidenceReport(inputs(), NOW);
    expect(r.funnelBySource[0]).toEqual({
      label: 'facebook', registered: 2, booked: 1, conversion: 0.5,
    });
    expect(r.funnelBySource.map((c) => c.label)).toContain('(not set)');
    const esCut = r.funnelByLanguage.find((c) => c.label === 'es');
    expect(esCut?.conversion).toBe(1);
  });

  it('outcomes pair baseline with the latest re-measure per case only', () => {
    const r = buildEvidenceReport(inputs(), NOW);
    expect(r.outcomes.n).toBe(1); // c2 has no re-measure yet
    expect(r.outcomes.avgCoordinationBefore).toBe(10);
    expect(r.outcomes.avgCoordinationAfter).toBe(4);
    expect(r.outcomes.avgStrainBefore).toBe(4);
    expect(r.outcomes.avgStrainAfter).toBe(2);
  });

  it('hours-by-stage only counts case-attributed time', () => {
    const r = buildEvidenceReport(inputs(), NOW);
    expect(r.hoursByStage).toEqual([{ stage: 'active', cases: 1, avgHours: 3 }]);
  });
});

describe('renderEvidenceHtml', () => {
  it('renders a self-contained document with verdicts and n-counts', () => {
    const html = renderEvidenceHtml(buildEvidenceReport(inputs(), NOW));
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('PASS');
    expect(html).toContain('n=1'); // paid invoice count
    expect(html).toContain('facebook');
    expect(html).not.toContain('undefined');
  });

  it('escapes injected labels', () => {
    const html = renderEvidenceHtml(
      buildEvidenceReport(
        inputs({
          funnelEvents: [
            { family_id: 'f1', step: 'registered', source: '<script>x</script>', language: 'en' },
          ],
        }),
        NOW
      )
    );
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
