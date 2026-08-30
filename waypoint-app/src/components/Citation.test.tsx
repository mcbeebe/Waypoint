/**
 * The tappable citation, rendered. Proves the registry finally has a real UI
 * consumer: a registered citation opens its authority, claim and verified date;
 * an unregistered one stays inert text rather than a dead tap.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Citation from './Citation';
import { sourceForCitation } from '@/data/contentSources';

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
    expect(screen.getByLabelText('Read the section')).toBeTruthy();
  });

  it('an unregistered citation is plain text, never a dead tap', () => {
    render(<Citation citation="W&I §9999-not-real" locale="en" />);
    expect(screen.getByText('W&I §9999-not-real')).toBeTruthy();
    // No button role — nothing to open, so it must not pretend to be tappable.
    expect(screen.queryByLabelText(/Why this/)).toBeNull();
  });

  it('the verified date is formatted without a Date(), so no timezone can shift it', () => {
    // 2026-08-23 must read as Aug 23 in every zone (the tz suite proved this class
    // of bug ships otherwise).
    render(<Citation citation={REGISTERED} locale="es" />);
    fireEvent.click(screen.getByLabelText(/Por qué — la fuente/));
    expect(screen.getByText(/Verificado Aug 23, 2026/)).toBeTruthy();
  });
});
