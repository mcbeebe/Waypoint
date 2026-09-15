/**
 * SDP Journey, rendered — the nine enrollment steps each carry a receipt.
 *
 * The screen's own header comment has said "every claim carries its citation"
 * since it shipped, but the citation was grey text: a parent could read
 * "DDS D-2026-SDP-002" and had no way to reach the directive. This proves the
 * claim is now openable, and that every step's citation resolves — an
 * unregistered one would silently degrade to the old inert chip.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', date_of_birth: '2018-05-01', sdp_step: 3 }],
    updateChild: async () => true,
  }),
}));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: () => {} }) }));

import SdpJourneyScreen from './SdpJourneyScreen';
import { getSdpJourneySteps } from '@/lib/sdpJourney';
import { sourceForCitation } from '@/data/contentSources';

describe('every SDP step carries a receipt a parent can open', () => {
  it('renders one tappable citation per step — none left as inert text', () => {
    render(<SdpJourneyScreen />);
    const chips = screen.getAllByLabelText(/Why this — the source/);
    // One per step. If a citation ever loses its registry entry the chip
    // degrades to plain text and this count drops — which is the alarm.
    expect(chips).toHaveLength(getSdpJourneySteps('en').length);
  });

  it('opening one shows the authority, the claim, and when it was verified', () => {
    render(<SdpJourneyScreen />);
    fireEvent.click(screen.getAllByLabelText(/Why this — the source/)[0]);
    const src = sourceForCitation(getSdpJourneySteps('en')[0].citation)!;
    expect(screen.getByText(src.title)).toBeTruthy();
    expect(screen.getByText(/Verified /)).toBeTruthy();
    expect(screen.getByLabelText('Read the section')).toBeTruthy();
  });
});
