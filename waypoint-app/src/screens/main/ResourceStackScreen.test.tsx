/**
 * Resource Stack — the RC-layer door, rendered (initiative 005, PR C).
 *
 * The RC layer names "family services"; PR C adds a "See what to ask for" door
 * to the supports tier — but ONLY once the family is a Regional Center client
 * (the destination presupposes an IPP). This mocks the data hooks and checks
 * both: the door renders and fires when RC is active, and is absent when the
 * family isn't a client yet (the state an earlier adversary pass flagged).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const state = vi.hoisted(() => ({ rcStatus: 'active' as string }));
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', date_of_birth: '2018-05-01', rc_status: state.rcStatus }],
    updateChild: async () => true,
  }),
}));
vi.mock('@/hooks/useRequests', () => ({ useRequests: () => ({ requests: [] }) }));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: () => {} }) }));

import ResourceStackScreen from './ResourceStackScreen';
import { navigateCalls } from '../../../vitest.setup.ui';
import { deriveResourceStack } from '@/lib/resourceStack';

describe('the Resource Stack RC layer opens the family-supports tier — when a client', () => {
  it('an RC client sees the door, and it fires AskForSupports alone (no double-nav)', () => {
    state.rcStatus = 'active'; // → RC layer secured
    render(<ResourceStackScreen />);
    fireEvent.click(screen.getByRole('button', { name: /what to ask for/i }));
    // stopPropagation must keep the card's own lever (ProcessMap) from also firing.
    expect(navigateCalls).toHaveLength(1);
    expect((navigateCalls[0].args as [string])[0]).toBe('AskForSupports');
  });

  it('a family that has not applied to RC does NOT see the door', () => {
    state.rcStatus = 'unknown'; // → RC layer available, not a client
    render(<ResourceStackScreen />);
    expect(screen.queryByRole('button', { name: /what to ask for/i })).toBeNull();
  });

  it('a family mid-application (applied, no IPP yet) does NOT see the door', () => {
    state.rcStatus = 'applied'; // → RC layer in_progress, still no IPP
    render(<ResourceStackScreen />);
    expect(screen.queryByRole('button', { name: /what to ask for/i })).toBeNull();
  });
});

describe('each layer carries a tappable receipt', () => {
  it('the citation opens its source and does NOT also fire the card it sits inside', () => {
    state.rcStatus = 'active';
    render(<ResourceStackScreen />);

    // Every layer's citation is registered, so every one is a button rather
    // than the grey text it used to be.
    const chips = screen.getAllByLabelText(/Why this — the source/);
    // One per layer — if a citation ever loses its registry entry the chip
    // degrades to plain text and this count drops, which is the alarm.
    expect(chips).toHaveLength(
      deriveResourceStack({ ageYears: 8, rcStatus: 'active', iepStatus: 'active' }, 'en').layers
        .length
    );

    // NOT chips[0]: cards render top-down reversed, so that is the SSI layer,
    // which derives to 'later' for an 8-year-old and renders DISABLED. Asserting
    // "no navigation" against an inert card proves nothing. The RC layer's card
    // is live (its press opens ProcessMap), so it is the one that can fail.
    const rcChip = chips.find((c) =>
      (c.getAttribute('aria-label') ?? '').includes('Lanterman')
    );
    expect(rcChip, 'the RC layer chip must be on screen').toBeTruthy();
    fireEvent.click(rcChip!);
    // The sheet is open: the authority, and a link to read it.
    expect(screen.getAllByLabelText(/^Read the section — /).length).toBeGreaterThan(0);
    // And nothing navigated. The chip sits INSIDE a Pressable card whose own
    // press opens that layer's lever, so a parent reaching for their receipt
    // must not be carried off to a letter draft instead.
    expect(navigateCalls).toHaveLength(0);
  });
});
