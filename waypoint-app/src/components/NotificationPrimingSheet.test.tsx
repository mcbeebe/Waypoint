/**
 * The contextual permission ask, rendered (phase 7). Proves the copy reaches
 * the screen, names the date, stays tone-correct, and that the two buttons
 * hand back the right intent.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationPrimingSheet from './NotificationPrimingSheet';

function sheet(props: Record<string, unknown> = {}) {
  const onEnable = vi.fn();
  const onDismiss = vi.fn();
  render(
    <NotificationPrimingSheet
      visible
      locale="en"
      dateLabel="Sep 12"
      onEnable={onEnable}
      onDismiss={onDismiss}
      {...props}
    />
  );
  return { onEnable, onDismiss };
}

describe('NotificationPrimingSheet', () => {
  it('names the date being watched and frames it as relief, not chasing', () => {
    sheet();
    expect(screen.getByText(/Sep 12/)).toBeTruthy();
    // Tone: framed as relief; never blame. (Modal portals to the body.)
    expect(document.body.textContent).toMatch(/don't have to keep checking/i);
    expect(document.body.textContent).not.toMatch(/they (missed|failed|owe)/i);
  });

  it('falls back to a dateless prompt when there is no clock to name', () => {
    sheet({ dateLabel: null });
    expect(screen.getByText(/when a deadline nears or passes/i)).toBeTruthy();
  });

  it('the primary button hands back "enable"', () => {
    const { onEnable } = sheet();
    fireEvent.click(screen.getByLabelText('Yes, keep an eye on it'));
    expect(onEnable).toHaveBeenCalledTimes(1);
  });

  it('the secondary button dismisses', () => {
    const { onDismiss } = sheet();
    fireEvent.click(screen.getByLabelText('Not now'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('translates — Spanish and Vietnamese are not the English stub', () => {
    const { rerender } = render(
      <NotificationPrimingSheet visible locale="es" dateLabel="12 sep" onEnable={() => {}} onDismiss={() => {}} />
    );
    expect(screen.getByLabelText('Sí, que la vigile')).toBeTruthy();
    rerender(
      <NotificationPrimingSheet visible locale="vi" dateLabel="12 Th9" onEnable={() => {}} onDismiss={() => {}} />
    );
    expect(screen.getByLabelText('Vâng, hãy theo dõi giúp tôi')).toBeTruthy();
  });
});
