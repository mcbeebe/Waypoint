/**
 * How Waypoint Works — the cutaway's whole premise is that a step up top and
 * its mechanism below are linked, both ways, and the seam actually hides the
 * engine panel rather than just decorating it. These tests prove that, not
 * just that the text renders.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HowWaypointWorksScreen from './HowWaypointWorksScreen';

describe('HowWaypointWorksScreen', () => {
  it('defaults to Tell selected, with its mechanism shown in the engine panel', () => {
    render(<HowWaypointWorksScreen />);
    // react-native-web 0.19 drops the legacy accessibilityState -> aria
    // mapping entirely, so this codebase asserts the explicit aria-pressed
    // prop instead (see ActionsScreen's filter pills for the precedent).
    expect(screen.getByRole('button', { name: 'Tell' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/reads your child.s profile/i)).toBeInTheDocument();
  });

  it('tapping a top chip selects only that stage, not another one', () => {
    render(<HowWaypointWorksScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));
    expect(screen.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Tell' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/matches your situation to california disability law/i)).toBeInTheDocument();
  });

  it('tapping the engine-panel row itself also selects the matching top chip (bidirectional)', () => {
    render(<HowWaypointWorksScreen />);
    fireEvent.click(screen.getByRole('button', { name: /act — what this triggers/i }));
    expect(screen.getByRole('button', { name: 'Act' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the dashed seam collapses and re-expands the engine panel', () => {
    render(<HowWaypointWorksScreen />);
    expect(screen.getByText(/what waypoint is doing/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hide what waypoint is doing/i }));
    expect(screen.queryByText(/what waypoint is doing/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /show what waypoint is doing/i }));
    expect(screen.getByText(/what waypoint is doing/i)).toBeInTheDocument();
  });

  it('shows all three usage tips', () => {
    render(<HowWaypointWorksScreen />);
    expect(screen.getByText(/start at home/i)).toBeInTheDocument();
    expect(screen.getByText(/plain english/i)).toBeInTheDocument();
    expect(screen.getByText(/review before you send/i)).toBeInTheDocument();
  });

  it('names the loop closing, not just the four stages', () => {
    render(<HowWaypointWorksScreen />);
    expect(screen.getByText(/loops back to tell or plan/i)).toBeInTheDocument();
  });
});
