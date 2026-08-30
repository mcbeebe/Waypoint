/**
 * The avatar menu, rendered. Profile left the tab bar; this is the only way
 * back to it, so every item has to actually open something.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountMenu from './AccountMenu';
import { accountMenuItems } from '@/lib/accountMenu';

const open = (props: Record<string, unknown> = {}) =>
  render(
    <AccountMenu
      visible
      onClose={() => {}}
      onSelect={() => {}}
      locale="en"
      name="Mike"
      {...props}
    />
  );

describe('the menu reaches what the tab held', () => {
  it('renders every item', () => {
    open();
    for (const item of accountMenuItems('en')) {
      expect(screen.getByLabelText(item.label)).toBeInTheDocument();
    }
  });

  it('reports the item chosen and closes', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    open({ onSelect, onClose });
    fireEvent.click(screen.getByLabelText(/Profile and settings/i));
    expect(onClose).toHaveBeenCalled();
    expect(onSelect.mock.calls[0][0]).toMatchObject({ screen: 'Profile' });
  });

  it('does not promise a destination it does not have', () => {
    const { container } = open();
    // The hint once said the menu opened "your plan" — which is a tab.
    expect(container.textContent).not.toMatch(/\bplan\b/i);
  });

  it('renders in Spanish and Vietnamese', () => {
    const { unmount } = open({ locale: 'es' });
    expect(screen.getByLabelText(/Perfil y ajustes/i)).toBeInTheDocument();
    unmount();
    open({ locale: 'vi' });
    expect(screen.getByLabelText(/Hồ sơ và cài đặt/i)).toBeInTheDocument();
  });
});
