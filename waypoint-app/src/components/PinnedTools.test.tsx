/**
 * The pinned tiles, rendered.
 *
 * The pin path had eighteen findings and no test could see any of them: the
 * cap that refused where nobody could see it, edit mode that could not be
 * left, the full grid showing the empty-grid hint, and a copy promise about
 * who can see the tiles.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PinnedTools from './PinnedTools';
import { navigateCalls } from '../../vitest.setup.ui';
import { MAX_PINS } from '@/lib/toolPins';
import { getAllTools } from '@/lib/toolsCatalog';
import type { UseToolPins } from '@/hooks/useToolPins';

const KEYS = getAllTools('en').map((t) => t.key);

function pins(over: Partial<UseToolPins> = {}): UseToolPins {
  return {
    pins: ['letters', 'requests'],
    shared: true,
    loading: false,
    suggestion: null,
    pin: async () => null,
    unpin: async () => null,
    noteOpened: () => {},
    opensOf: () => 0,
    declineSuggestion: async () => {},
    refetch: async () => {},
    ...over,
  };
}
const show = (over: Partial<UseToolPins> = {}, onNotice = () => {}) =>
  render(<PinnedTools pins={pins(over)} locale="en" onNotice={onNotice} />);

describe('a tile goes where it says', () => {
  it('names the tab, so it lands from Home and from the Tools tab alike', () => {
    show();
    fireEvent.click(screen.getByLabelText('Letters'));
    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, Record<string, unknown>];
    expect(tab).toBe('Home');
    expect(options).toMatchObject({ screen: 'Letters' });
  });

  it('counts the open, so the suggestion has something to go on', () => {
    const noteOpened = vi.fn();
    show({ noteOpened });
    fireEvent.click(screen.getByLabelText('Letters'));
    expect(noteOpened).toHaveBeenCalledWith('letters');
  });
});

describe('edit mode can always be left', () => {
  it('leaves edit mode when the last tile is removed, instead of getting stuck', () => {
    const { rerender } = show({ pins: ['letters'] });
    fireEvent.click(screen.getByLabelText('Edit'));
    expect(screen.getByLabelText('Done')).toBeInTheDocument();
    // The Done button used to unmount with the last tile while `editing`
    // stayed true — and edit mode suppresses the suggestion, so the card was
    // stuck until the app restarted.
    rerender(
      <PinnedTools pins={pins({ pins: [], suggestion: 'documents', opensOf: () => 4 })} locale="en" />
    );
    expect(screen.queryByLabelText('Done')).toBeNull();
    expect(screen.getByText(/Pin Documents\?/i)).toBeInTheDocument();
  });
});

describe('the grid says the right thing about itself', () => {
  it('shows the cap message when full, not the empty-grid hint', () => {
    show({ pins: KEYS.slice(0, MAX_PINS) });
    fireEvent.click(screen.getByLabelText('Edit'));
    expect(screen.getByText(/Six tiles is the most that fit/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pin the tools you use most/i)).toBeNull();
  });

  it('says out loud when the tiles are device-only', () => {
    show({ shared: false });
    expect(screen.getByText(/saved on this device only/i)).toBeInTheDocument();
  });

  it('never promises a co-parent will see them', () => {
    const { container } = show({ pins: [] });
    expect(container.textContent).not.toMatch(/everyone in your family/i);
  });

  it('does not flash the empty hint while the pins are still loading', () => {
    show({ pins: [], loading: true });
    expect(screen.queryByText(/Pin the tools you use most/i)).toBeNull();
  });
});

describe('the suggestion is offered once, in place', () => {
  it('pins on yes', () => {
    const pin = vi.fn(async () => null);
    show({ suggestion: 'documents', opensOf: () => 4, pin });
    expect(screen.getByText(/You have opened Documents 4 times/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Pin it'));
    expect(pin).toHaveBeenCalledWith('documents');
  });

  it('records the decline on no, so it never returns', () => {
    const declineSuggestion = vi.fn(async () => {});
    show({ suggestion: 'documents', opensOf: () => 4, declineSuggestion });
    fireEvent.click(screen.getByLabelText('No thanks'));
    expect(declineSuggestion).toHaveBeenCalledWith('documents');
  });

  it('surfaces a refused pin instead of swallowing it', async () => {
    const onNotice = vi.fn();
    show({ suggestion: 'documents', opensOf: () => 4, pin: async () => 'Remove one first.' }, onNotice);
    fireEvent.click(screen.getByLabelText('Pin it'));
    await vi.waitFor(() => expect(onNotice).toHaveBeenCalledWith('Remove one first.'));
  });
});
