/**
 * The tappable citation, rendered. Proves the registry finally has a real UI
 * consumer: a registered citation opens its authority, claim and verified date;
 * an unregistered one stays inert text rather than a dead tap.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Citation from './Citation';
import { sourceForCitation, sourcesForCitation } from '@/data/contentSources';

const REGISTERED = 'W&I §4643';

describe('Citation', () => {
  it('a registered citation opens its source — authority, claim, verified date, read link', () => {
    const src = sourceForCitation(REGISTERED);
    expect(src).not.toBeNull();
    render(<Citation citation={REGISTERED} locale="en" />);

    // The chip is a button (it has something verified to open).
    const chip = screen.getByLabelText(/Why this — the source/);
    fireEvent.click(chip);

    expect(screen.getByText(src!.title)).toBeTruthy();
    expect(screen.getByText(src!.claim)).toBeTruthy();
    expect(screen.getByText(/Verified Aug 23, 2026/)).toBeTruthy();
    expect(screen.getByLabelText(`Read the section — ${src!.title}`)).toBeTruthy();
  });

  it('an unregistered citation is plain text, never a dead tap', () => {
    render(<Citation citation="W&I §9999-not-real" locale="en" />);
    expect(screen.getByText('W&I §9999-not-real')).toBeTruthy();
    // No button role — nothing to open, so it must not pretend to be tappable.
    expect(screen.queryByLabelText(/Why this/)).toBeNull();
  });

  it('the verified date is localized but formatted without a Date(), so no timezone can shift it', () => {
    // 2026-08-23 must read as the 23rd in every zone (the tz suite proved this
    // class of bug ships otherwise), with a localized month and day-first order.
    render(<Citation citation={REGISTERED} locale="es" />);
    fireEvent.click(screen.getByLabelText(/Por qué — la fuente/));
    expect(screen.getByText(/Verificado 23 ago 2026/)).toBeTruthy();
  });
});

describe('a citation that names two authorities opens both', () => {
  // The chip on the SDP journey's first step reads "W&I §4685.8 · §4646.5(b)"
  // and the claim beside it is the 30-day IPP-meeting right — which lives in
  // §4646.5, not §4685.8. First-match resolution showed only the §4685.8 sheet,
  // so a parent checking their deadline read a paragraph about budget basis and
  // was sent to a section that does not contain the rule. Both, or neither.
  const COMPOUND = 'W&I §4685.8 · §4646.5(b)';

  it('shows each authority with its own claim and its own link', () => {
    const sources = sourcesForCitation(COMPOUND);
    expect(sources.length).toBe(2);
    render(<Citation citation={COMPOUND} locale="en" />);
    fireEvent.click(screen.getByLabelText(/Why this — the source/));

    for (const s of sources) {
      expect(screen.getByText(s.title), s.key).toBeTruthy();
      expect(screen.getByText(s.claim), s.key).toBeTruthy();
      expect(screen.getByLabelText(`Read the section — ${s.title}`), s.key).toBeTruthy();
    }
    // The 30-day rule the step actually asserts is now reachable.
    expect(screen.getByText(/within 30 days/)).toBeTruthy();
  });

  it('the two links point at different sections', () => {
    const urls = sourcesForCitation(COMPOUND).map((s) => s.url);
    expect(new Set(urls).size).toBe(2);
  });
});

describe('the chip carries a host-supplied detail into its label', () => {
  it('so a date printed beside it is spoken with it, not as a loose fragment', () => {
    render(<Citation citation={REGISTERED} locale="en" detail="reviewed Aug 23, 2026" />);
    expect(
      screen.getByLabelText('W&I §4643. reviewed Aug 23, 2026. Why this — the source')
    ).toBeTruthy();
  });
});
