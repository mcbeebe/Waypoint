import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReplyStrip from './ReplyStrip';
import type { ReplyStripModel } from '@/lib/replyStrip';

const model: ReplyStripModel = {
  replyId: 'r1',
  count: 1,
  kicker: 'NEW REPLY · TODAY',
  title: 'Caitriona Leonard replied',
  detail: '“Yep, I am planning on working on this in the next couple of days.”',
  cta: 'Read',
  accessibilityLabel: 'Caitriona Leonard replied. “Yep…”. Opens your paper trail.',
  params: { filter: 'replies', highlightId: 'r1' },
};

describe('ReplyStrip', () => {
  it('shows who replied, what they wrote, and a Read affordance', () => {
    render(<ReplyStrip model={model} onOpen={() => {}} />);
    expect(screen.getByText('NEW REPLY · TODAY')).toBeTruthy();
    expect(screen.getByText('Caitriona Leonard replied')).toBeTruthy();
    expect(screen.getByText(model.detail)).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
  });

  it('is ONE button a screen reader can reach, named by the model, and opens it', () => {
    const onOpen = vi.fn();
    render(<ReplyStrip model={model} onOpen={onOpen} />);
    const btn = screen.getByRole('button', { name: model.accessibilityLabel });
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledWith(model);
  });
});
