/**
 * PageHeader renders (initiative 006, phase 2) — title, optional subtitle, the
 * back affordance firing its handler, the marker, and children beneath.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Text } from 'react-native';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('shows the title, subtitle, the marker, and children', () => {
    render(
      <PageHeader title="RC Funding Guide" subtitle="What the RC can fund">
        <Text>the ask bar</Text>
      </PageHeader>
    );
    expect(screen.getByText('RC Funding Guide')).toBeTruthy();
    expect(screen.getByText('What the RC can fund')).toBeTruthy();
    expect(screen.getByTestId('brandmark')).toBeTruthy(); // marker shown by default
    expect(screen.getByText('the ask bar')).toBeTruthy();
  });

  it('shows a back button only when onBack is given, and it fires', () => {
    const onBack = vi.fn();
    const { rerender } = render(<PageHeader title="X" />);
    expect(screen.queryByRole('button', { name: /go back/i })).toBeNull();

    rerender(<PageHeader title="X" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('can hide the marker (mark={false})', () => {
    render(<PageHeader title="X" mark={false} />);
    expect(screen.queryByTestId('brandmark')).toBeNull();
  });
});
