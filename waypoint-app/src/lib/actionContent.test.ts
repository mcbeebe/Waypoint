import { describe, it, expect } from 'vitest';
import { formatActionForSharing, type ShareableAction } from './actionContent';

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
