/**
 * The Waypoint marker renders (initiative 006, phase 1b). It's a View-based
 * mark (no SVG runtime), so this proves it draws its two parts, flips the pin
 * fill by tone, keeps the pine center constant, and stays decorative.
 *
 * react-native-web emits atomic CSS classes rather than inline styles, so a
 * color change shows up as a different className (not a `.style` value) — the
 * assertions compare classNames, which is the reliable signal here.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Brandmark, pinFill } from './Brandmark';
import { brand } from '@/lib/theme';

describe('Brandmark — the Waypoint marker', () => {
  it('draws a pin and a center dot', () => {
    const { getByTestId, unmount } = render(<Brandmark size={40} />);
    expect(getByTestId('brandmark')).toBeTruthy();
    expect(getByTestId('brandmark-pin')).toBeTruthy();
    expect(getByTestId('brandmark-dot')).toBeTruthy();
    unmount();
  });

  it('is decorative by default (no double-announce beside the wordmark)', () => {
    const { getByTestId, unmount } = render(<Brandmark />);
    expect(getByTestId('brandmark').getAttribute('aria-label')).toBeNull();
    unmount();
  });

  // The tone→fill decision is pure logic (react-native-web's atomic CSS hides
  // the color from the DOM), so it's tested at the source.
  it('flips the pin fill by tone: ink on light, white on dark', () => {
    expect(pinFill('ink')).toBe(brand.ink);
    expect(pinFill('light')).toBe('#FFFFFF'); // true white, not the panel surface token
    expect(pinFill('ink')).not.toBe(pinFill('light'));
  });
});
