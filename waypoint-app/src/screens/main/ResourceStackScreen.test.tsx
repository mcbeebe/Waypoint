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
