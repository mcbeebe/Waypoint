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

  it('shows the AI\'s reading of the reply when provided (9e)', () => {
    render(
      <DraftQuestionsSheet
        visible
        item={item('reply')}
        profile={PROFILE}
        locale="en"
        aiSummary="They declined the request and cited caseload."
        onClose={() => {}}
        onComplete={() => {}}
      />
    );
    expect(screen.getByText("Waypoint's AI read their reply")).toBeTruthy();
    expect(screen.getByText('They declined the request and cited caseload.')).toBeTruthy();
  });

  /**
   * The draft flow is the model reading an agency's email and writing a reply
   * the parent sends in-thread, under their own name. Before this, every
   * string here said "Waypoint" — a company — and the word AI appeared
   * nowhere, in any of the three languages.
   *
   * THESE ASSERT ON THE SPECIFIC STRING THEY NAME. The first version used
   * `getAllByText(/\bIA\b/)`, which RTL matches unanchored against every
   * element — and the skipHint always renders and always contains AI/IA, so
   * the "says a machine READ the reply" test was satisfied by the hint no
   * matter what the summary label said. A mutation pass proved it: reverting
   * the Spanish and Vietnamese summary labels to "Waypoint" left all 14 tests
   * green. Those two strings had no coverage anywhere in the suite.
   */
  const READ_LABEL: Record<string, string> = {
    en: "Waypoint's AI read their reply",
    es: 'La IA de Waypoint leyó la respuesta de ellos',
    vi: 'AI của Waypoint đã đọc thư trả lời của họ',
  };
  const AI_TERM: Record<string, RegExp> = { en: /\bAI\b/, es: /\bIA\b/, vi: /\bAI\b/ };

  for (const locale of ['en', 'es', 'vi'] as const) {
    it(`[${locale}] the standing hint says a machine writes the draft`, () => {
      sheet({ locale });
      // Scoped to the hint element, not the whole document: a body-text check
      // passes on any other string that happens to contain "AI".
      const hint = screen.getByText(/Waypoint|IA de Waypoint|AI của Waypoint/);
      expect(hint.textContent).toMatch(AI_TERM[locale]);
    });

    it(`[${locale}] the summary label says a machine READ the agency's reply`, () => {
      sheet({ locale, aiSummary: 'They ask for the assessment request in writing.' });
      // The exact string. Copy may be rewritten — but then this line moves
      // with it, in a diff a reviewer can see, which is the point for
      // family-facing legal-adjacent text.
      expect(screen.getByText(READ_LABEL[locale])).toBeTruthy();
      expect(READ_LABEL[locale]).toMatch(AI_TERM[locale]);
    });
  }

  it('[es] never tells the parent the AI read THEIR OWN reply', () => {
    // "su respuesta" under usted reads first as "your reply" — the opposite of
    // what this label means, in the one string whose job is saying what the
    // machine read.
    expect(READ_LABEL.es).not.toMatch(/\bsu respuesta\b/);
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
