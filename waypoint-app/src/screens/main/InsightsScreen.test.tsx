/**
 * `period_end` is a Postgres `date`. Read as UTC midnight it renders the
 * previous day in any negative-offset zone — "Updated 7/31/2026" under a
 * period that ended Aug 1 — which is the same class of bug as the deadline
 * chip, on a screen that had no test at all. The screen reads it through
 * `parseDateLocal`; this pins that it keeps doing so.
 *
 * The ui project runs at America/Los_Angeles (asserted in vitest.setup.ui.tsx),
 * which is what gives this teeth: at an ambient UTC it would pass against the
 * naive parse too.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', regional_center: 'Westside RC' } }),
}));

vi.mock('@/lib/analytics', () => ({
  getInsightsForRC: async () => [
    {
      insightType: 'rc_success_rate',
      dimension: 'Westside RC',
      metricValue: 82,
      sampleSize: 40,
      periodStart: '2026-07-01',
      periodEnd: '2026-08-01',
      metadata: {},
    },
  ],
  getTrendingStrategies: async () => [],
}));

import InsightsScreen from './InsightsScreen';

describe('the insight card dates its data on the day the row names', () => {
  it('shows period_end as Aug 1, not the previous UTC evening', async () => {
    render(<InsightsScreen />);
    const sample = await screen.findByText(/Based on 40 families/);
    // Computed, not hardcoded: the screen formats with the runtime's default
    // locale, so a literal "8/1/2026" would couple this test to en-US. The
    // local-midnight Date is exactly what parseDateLocal returns for a
    // date-only string; `new Date('2026-08-01')` — the bug — is not.
    expect(sample.textContent).toContain(new Date(2026, 7, 1).toLocaleDateString());
  });
});
