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
import { deriveEligibility } from '@/lib/eligibility';

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

describe('each result card carries a receipt, without hiding the date', () => {
  it('the citation opens its source', () => {
    state.rcStatus = 'active';
    render(<EligibilityResultScreen />);
    // One per card. `> 0` would have passed with three of the four cards
    // silently degraded to inert text.
    const chips = screen.getAllByLabelText(/Why this — the source/);
    expect(chips).toHaveLength(
      deriveEligibility(
        { ageYears: 8, rcStatus: 'active', iepStatus: 'active', hasDiagnosis: true },
        'en'
      ).cards.length
    );
    fireEvent.click(chips[0]);
    expect(screen.getAllByLabelText(/^Read the section — /).length).toBeGreaterThan(0);
  });

  it('keeps the reviewed date on the face of the card, in the sheet\u2019s own format', () => {
    // The hero promises "the date we last checked it" — so the date must stay
    // visible, not retreat behind the tap that now opens the source. And it
    // reads the same on the face as inside: `reviewed Aug 23, 2026`, not an
    // ISO string the reader has to reconcile with `Verified Aug 23, 2026`.
    state.rcStatus = 'active';
    render(<EligibilityResultScreen />);
    expect(screen.getAllByText(/reviewed Aug 23, 2026/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/reviewed 2026-08-23/)).toBeNull();
  });

  it('speaks the date as part of the citation, not as a loose fragment', () => {
    state.rcStatus = 'active';
    render(<EligibilityResultScreen />);
    // The chip carries the date in its own label, so VoiceOver's swipe order
    // never yields a bare "reviewed Aug 23, 2026" with no antecedent.
    expect(
      screen.getAllByLabelText(/Why this — the source/)[0].getAttribute('aria-label')
    ).toMatch(/reviewed Aug 23, 2026\. Why this/);
  });
});
