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
import { sourcesForCitation } from '@/data/contentSources';

describe('every SDP step carries a receipt a parent can open', () => {
  it('renders one tappable citation per step — none left as inert text', () => {
    render(<SdpJourneyScreen />);
    const chips = screen.getAllByLabelText(/Why this — the source/);
    // One per step. If a citation ever loses its registry entry the chip
    // degrades to plain text and this count drops — which is the alarm.
    expect(chips).toHaveLength(getSdpJourneySteps('en').length);
  });

  it('opening step 0 shows BOTH sections it cites, each with its own claim', () => {
    // Step 0 cites "W&I §4685.8 · §4646.5(b)" beside the 30-day IPP-meeting
    // right — a rule that lives in §4646.5. Showing only §4685.8 would have
    // sent a parent to a section that does not contain their deadline.
    const citation = getSdpJourneySteps('en')[0].citation;
    const sources = sourcesForCitation(citation);
    expect(sources.length).toBe(2);

    render(<SdpJourneyScreen />);
    fireEvent.click(screen.getAllByLabelText(/Why this — the source/)[0]);

    for (const src of sources) {
      expect(screen.getByText(src.title), src.key).toBeTruthy();
      expect(screen.getByText(src.claim), src.key).toBeTruthy();
      expect(screen.getByLabelText(`Read the section — ${src.title}`), src.key).toBeTruthy();
    }
    expect(screen.getByText(/within 30 days/)).toBeTruthy();
    expect(screen.getAllByText(/Verified /)).toHaveLength(2);
  });
});
