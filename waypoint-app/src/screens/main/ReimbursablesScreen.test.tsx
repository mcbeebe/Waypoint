/**
 * RC Funding Guide upgrade — rendered (owner, Aug 31 2026).
 *
 * The screen is data-light (no family hooks), so it renders in the ui suite.
 * Proves the three additions work: the ask bar hands a question to the AI, a
 * service expands to its digestible detail, and "Read the full guide" opens the
 * article — each a real navigation, not a dead tap.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReimbursablesScreen from './ReimbursablesScreen';
import { navigateCalls } from '../../../vitest.setup.ui';
import { RC_REIMBURSABLES } from '@/data/reimbursables';
import { resolvesFrom } from '@/navigation/routeGraph';

describe('the RC Funding Guide renders the funding services', () => {
  it('lists every service', () => {
    render(<ReimbursablesScreen />);
    for (const item of RC_REIMBURSABLES) {
      expect(screen.getByText(item.name), `${item.name} on screen`).toBeTruthy();
    }
  });
});

describe('the AI ask bar hands the question to the Navigator', () => {
  it('a starter chip opens the AI seeded with its question', () => {
    render(<ReimbursablesScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Can I get respite\?/i }));
    expect(navigateCalls).toHaveLength(1);
    const [tab, opts] = navigateCalls[0].args as [string, { screen: string; params?: { ask?: string } }];
    expect(tab).toBe('Navigator');
    expect(opts.screen).toBe('NavigatorMain');
    expect(opts.params?.ask).toBe('Can I get respite?');
    expect(resolvesFrom('Home', { screen: 'NavigatorMain', tab: 'Navigator' })).toBe(true);
  });
});

describe('a service expands to digestible detail and links to the full guide', () => {
  it('More info reveals the bullets and a "Read the full guide" link that resolves', () => {
    render(<ReimbursablesScreen />);
    // Respite has moreInfo; before expanding, its detail bullet isn't shown.
    const respite = RC_REIMBURSABLES.find((r) => r.name === 'Respite Care')!;
    const firstBullet = respite.moreInfo![0];
    expect(screen.queryByText(firstBullet)).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /More info about Respite Care/i })[0]);
    expect(screen.getByText(firstBullet)).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: /Read the full funding guide/i })[0]);
    expect(navigateCalls).toHaveLength(1);
    const [tab, opts] = navigateCalls[0].args as [string, { screen: string; params: { articleKey: string } }];
    expect(tab).toBe('Navigator');
    expect(opts.screen).toBe('Article');
    expect(opts.params.articleKey).toBe('rc_money'); // the funding overview, until a dedicated article exists
    // Article lives in the Navigator stack — reachable from a Home-stack caller.
    expect(resolvesFrom('Home', { screen: 'Article', tab: 'Navigator' })).toBe(true);
  });
});
