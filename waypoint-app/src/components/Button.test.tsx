/**
 * Shared Button (initiative 006 migration to the brand system). The press
 * tests are the pointed ones: the TouchableOpacity → Pressable swap must not
 * cost any screen a working button, and loading/disabled must actually block
 * the press, not just dim it.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders the title and fires onPress', () => {
    const onPress = vi.fn();
    render(<Button title="Sign up with Email" onPress={onPress} />);
    fireEvent.click(screen.getByText('Sign up with Email'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is an accessible button', () => {
    render(<Button title="Continue with Google" onPress={() => {}} variant="outline" />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('does not fire onPress while disabled', () => {
    const onPress = vi.fn();
    render(<Button title="Create Account" onPress={onPress} disabled />);
    fireEvent.click(screen.getByText('Create Account'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('replaces the title with a spinner and blocks presses while loading', () => {
    const onPress = vi.fn();
    render(<Button title="Sign In" onPress={onPress} loading />);
    expect(screen.queryByText('Sign In')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps its accessible name while the spinner replaces the title', () => {
    render(<Button title="Sign In" onPress={() => {}} loading />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });
});
