/**
 * Your Result — the "family services" door, rendered (initiative 005, PR C).
 *
 * The RC card names "family services"; PR C makes them reachable — but only
 * when the family is enrolled (the destination presupposes an IPP). This mocks
 * the data hooks and checks both: the enrolled card carries a link that fires
 * navigate('AskForSupports'), and a not-yet-client (review/likely) card does
 * not — the state an earlier adversary pass flagged.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const state = vi.hoisted(() => ({ rcStatus: 'active' as string, hasDx: true }));
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', regional_center: 'North LA', parent_first_name: 'Mike' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', date_of_birth: '2018-05-01', rc_status: state.rcStatus, iep_status: 'active' }],
  }),
  useDiagnoses: () => ({ diagnoses: state.hasDx ? [{ id: 'd1' }] : [] }),
}));
vi.mock('@/lib/analytics', () => ({ trackFunnelStep: () => {} }));

import EligibilityResultScreen from './EligibilityResultScreen';
import { navigateCalls } from '../../../vitest.setup.ui';

describe('the Your Result RC card opens the family-supports tier — when enrolled', () => {
  it('an enrolled family sees the link and it fires navigate(AskForSupports)', () => {
    state.rcStatus = 'active'; // → RC card enrolled
    render(<EligibilityResultScreen />);
    fireEvent.click(screen.getByRole('button', { name: /family supports you can ask for/i }));
    expect(navigateCalls).toHaveLength(1);
    expect((navigateCalls[0].args as [string])[0]).toBe('AskForSupports');
  });

  it('a not-yet-client family (RC card is "likely"/"review") does NOT see the link', () => {
    state.rcStatus = 'unknown'; // → RC card likely (has dx) — not enrolled
    render(<EligibilityResultScreen />);
    expect(screen.queryByRole('button', { name: /family supports you can ask for/i })).toBeNull();
  });
});
