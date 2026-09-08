/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on.
 *
 * `generatedOn` dates the go/no-go memo. The UTC slice stamped a report run
 * in a California evening with tomorrow's date.
 */
import { describe, it, expect } from 'vitest';
import { buildEvidenceReport } from './evidenceReport';

const empty = {
  funnelEvents: [],
  serviceEvents: [],
  cases: [],
  baselines: [],
  invoices: [],
};

describe('buildEvidenceReport generatedOn', () => {
  it('is the local calendar day at both edges of the day, never the UTC slice', () => {
    // 23:30 local is already tomorrow in UTC west of Greenwich; 00:30 local
    // is still yesterday in UTC east of it. The local day is Aug 1 in both.
    expect(buildEvidenceReport(empty, new Date(2026, 7, 1, 23, 30)).generatedOn).toBe('2026-08-01');
    expect(buildEvidenceReport(empty, new Date(2026, 7, 1, 0, 30)).generatedOn).toBe('2026-08-01');
  });
});
