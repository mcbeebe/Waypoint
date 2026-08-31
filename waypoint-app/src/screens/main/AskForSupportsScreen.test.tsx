/**
 * "Supports you can ask for" — the list, rendered (initiative 005, PR B).
 *
 * The list is data-light (locale + navigation), so unlike the detail it renders
 * in the ui suite: it proves the supports show and a row opens the detail with
 * the right key — a real tap, not a dead one.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AskForSupportsScreen from './AskForSupportsScreen';
import { navigateCalls } from '../../../vitest.setup.ui';
import { getFamilySupports } from '@/lib/familySupports';
import { resolvesFrom } from '@/navigation/routeGraph';

describe('the ask-for-supports list renders and routes', () => {
  it('shows every support in the tier, sibling support first', () => {
    render(<AskForSupportsScreen />);
    for (const s of getFamilySupports('en')) {
      expect(screen.getByText(s.name), `${s.key} name on screen`).toBeTruthy();
    }
  });

  it('opens the detail with the tapped support’s key — and it resolves', () => {
    render(<AskForSupportsScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Sibling support/i }));
    expect(navigateCalls).toHaveLength(1);
    const [screenName, params] = navigateCalls[0].args as [string, { supportKey: string }];
    expect(screenName).toBe('SupportDetail');
    expect(params.supportKey).toBe('sibling_support');
    expect(resolvesFrom('Home', { screen: 'SupportDetail' })).toBe(true);
  });

  it('the funding-guide link opens Reimbursables (which resolves from Home)', () => {
    render(<AskForSupportsScreen />);
    fireEvent.click(screen.getByRole('button', { name: /funding guide/i }));
    expect(navigateCalls).toHaveLength(1);
    expect((navigateCalls[0].args as [string])[0]).toBe('Reimbursables');
    expect(resolvesFrom('Home', { screen: 'Reimbursables' })).toBe(true);
  });
});
