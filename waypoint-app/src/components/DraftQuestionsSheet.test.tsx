/**
 * The draft-flow question sheet, rendered. The logic suite proves which
 * questions exist; this proves they reach the screen, the chips are tappable,
 * the defaults are pre-selected, and "Write my letter" hands back the answers.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DraftQuestionsSheet from './DraftQuestionsSheet';
import type { TriageItem, TriageClass } from '@/lib/homeTriage';
import type { LetterProfile } from '@/lib/draftBlanks';

const PROFILE: LetterProfile = { childFirstName: 'Teddy' };

function item(cls: TriageClass): TriageItem {
  return {
    id: `${cls}:1`,
    cls,
    rank: 0,
    kicker: 'K',
    title: 'T',
    why: 'W',
    action: { kind: 'draft', label: 'Draft the follow-up', params: { requestId: 'r1' } },
    deferDays: 1,
    deferLabel: 'Back tomorrow',
  };
}

function sheet(props: Record<string, unknown> = {}) {
  const onComplete = vi.fn();
  const onClose = vi.fn();
  render(
    <DraftQuestionsSheet
      visible
      item={item('overdue')}
      profile={PROFILE}
      locale="en"
      onClose={onClose}
      onComplete={onComplete}
      {...props}
    />
  );
  return { onComplete, onClose };
}

describe('DraftQuestionsSheet', () => {
  it('renders the three questions from the module, with their real prompts', () => {
    sheet();
    expect(screen.getByText('What have you heard back so far?')).toBeTruthy();
    expect(screen.getByText('How do you want to sound?')).toBeTruthy();
    expect(screen.getByText('Anything you want them to know?')).toBeTruthy();
  });

  it('renders the note as a real freeform box, seeded with the child\'s name', () => {
    sheet();
    expect(screen.getByPlaceholderText(/Teddy/)).toBeTruthy();
  });

  it('accepting the pre-selected defaults hands back a complete answer set', () => {
    const { onComplete } = sheet();
    fireEvent.click(screen.getByLabelText('Write my letter'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    const answers = onComplete.mock.calls[0][0];
    // Defaults were seeded: the "heard back" and tone questions arrive answered.
    expect(answers.heard_back).toBe('nothing');
    expect(answers.tone).toBe('professional'); // overdue stage default
  });

  it('tapping a chip changes the answer that is handed back', () => {
    const { onComplete } = sheet();
    fireEvent.click(screen.getByLabelText('They said no'));
    fireEvent.click(screen.getByLabelText('Write my letter'));
    expect(onComplete.mock.calls[0][0].heard_back).toBe('said_no');
  });

  it('a data refetch (new profile identity, same item) does not wipe a changed answer', () => {
    const onComplete = vi.fn();
    const it0 = item('overdue');
    const { rerender } = render(
      <DraftQuestionsSheet
        visible
        item={it0}
        profile={{ childFirstName: 'Teddy' }}
        locale="en"
        onClose={() => {}}
        onComplete={onComplete}
      />
    );
    fireEvent.click(screen.getByLabelText('They said no'));
    // Simulate a children/family refetch: a brand-new profile object, same item.
    rerender(
      <DraftQuestionsSheet
        visible
        item={it0}
        profile={{ childFirstName: 'Teddy' }}
        locale="en"
        onClose={() => {}}
        onComplete={onComplete}
      />
    );
    fireEvent.click(screen.getByLabelText('Write my letter'));
    expect(onComplete.mock.calls[0][0].heard_back).toBe('said_no');
  });

  it('renders nothing when there is no item', () => {
    const { container } = render(
      <DraftQuestionsSheet
        visible
        item={null}
        profile={PROFILE}
        locale="en"
        onClose={() => {}}
        onComplete={() => {}}
      />
    );
    expect(container.textContent).toBe('');
  });

  it('a non-draftable class yields no questions (guards the wiring)', () => {
    render(
      <DraftQuestionsSheet
        visible
        item={item('today')}
        profile={PROFILE}
        locale="en"
        onClose={() => {}}
        onComplete={() => {}}
      />
    );
    // No content questions render for a non-draftable class.
    expect(screen.queryByText('What have you heard back so far?')).toBeNull();
  });
});
