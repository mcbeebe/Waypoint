/**
 * The Learn reader, rendered (phase 8, slice 8-0). Proves an article actually
 * reads end to end: its body shows, the tappable citation is present, and the
 * end-action routes to a screen that resolves from a real stack — not a dead
 * tap, the defect class routeGraph exists to kill.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArticleScreen from './ArticleScreen';
import { navigateCalls, routeParams, clipboard } from '../../../vitest.setup.ui';
import { getLearnArticle } from '@/lib/learnLibrary';
import { resolvesFrom } from '@/navigation/routeGraph';

describe('the Learn reader renders an article end to end', () => {
  it('shows the body, the citation, and an action that resolves', () => {
    routeParams.articleKey = 'ipp_clock';
    const a = getLearnArticle('ipp_clock', 'en')!;
    render(<ArticleScreen />);

    // The page, not the blurb: a body paragraph is on screen.
    expect(screen.getByText(/30 days to hold it/i)).toBeTruthy();
    // The citation chip carries the statute.
    expect(screen.getAllByText(a.citation!).length).toBeGreaterThan(0);

    // The end-action routes somewhere that actually resolves.
    fireEvent.click(screen.getByRole('button', { name: a.actionLabel }));
    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, { screen: string }];
    expect(tab).toBe(a.target.tab);
    expect(resolvesFrom('Navigator', { screen: options.screen, tab })).toBe(true);
  });

  it('renders numbered steps for a how-to article', () => {
    routeParams.articleKey = 'rc_said_no'; // has a steps block
    render(<ArticleScreen />);
    expect(screen.getByText(/ask, in writing, for a notice of action/i)).toBeTruthy();
  });

  it('fails gracefully on an unknown article key', () => {
    routeParams.articleKey = 'no_such_article';
    render(<ArticleScreen />);
    expect(screen.getByText(/isn't available/i)).toBeTruthy();
    expect(navigateCalls).toHaveLength(0);
  });

  it('copies a checklist tool to the clipboard — the thing a parent keeps', async () => {
    routeParams.articleKey = 'first_iep'; // has a checklist tool
    const a = getLearnArticle('first_iep', 'en')!;
    const checklist = a.body.find((b) => b.kind === 'checklist');
    expect(checklist).toBeTruthy();
    render(<ArticleScreen />);

    // The checklist label and its items render as readable text.
    if (checklist?.kind === 'checklist') {
      expect(screen.getByText(checklist.label)).toBeTruthy();
      expect(screen.getByText(checklist.items[0])).toBeTruthy();
    }

    expect(clipboard.text).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /copy to my notes/i }));
    await waitFor(() => expect(clipboard.text).not.toBeNull());

    // What lands in the clipboard is the label plus every item, dash-prefixed,
    // so it pastes cleanly into a notes app.
    if (checklist?.kind === 'checklist') {
      expect(clipboard.text).toContain(checklist.label);
      for (const item of checklist.items) expect(clipboard.text).toContain(item);
      expect(clipboard.text).toContain(`- ${checklist.items[0]}`);
    }
    // The button confirms the copy happened.
    await waitFor(() => expect(screen.getByText(/copied/i)).toBeTruthy());
  });
});
