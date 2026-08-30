/**
 * The tool rows, rendered.
 *
 * A mutation sweep found this file untested: dropping `tab ?? 'Home'` from
 * the row's navigate went unnoticed, and that is the dead-tap defect that
 * has now shipped twice — a tap in the Tools tab aimed at a screen
 * registered under Home, bubbling to parents, matching nothing.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolsArea from './ToolsArea';
import { navigateCalls } from '../../vitest.setup.ui';
import { getActionTools, getAllTools } from '@/lib/toolsCatalog';
import { ROUTE_GRAPH, resolvesFrom } from '@/navigation/routeGraph';

const show = (props: Record<string, unknown> = {}) =>
  render(
    <ToolsArea
      selectedChildName="Teddy"
      requests={[]}
      communications={[]}
      hasUnansweredReply={false}
      childAgeYears={7}
      {...props}
    />
  );

function row(label: string) {
  const match = screen
    .getAllByRole('button')
    .find((el) => (el.getAttribute('aria-label') ?? '').startsWith(label));
  if (!match) throw new Error(`no row for ${label}`);
  return match;
}

describe('a tool row lands in the stack that registers its screen', () => {
  it('names the tab, so the row works from Tools as well as Home', () => {
    show();
    const letters = getActionTools('en')[0];
    fireEvent.click(row(letters.label));
    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, Record<string, unknown>];
    // Without the tab this navigate bubbles past the Tools stack, past the
    // tab navigator, past the root stack, and is dropped in silence.
    expect(tab).toBe('Home');
    expect(options).toMatchObject({ screen: letters.route.screen });
  });

  it('sends every visible action row somewhere that resolves from both tabs', () => {
    show();
    for (const tool of getActionTools('en')) {
      navigateCalls.length = 0;
      fireEvent.click(row(tool.label));
      expect(navigateCalls, `${tool.key} did nothing`).toHaveLength(1);
      const [tab, options] = navigateCalls[0].args as [string, { screen: string }];
      const target = { screen: options.screen, tab };
      expect(resolvesFrom('Home', target), `${tool.key} from Home`).toBe(true);
      expect(resolvesFrom('Tools', target), `${tool.key} from Tools`).toBe(true);
    }
  });

  it('reaches a tool behind a door the same way', () => {
    show();
    // Open the money door, then tap the funding guide inside it.
    fireEvent.click(row('Money'));
    navigateCalls.length = 0;
    const funding = getAllTools('en').find((t) => t.key === 'rc_funding')!;
    fireEvent.click(row(funding.label));
    const [tab] = navigateCalls[0].args as [string];
    expect(ROUTE_GRAPH[tab as 'Home']).toBeTruthy();
    expect(tab).toBe('Home');
  });
});

describe('search finds a tool and still routes it correctly', () => {
  it('navigates from a search result', () => {
    show();
    fireEvent.change(screen.getByPlaceholderText(/.+/), { target: { value: 'diapers' } });
    navigateCalls.length = 0;
    const hit = screen.getAllByRole('button').find((el) =>
      (el.getAttribute('aria-label') ?? '').toLowerCase().includes('regional center can fund')
    );
    expect(hit).toBeTruthy();
    fireEvent.click(hit!);
    expect(navigateCalls[0].args[0]).toBe('Home');
  });
});

describe('pinning from a row', () => {
  it('offers the star as its own control, reachable on its own', () => {
    const onTogglePin = vi.fn();
    show({ pinnedKeys: [], onTogglePin });
    // Nested inside the row's Pressable it was invisible to a screen reader,
    // and the star is the only way to pin a tool.
    const star = screen
      .getAllByRole('button')
      .find((el) => (el.getAttribute('aria-label') ?? '').startsWith('Pin to your tools'));
    expect(star).toBeTruthy();
    fireEvent.click(star!);
    expect(onTogglePin).toHaveBeenCalledWith('letters', false);
    // And pressing the star must not also open the tool.
    expect(navigateCalls).toHaveLength(0);
  });

  it('counts an open so the suggestion has evidence', () => {
    const onOpened = vi.fn();
    show({ pinnedKeys: [], onTogglePin: () => {}, onOpened });
    fireEvent.click(row(getActionTools('en')[0].label));
    expect(onOpened).toHaveBeenCalledWith('letters');
  });
});
