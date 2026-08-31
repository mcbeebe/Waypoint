/**
 * Brand kit primitives render (initiative 006, phase 2). The ProgressRail test
 * is the pointed one: color must never carry meaning alone, so the amount text
 * is always present, and the accessible value is clamped to 0–100.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { BrandCard, SectionLabel, ProgressRail } from './brandKit';

describe('BrandCard', () => {
  it('renders its children', () => {
    render(
      <BrandCard>
        <Text>inside the card</Text>
      </BrandCard>
    );
    expect(screen.getByText('inside the card')).toBeTruthy();
  });
});

describe('SectionLabel', () => {
  it('renders the label text', () => {
    render(<SectionLabel>Recommended</SectionLabel>);
    expect(screen.getByText('Recommended')).toBeTruthy();
  });
});

describe('ProgressRail', () => {
  it('always shows the amount as text, not color alone', () => {
    render(<ProgressRail value={0.62} amount="5 of 8 done" />);
    expect(screen.getByText('5 of 8 done')).toBeTruthy();
  });

  it('is an accessible progressbar labelled by the amount', () => {
    render(<ProgressRail value={0.5} amount="5 of 8 done" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-label')).toBe('5 of 8 done');
  });

  it('clamps the fill width rather than overflowing the bar', () => {
    const { rerender } = render(<ProgressRail value={0.5} amount="half" />);
    expect(screen.getByTestId('progress-fill').style.width).toBe('50%');
    rerender(<ProgressRail value={1.8} amount="done" />);
    expect(screen.getByTestId('progress-fill').style.width).toBe('100%');
    rerender(<ProgressRail value={-0.3} amount="none" />);
    expect(screen.getByTestId('progress-fill').style.width).toBe('0%');
  });
});
