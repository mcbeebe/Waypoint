/**
 * The Learn panel, rendered.
 *
 * This file exists because of a specific failure: all nine of the library's
 * destinations shipped as taps that did nothing, and the pure-logic suite
 * could not see it — the data was right, the wiring was not. These tests
 * press the actual buttons and assert what the navigator was asked to do.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LearnPanel from './LearnPanel';
import { navigateCalls } from '../../vitest.setup.ui';
import { getLearnPaths, popularQuestions } from '@/lib/learnLibrary';

function renderPanel(props: Partial<React.ComponentProps<typeof LearnPanel>> = {}) {
  return render(
    <LearnPanel locale="en" onAsk={() => {}} onAskAI={() => {}} {...props} />
  );
}

/**
 * react-native-web renders `accessibilityLabel` as `aria-label` on the
 * pressable and repeats the text in a child node, so a plain text query
 * matches several elements. Tests press the BUTTON, which is what a parent
 * does.
 */
function button(label: string | RegExp) {
  const matches = screen.getAllByRole('button').filter((el) => {
    const aria = el.getAttribute('aria-label') ?? '';
    return typeof label === 'string' ? aria.includes(label) : label.test(aria);
  });
  if (matches.length === 0) throw new Error(`no button labelled ${label}`);
  return matches[0];
}

describe('every guide actually goes somewhere', () => {
  it('names the tab when it navigates, from a panel that lives in Ask', () => {
    renderPanel();
    const first = getLearnPaths('en')[0];
    fireEvent.click(button(first.title));
    expect(navigateCalls).toHaveLength(1);
    const [tab, options] = navigateCalls[0].args as [string, Record<string, unknown>];
    // A bare screen name here bubbles to the tab navigator and the root
    // stack, matches nothing, and is dropped. Silently, in production.
    expect(tab).toBe('Home');
    expect(options).toMatchObject({ screen: first.target.screen });
  });

  it('navigates for every guide on the panel', () => {
    renderPanel();
    for (const path of getLearnPaths('en')) {
      navigateCalls.length = 0;
      fireEvent.click(button(path.title));
      expect(navigateCalls, `${path.key} did nothing`).toHaveLength(1);
    }
  });
});

describe('a chip fills the composer instead of spending an AI call', () => {
  it('hands the question back rather than sending it', () => {
    const onAsk = vi.fn();
    const onAskAI = vi.fn();
    renderPanel({ onAsk, onAskAI });
    const question = popularQuestions('en')[0];
    fireEvent.click(button(question));
    expect(onAsk).toHaveBeenCalledWith(question);
    // Sending would unmount the library before the parent had read it.
    expect(onAskAI).not.toHaveBeenCalled();
  });
});

describe('the library answers first, and says so honestly', () => {
  it('shows what it knows when the query matches', () => {
    renderPanel({ query: 'what is an IPP' });
    expect(screen.getByText(/WAYPOINT ALREADY KNOWS THIS/i)).toBeInTheDocument();
  });

  it('renders a definition as text, never as a button that does nothing', () => {
    renderPanel({ query: 'what is an IPP' });
    // The glossary answer has no destination: it IS the answer.
    const buttons = screen
      .getAllByRole('button')
      .map((el) => el.getAttribute('aria-label') ?? '');
    // The glossary answer has no destination, so it must not be a button.
    expect(buttons.some((l) => l.startsWith('IPP.'))).toBe(false);
    expect(screen.getAllByText('IPP').length).toBeGreaterThan(0);
  });

  it('admits a miss and offers the AI rather than showing nothing', () => {
    renderPanel({ query: 'quantum tunnelling' });
    expect(screen.getByText(/NOTHING IN THE LIBRARY MATCHES THAT/i)).toBeInTheDocument();
    expect(button(/Ask Waypoint instead/i)).toBeTruthy();
  });

  it('sends to the AI only when the parent asks for that', () => {
    const onAskAI = vi.fn();
    renderPanel({ query: 'quantum tunnelling', onAskAI });
    fireEvent.click(button(/Ask Waypoint instead/i));
    expect(onAskAI).toHaveBeenCalledWith('quantum tunnelling');
  });
});

describe('it renders in every language', () => {
  it('does not crash, and translates the headings', () => {
    const { unmount } = renderPanel({ locale: 'es' });
    expect(screen.getByText(/PREGUNTAS COMUNES/i)).toBeInTheDocument();
    unmount();
    renderPanel({ locale: 'vi' });
    expect(screen.getByText(/CÂU HỎI THƯỜNG GẶP/i)).toBeInTheDocument();
  });
});
