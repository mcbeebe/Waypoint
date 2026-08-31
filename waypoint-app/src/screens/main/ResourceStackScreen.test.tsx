/**
 * Resource Stack — the RC-layer door, rendered (initiative 005, PR C).
 *
 * The RC layer names "family services"; PR C adds a "See what to ask for" door
 * to the supports tier. This mocks the data hooks so the stack renders, and
 * proves the RC layer carries that link and it fires navigate('AskForSupports').
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', date_of_birth: '2018-05-01', rc_status: 'active' }],
    updateChild: async () => true,
  }),
}));
vi.mock('@/hooks/useRequests', () => ({ useRequests: () => ({ requests: [] }) }));
vi.mock('@/components/Toast', () => ({ useToast: () => ({ showToast: () => {} }) }));

import ResourceStackScreen from './ResourceStackScreen';
import { navigateCalls } from '../../../vitest.setup.ui';

describe('the Resource Stack RC layer opens the family-supports tier', () => {
  it('shows the "see what to ask for" door and fires navigate(AskForSupports)', () => {
    render(<ResourceStackScreen />);
    const link = screen.getByRole('button', { name: /what to ask for/i });
    fireEvent.click(link);
    expect(navigateCalls.some((c) => (c.args as [string])[0] === 'AskForSupports')).toBe(true);
  });
});
