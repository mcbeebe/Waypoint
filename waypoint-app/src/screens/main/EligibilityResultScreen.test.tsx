/**
 * Your Result — the "family services" door, rendered (initiative 005, PR C).
 *
 * The RC card names "family services"; PR C makes them reachable. This mocks
 * the data hooks so the screen renders, and proves the RC card carries a link
 * that fires navigate('AskForSupports') — the promise now keeps its word.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', regional_center: 'North LA', parent_first_name: 'Mike' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', date_of_birth: '2018-05-01', rc_status: 'active', iep_status: 'active' }],
  }),
  useDiagnoses: () => ({ diagnoses: [{ id: 'd1' }] }),
}));
vi.mock('@/lib/analytics', () => ({ trackFunnelStep: () => {} }));

import EligibilityResultScreen from './EligibilityResultScreen';
import { navigateCalls } from '../../../vitest.setup.ui';

describe('the Your Result RC card opens the family-supports tier', () => {
  it('shows the family-supports link and fires navigate(AskForSupports)', () => {
    render(<EligibilityResultScreen />);
    const link = screen.getByRole('button', { name: /family supports you can ask for/i });
    fireEvent.click(link);
    expect(navigateCalls).toHaveLength(1);
    expect((navigateCalls[0].args as [string])[0]).toBe('AskForSupports');
  });
});
