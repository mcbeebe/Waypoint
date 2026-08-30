import { describe, it, expect } from 'vitest';
import { draftHandoff, templateForDraft } from './draftHandoff';
import type { TriageItem, TriageClass } from './homeTriage';
import type { LetterProfile } from '@/lib/draftBlanks';

const PROFILE: LetterProfile = { childFirstName: 'Teddy' };

function item(cls: TriageClass, params: Record<string, string> = {}): TriageItem {
  return {
    id: `${cls}:1`,
    cls,
    rank: 0,
    kicker: 'K',
    title: 'T',
    why: 'Because you asked on Jul 27 and the law gave them 30 days.',
    action: { kind: 'draft', label: 'Draft the follow-up', params },
    deferDays: 1,
    deferLabel: 'Back tomorrow',
  };
}

describe('templateForDraft — which letter the flow opens', () => {
  it('a follow-up uses the request type\'s own lever', () => {
    expect(templateForDraft(item('overdue'), {}, 'ipp_meeting')).toBe('ipp_review_request');
    expect(templateForDraft(item('clock'), {}, 'iep_evaluation')).toBe('assessment_request');
    expect(templateForDraft(item('overdue'), {}, 'service_request')).toBe('noa_request');
  });

  it('a follow-up with no known request type falls back to a custom letter', () => {
    expect(templateForDraft(item('overdue'), {}, null)).toBe('general');
    expect(templateForDraft(item('overdue'), {}, undefined)).toBe('general');
  });

  it('"they said no" routes to the written-notice instrument for the DENYING agency', () => {
    // Regional Center denial → Notice of Action; school denial → Prior Written Notice.
    expect(templateForDraft(item('reply'), { reply_read: 'said_no' }, 'service_request')).toBe('noa_request');
    expect(templateForDraft(item('reply'), { reply_read: 'said_no' }, 'ipp_meeting')).toBe('noa_request');
    expect(templateForDraft(item('reply'), { reply_read: 'said_no' }, 'iep_evaluation')).toBe('pwn_request');
  });

  it('"they said no" with an unknown agency does not guess — it stays a custom letter', () => {
    expect(templateForDraft(item('reply'), { reply_read: 'said_no' }, null)).toBe('general');
    expect(templateForDraft(item('reply'), { reply_read: 'said_no' }, undefined)).toBe('general');
  });

  it('any other reply is a plain answer', () => {
    expect(templateForDraft(item('reply'), { reply_read: 'agreed' }, null)).toBe('general');
    expect(templateForDraft(item('reply'), { reply_read: 'unclear' }, null)).toBe('general');
    expect(templateForDraft(item('reply'), {}, null)).toBe('general');
  });
});

describe('draftHandoff — the full package to the Letters screen', () => {
  it('carries template, a non-empty request, the chosen tone, guidance, and the case id', () => {
    const h = draftHandoff(
      item('overdue', { requestId: 'req-1' }),
      { heard_back: 'said_no', tone: 'strong' },
      { requestType: 'ipp_meeting', profile: PROFILE, locale: 'en' }
    );
    expect(h.template).toBe('ipp_review_request');
    expect(h.question.length).toBeGreaterThan(0);
    expect(h.question.toLowerCase()).toContain('in writing'); // "said no" sentence
    expect(h.tone).toBe('strong');
    expect(h.guidance).toContain('Jul 27');
    expect(h.requestId).toBe('req-1');
  });

  it('an accept-the-defaults submission still produces a real request and stage tone', () => {
    const h = draftHandoff(
      item('overdue', { requestId: 'req-1' }),
      {}, // parent tapped straight through
      { requestType: 'ipp_meeting', profile: PROFILE, locale: 'en' }
    );
    expect(h.question.length).toBeGreaterThan(0);
    expect(h.tone).toBe('professional'); // stage default for overdue
  });

  it('the reply loop: a Regional Center "no" routes to noa_request and asks for it in writing', () => {
    const h = draftHandoff(
      item('reply', { requestId: 'req-9', replyId: 'c5' }),
      { reply_read: 'said_no' },
      { requestType: 'service_request', profile: PROFILE, locale: 'en' }
    );
    expect(h.template).toBe('noa_request');
    expect(h.question.toLowerCase()).toContain('appeal');
    expect(h.requestId).toBe('req-9');
  });

  it('the reply loop: a school "no" routes to the Prior Written Notice, not the RC letter', () => {
    const h = draftHandoff(
      item('reply', { requestId: 'req-2', replyId: 'c7' }),
      { reply_read: 'said_no' },
      { requestType: 'iep_evaluation', profile: PROFILE, locale: 'en' }
    );
    expect(h.template).toBe('pwn_request');
  });
});
