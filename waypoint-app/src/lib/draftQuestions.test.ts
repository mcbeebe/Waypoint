import { describe, it, expect } from 'vitest';
import {
  questionsFor,
  answersToRequest,
  toneFromAnswers,
  suggestedTone,
  isDraftable,
} from './draftQuestions';
import type { TriageItem, TriageClass } from './homeTriage';
import type { FunnelLocale } from '@/lib/eligibility';
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
    action: { kind: 'navigate', label: 'Go' },
    deferDays: 1,
    deferLabel: 'Back tomorrow',
  };
}

describe('rule 1 — never more than three, and none for a non-draft class', () => {
  it('a draftable class gets exactly three questions', () => {
    for (const cls of ['overdue', 'clock', 'reply'] as TriageClass[]) {
      const qs = questionsFor(item(cls), PROFILE, 'en');
      expect(qs).toHaveLength(3);
      expect(qs.length).toBeLessThanOrEqual(3);
    }
  });

  it('a class whose CTA is not "draft a letter" gets no flow at all', () => {
    for (const cls of ['today', 'opportunity', 'question', 'resume', 'crisis'] as TriageClass[]) {
      expect(isDraftable(cls)).toBe(false);
      expect(questionsFor(item(cls), PROFILE, 'en')).toEqual([]);
    }
  });

  it('the first question depends on whether this is a follow-up or a reply', () => {
    expect(questionsFor(item('overdue'), PROFILE, 'en')[0].id).toBe('heard_back');
    expect(questionsFor(item('clock'), PROFILE, 'en')[0].id).toBe('heard_back');
    expect(questionsFor(item('reply'), PROFILE, 'en')[0].id).toBe('reply_read');
  });
});

describe('rule 2 — chips, not prose; the note is the only escape hatch', () => {
  it('the content questions are answerable by tapping; only the note is freeform', () => {
    const qs = questionsFor(item('overdue'), PROFILE, 'en');
    const heard = qs.find((q) => q.id === 'heard_back')!;
    const tone = qs.find((q) => q.id === 'tone')!;
    const note = qs.find((q) => q.id === 'note')!;
    expect(heard.options.length).toBeGreaterThan(0);
    expect(heard.freeform).toBeUndefined();
    expect(tone.options.length).toBe(3);
    expect(tone.freeform).toBeUndefined();
    expect(note.options).toEqual([]);
    expect(note.freeform).toBeDefined();
    expect(note.optional).toBe(true);
  });
});

describe('rule 3 — every answer changes the letter', () => {
  it('each "heard back" option produces a different request string', () => {
    const qs = questionsFor(item('overdue'), PROFILE, 'en');
    const strings = qs
      .find((q) => q.id === 'heard_back')!
      .options.map((o) => answersToRequest(qs, { heard_back: o.value }));
    // No two options collapse to the same request, and none is empty.
    expect(new Set(strings).size).toBe(strings.length);
    expect(strings.every((s) => s.length > 0)).toBe(true);
  });

  it('each "reply" option produces a different request string', () => {
    const qs = questionsFor(item('reply'), PROFILE, 'en');
    const strings = qs
      .find((q) => q.id === 'reply_read')!
      .options.map((o) => answersToRequest(qs, { reply_read: o.value }));
    expect(new Set(strings).size).toBe(strings.length);
  });

  it('"they said no" asks for the decision in writing — the load-bearing route', () => {
    const qs = questionsFor(item('reply'), PROFILE, 'en');
    const req = answersToRequest(qs, { reply_read: 'said_no' });
    expect(req.toLowerCase()).toContain('in writing');
    expect(req.toLowerCase()).toContain('appeal');
  });

  it('a freeform note is carried verbatim, trimmed, and added to the request', () => {
    const qs = questionsFor(item('overdue'), PROFILE, 'en');
    const req = answersToRequest(qs, { heard_back: 'nothing', note: '  the aide left in June  ' });
    expect(req).toContain('the aide left in June');
    expect(req).not.toContain('  the aide'); // trimmed
    // The note adds to, not replaces, the heard-back sentence.
    expect(req.length).toBeGreaterThan(answersToRequest(qs, { heard_back: 'nothing' }).length);
  });

  it('the tone answer never leaks into the request string', () => {
    const qs = questionsFor(item('overdue'), PROFILE, 'en');
    const req = answersToRequest(qs, { heard_back: 'nothing', tone: 'strong' });
    expect(req.toLowerCase()).not.toContain('strong');
    expect(req.toLowerCase()).not.toContain('formal');
  });
});

describe('rule 4 — collaborative-first: tone follows the stage, override is one tap', () => {
  it('suggests warm for a running clock, firmer for a passed deadline', () => {
    expect(suggestedTone('clock')).toBe('warm');
    expect(suggestedTone('overdue')).toBe('professional');
    expect(suggestedTone('reply')).toBe('professional');
    // Never opens on the most adversarial tone.
    expect(suggestedTone('overdue')).not.toBe('strong');
  });

  it('the tone question is pre-set to the stage default, and offers all three', () => {
    const qs = questionsFor(item('clock'), PROFILE, 'en');
    const tone = qs.find((q) => q.id === 'tone')!;
    expect(tone.suggested).toBe('warm');
    expect(tone.options.map((o) => o.tone)).toEqual(['warm', 'professional', 'strong']);
  });

  it('an untouched tone falls back to the stage default; a chosen one wins', () => {
    expect(toneFromAnswers(item('overdue'), {})).toBe('professional');
    expect(toneFromAnswers(item('overdue'), { tone: 'warm' })).toBe('warm');
    // A garbage value is ignored, not passed through to generateLetter.
    expect(toneFromAnswers(item('overdue'), { tone: 'nonsense' })).toBe('professional');
  });
});

describe('rule 5 — trilingual with locale parity: same shape, different prose', () => {
  const LOCALES: FunnelLocale[] = ['en', 'es', 'vi'];

  it('every locale returns the same questions, options and ids', () => {
    for (const cls of ['overdue', 'reply'] as TriageClass[]) {
      const byLocale = LOCALES.map((l) => questionsFor(item(cls), PROFILE, l));
      const shape = (qs: ReturnType<typeof questionsFor>) =>
        qs.map((q) => ({ id: q.id, opts: q.options.map((o) => o.value), tones: q.options.map((o) => o.tone) }));
      const [en, es, vi] = byLocale.map(shape);
      expect(es).toEqual(en);
      expect(vi).toEqual(en);
    }
  });

  it('the prose actually differs between locales (not an untranslated stub)', () => {
    const en = questionsFor(item('overdue'), PROFILE, 'en')[0].prompt;
    const es = questionsFor(item('overdue'), PROFILE, 'es')[0].prompt;
    const vi = questionsFor(item('overdue'), PROFILE, 'vi')[0].prompt;
    expect(es).not.toBe(en);
    expect(vi).not.toBe(en);
    expect(vi).not.toBe(es);
  });

  it('the note example uses the child\'s name when the profile has it', () => {
    const withName = questionsFor(item('overdue'), { childFirstName: 'Teddy' }, 'en').find(
      (q) => q.id === 'note'
    )!;
    const without = questionsFor(item('overdue'), {}, 'en').find((q) => q.id === 'note')!;
    expect(withName.freeform?.placeholder).toContain('Teddy');
    expect(without.freeform?.placeholder).not.toContain('Teddy');
  });
});
