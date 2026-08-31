/**
 * One support, opened up — rendered (initiative 005, PR B).
 *
 * The detail reads live child data, so it isn't in the default ui suite; here
 * useFamily/useChildren are mocked so the highest-stakes screen in the tier
 * actually renders. Proves the catch shows, the child's name fills the script,
 * and the two CTAs fire the exact navigation shapes a parent depends on — the
 * gap an earlier adversary pass flagged (contract-tested, never rendered).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the data hooks the detail reads — a primary child named Teddy.
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1' } }),
  useChildren: () => ({
    children: [{ id: 'c1', first_name: 'Teddy', is_primary: true }],
  }),
}));

import SupportDetailScreen from './SupportDetailScreen';
import { navigateCalls, routeParams } from '../../../vitest.setup.ui';
import { getFamilySupport } from '@/lib/familySupports';

describe('the support detail renders and its CTAs fire the right navigation', () => {
  it('shows the catch and fills the child’s name into the script', () => {
    routeParams.supportKey = 'sibling_support';
    render(<SupportDetailScreen />);

    // The catch — the whole point — is on screen.
    expect(screen.getByText(/not automatic/i)).toBeTruthy();
    // The script reads as the parent’s own: the child’s name, no placeholder.
    expect(screen.getByText(/Teddy/)).toBeTruthy();
    expect(screen.queryByText(/\{child\}/)).toBeNull();
  });

  it('the draft CTA opens the IPP letter, prefilled with the ask', () => {
    routeParams.supportKey = 'sibling_support';
    render(<SupportDetailScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Draft this request for the IPP/i }));
    expect(navigateCalls).toHaveLength(1);
    const [screenName, params] = navigateCalls[0].args as [
      string,
      { template: string; question: string; trackTitle: string },
    ];
    expect(screenName).toBe('Letters');
    // 005-D: the support-specific "add this need to the IPP" letter (its send
    // opens a tracked request + follow-up clock via sentNextFor).
    expect(params.template).toBe('ipp_need_request');
    expect(params.question).toContain('Teddy'); // the seeded, name-filled ask
    // A distinct tracked thread per support, stable (English) across locales —
    // so a sibling ask and a respite ask don't collapse into one request.
    expect(params.trackTitle).toBe('IPP need: Sibling support');
  });

  it('the "ask Waypoint" CTA seeds the AI with the same ask', () => {
    routeParams.supportKey = 'sibling_support';
    render(<SupportDetailScreen />);

    fireEvent.click(screen.getByRole('button', { name: /Ask Waypoint about sibling support/i }));
    expect(navigateCalls).toHaveLength(1);
    const [tab, opts] = navigateCalls[0].args as [string, { screen: string; params: { ask: string } }];
    expect(tab).toBe('Navigator');
    expect(opts.screen).toBe('NavigatorMain');
    expect(opts.params.ask.length).toBeGreaterThan(0);
  });

  it('falls back gracefully on an unknown key — no crash, no navigation', () => {
    routeParams.supportKey = 'no_such_support';
    render(<SupportDetailScreen />);
    expect(screen.getByText(/isn’t available|Go back/i)).toBeTruthy();
    expect(navigateCalls).toHaveLength(0);
  });

  it('every support key renders a detail with a catch (no dead detail)', () => {
    for (const key of ['sibling_support', 'respite', 'camp_recreation', 'parent_training']) {
      routeParams.supportKey = key;
      const { unmount } = render(<SupportDetailScreen />);
      const support = getFamilySupport(key, 'en')!;
      expect(screen.getByText(support.theCatch), `${key} catch`).toBeTruthy();
      unmount();
    }
  });
});
