/**
 * The escalation ladder, rendered. The point of this suite is the citation:
 * every rung asserts a statutory right to a parent, and until now those
 * statutes were inert 10px grey text. A citation a parent cannot open is a
 * claim Waypoint makes without showing its work — so what is pinned here is
 * that the statute is a button, that opening it shows the authority and the
 * date a human verified it, and that rung 4 still names the free advocate.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EscalationLadderScreen from './EscalationLadderScreen';
import { getEscalationRungs } from '@/lib/escalationLadder';
import { sourceForCitation } from '@/data/contentSources';

describe('the escalation ladder shows its work', () => {
  // Registration itself is already guarded for every locale by
  // contentSources.test.ts, which enumerates getEscalationRungs — not repeated
  // here. What that test cannot see is whether this screen renders the
  // registry entry as something a parent can open.
  it('a statute is a button, and opening it shows the authority and verified date', () => {
    const rungs = getEscalationRungs('en');
    const first = rungs[0];
    const source = sourceForCitation(first.citation)!;
    render(<EscalationLadderScreen />);

    // The citation is reachable as a control, not just painted on the card.
    const chip = screen.getAllByRole('button', {
      name: new RegExp(escapeRe(first.citation)),
    })[0];
    expect(chip).toBeTruthy();

    fireEvent.click(chip);

    // The sheet states the authority, what Waypoint rests on it, and when a
    // human last checked that the source still says it.
    expect(screen.getByText(source.title)).toBeTruthy();
    expect(screen.getByText(source.claim)).toBeTruthy();
    expect(screen.getByText(/Verified/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /read the section/i })).toBeTruthy();
  });

  it('rung 4 still routes to the free OCRA advocate', () => {
    render(<EscalationLadderScreen />);
    expect(screen.getByRole('button', { name: /find your ocra advocate/i })).toBeTruthy();
  });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
