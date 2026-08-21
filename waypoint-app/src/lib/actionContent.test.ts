import { describe, it, expect } from 'vitest';
import { formatActionForSharing, type ShareableAction, deriveActionTitle } from './actionContent';

const FULL_ACTION: ShareableAction = {
  title: 'Apply for IHSS (In-Home Supportive Services)',
  description: [
    'IHSS pays for in-home caregiving so your child can live at home safely.',
    '⏰ Timeline: After Medi-Cal',
    '🕒 Effort: ~1 hour application, then one in-home assessment visit',
    'Why this matters: IHSS is a game-changer for families.',
    'Documents to gather:\n• Medi-Cal card\n• Doctor letter',
    '💡 Insider tip: Describe your child\'s worst days, not their best.',
  ].join('\n\n'),
  category: 'benefits',
  priority: 'high',
  status: 'not_started',
  script: 'What to say:\n• I\'m applying for IHSS for my child.',
  steps: [
    { step: 'Apply at BenefitsCal.com', done: true },
    { step: 'Schedule the home assessment', done: false },
  ],
  due_date: '2026-09-29',
};

describe('formatActionForSharing', () => {
  it('renders every section in a readable order', () => {
    const text = formatActionForSharing(FULL_ACTION);
    expect(text).toContain('📋 Apply for IHSS');
    expect(text).toContain('Benefits · High priority · Due September 29, 2026');
    expect(text).toContain('⏰ Timeline: After Medi-Cal');
    expect(text).toContain('🕒 Time needed: ~1 hour application');
    expect(text).toContain('Why this matters: IHSS is a game-changer');
    expect(text).toContain('✅ 1. Apply at BenefitsCal.com');
    expect(text).toContain('▢ 2. Schedule the home assessment');
    expect(text).toContain("I'm applying for IHSS");
    expect(text).toContain('• Medi-Cal card');
    expect(text).toContain('💡 Tip: Describe');
    expect(text.trim().endsWith('— Shared from Waypoint · waypointchild.com')).toBe(true);
  });

  it('handles a minimal manual action without empty sections', () => {
    const text = formatActionForSharing({
      title: 'Call the school',
      description: null,
      category: 'iep',
      priority: 'medium',
      status: 'not_started',
      script: null,
      steps: null,
      due_date: null,
    });
    expect(text).toContain('📋 Call the school');
    expect(text).toContain('IEP / School');
    expect(text).not.toContain('Steps:');
    expect(text).not.toContain('Documents');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });

  it('omits priority label for medium/low but keeps due date', () => {
    const text = formatActionForSharing({
      ...FULL_ACTION,
      priority: 'medium',
      due_date: '2026-10-01',
    });
    expect(text).not.toContain('priority');
    expect(text).toContain('Due October 1, 2026');
  });
});

// ─── deriveActionTitle ──────────────────────────────────────────────────────

describe('deriveActionTitle', () => {
  it('uses the first structured step when the answer had one', () => {
    expect(
      deriveActionTitle({
        content: 'Yes — this is one of the highest-value moves you can make right now.',
        steps: [{ action: 'Call your service coordinator to request an IPP meeting' }],
      })
    ).toBe('Call your service coordinator to request an IPP meeting');
  });

  it('skips the conversational opener and finds the instruction', () => {
    // The exact shape that produced the bad plan item
    const reply =
      'Yes — for most Regional Center families, this is one of the highest-value moves. ' +
      'Call your service coordinator and ask them to add respite hours to the IPP.';
    expect(deriveActionTitle({ content: reply })).toBe(
      'Call your service coordinator and ask them to add respite hours to the IPP'
    );
  });

  it('never returns a raw conversational fragment as the title', () => {
    const title = deriveActionTitle({
      content: 'Yes — for most Regional Center families, this is one of the highest-value moves.',
    });
    expect(title).not.toMatch(/^Yes —/);
    expect(title.startsWith('For most Regional Center families')).toBe(true);
  });

  it('strips list markers and bold from a bulleted answer', () => {
    expect(
      deriveActionTitle({ content: '- **Request** an IEP evaluation in writing this week' })
    ).toBe('Request an IEP evaluation in writing this week');
  });

  it('truncates long titles at a word boundary, never mid-word', () => {
    const long =
      'Email the special education director and request a full psychoeducational evaluation including speech, occupational therapy, and assistive technology assessments';
    const title = deriveActionTitle({ content: long });
    expect(title.length).toBeLessThanOrEqual(81);
    expect(title.endsWith('…')).toBe(true);
    // The kept text must be a whole-word prefix of the original: the very
    // next character in the source is a space, so no word was sliced open
    const kept = title.slice(0, -1);
    expect(long.startsWith(kept)).toBe(true);
    expect(long[kept.length]).toBe(' ');
  });

  it('capitalises and drops trailing punctuation', () => {
    expect(deriveActionTitle({ content: 'ask the school for prior written notice:' })).toBe(
      'Ask the school for prior written notice'
    );
  });

  it('falls back to the question, then to a safe label', () => {
    expect(deriveActionTitle({ content: '', question: 'How do I get respite hours?' })).toBe(
      'How do I get respite hours?'
    );
    expect(deriveActionTitle({ content: '' })).toBe('Saved from your AI chat');
  });
});
