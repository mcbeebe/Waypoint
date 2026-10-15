/**
 * What the action → Navigator bridge hands the model, and in whose words.
 *
 * The tone assertions here are the point of the file. These strings are
 * family-facing copy that also steers the answer, so the escalation rule binds
 * them twice: the framing a parent reads on this screen is the one they carry
 * into the phone call. A banned-phrase guard is cruder than a reviewer, but it
 * is the thing that survives a future edit by someone who has not read
 * CLAUDE.md.
 */
import { describe, it, expect } from 'vitest';
import { actionAskPrefill, actionAskLabel, actionAskHint } from './actionAsk';
import type { ActionAskInput } from './actionAsk';
import type { ActionLocale } from './actionMeta';

const LOCALES: ActionLocale[] = ['en', 'es', 'vi'];

const BASE: ActionAskInput = {
  title: 'Apply for Medi-Cal',
  status: 'not_started',
  due_date: null,
  completed_at: null,
  steps: null,
  follow_up_date: null,
};

const at = (over: Partial<ActionAskInput>): ActionAskInput => ({ ...BASE, ...over });

describe('the sentence says where the action actually stands', () => {
  it('done — the screenshot case: marked done, with the day', () => {
    // A date-only value here on purpose: `completed_at` is a real timestamp,
    // so the day it renders depends on the family's own clock. That is
    // correct behaviour, and it is asserted where it belongs — in
    // `actionAsk.tz.test.ts`, which runs east AND west.
    const s = actionAskPrefill(at({ status: 'completed', completed_at: '2026-10-02' }), {
      today: '2026-10-14',
    });
    expect(s).toContain('Apply for Medi-Cal');
    expect(s).toContain("marked it done");
    expect(s).toContain('Oct 2');
  });

  it('in progress — the step count a parent can see on the screen', () => {
    const s = actionAskPrefill(
      at({
        status: 'in_progress',
        steps: [
          { step: 'a', done: true },
          { step: 'b', done: true },
          { step: 'c', done: false },
        ] as any,
      }),
      { today: '2026-10-14' }
    );
    expect(s).toContain('2 of 3 steps done');
  });

  it('not started, with a due date still ahead', () => {
    const s = actionAskPrefill(at({ due_date: '2026-11-24' }), { today: '2026-10-14' });
    expect(s).toContain("haven't started");
    expect(s).toContain("It's due Nov 24.");
    expect(s).not.toContain('passed');
  });

  it('not started, and the date has gone by', () => {
    const s = actionAskPrefill(at({ due_date: '2026-08-24' }), { today: '2026-10-14' });
    expect(s).toContain('It was due Aug 24, and that date has passed.');
  });

  it('a date that IS today has not passed — the family still has the day', () => {
    const s = actionAskPrefill(at({ due_date: '2026-10-14' }), { today: '2026-10-14' });
    expect(s).toContain("It's due Oct 14.");
    expect(s).not.toContain('has passed');
  });

  it('dismissed says so rather than pretending the action is live', () => {
    const s = actionAskPrefill(at({ status: 'dismissed' }), { today: '2026-10-14' });
    expect(s).toContain('took it off my plan');
  });

  it('names the child when the action is attached to one', () => {
    const s = actionAskPrefill(at({}), { childFirstName: 'Ben', today: '2026-10-14' });
    expect(s).toContain('for Ben');
  });

  it('leaves the child out rather than guessing when none is attached', () => {
    const s = actionAskPrefill(at({}), { today: '2026-10-14' });
    // Not a bare `not.toContain('for ')` — the TITLE contains "for".
    expect(s.startsWith('About \u201CApply for Medi-Cal\u201D —')).toBe(true);
    expect(s).not.toContain('Ben');
  });
});

describe('waiting on an answer', () => {
  it('a passed follow-up date on a done action reads as a past-due ANSWER', () => {
    const s = actionAskPrefill(
      at({ status: 'completed', completed_at: '2026-08-20', follow_up_date: '2026-09-20' }),
      { today: '2026-10-14' }
    );
    expect(s).toContain('An answer on it is past due.');
  });

  it('a follow-up date still ahead says nothing about waiting', () => {
    const s = actionAskPrefill(
      at({ status: 'completed', completed_at: '2026-10-02', follow_up_date: '2026-11-20' }),
      { today: '2026-10-14' }
    );
    expect(s).not.toContain('past due');
  });
});

describe('tone — the rule that outlives whoever edits this next', () => {
  // Every state, every locale — 72 sentences, the full surface a parent can
  // ever read from this module.
  const EVERY_SENTENCE: string[] = [];
  for (const locale of LOCALES) {
    for (const status of ['not_started', 'in_progress', 'completed', 'dismissed'] as const) {
      for (const due of [null, '2026-08-24', '2026-11-24']) {
        for (const followUp of [null, '2026-09-20']) {
          EVERY_SENTENCE.push(
            actionAskPrefill(
              at({
                status,
                due_date: due,
                follow_up_date: followUp,
                completed_at: status === 'completed' ? '2026-10-02' : null,
                steps: [{ step: 'a', done: true }, { step: 'b', done: false }] as any,
              }),
              { locale, childFirstName: 'Ben', today: '2026-10-14' }
            )
          );
        }
      }
    }
  }

  it('never names an actor who failed', () => {
    // The framings CLAUDE.md bans on Home, which this screen feeds next.
    const BANNED = [
      'they missed',
      'they failed',
      'they owe',
      'they never',
      'they ignored',
      'no respondieron',
      'ellos fallaron',
      'họ đã bỏ lỡ',
      'họ không trả lời',
    ];
    for (const sentence of EVERY_SENTENCE) {
      for (const phrase of BANNED) {
        expect(sentence.toLowerCase()).not.toContain(phrase);
      }
    }
  });

  it('never demands — the ladder starts collaborative', () => {
    const BANNED = ['demand', 'immediately', 'unacceptable', 'violation', 'exijo', 'exigir', 'yêu cầu ngay'];
    for (const sentence of EVERY_SENTENCE) {
      for (const phrase of BANNED) {
        expect(sentence.toLowerCase()).not.toContain(phrase);
      }
    }
  });

  it('never blames the parent for a date that has gone by', () => {
    // Word boundaries, not substrings: a parent-written title like "Request
    // trans*late*d IEP documents" is interpolated into this sentence, and a
    // bare `toContain('late')` would fail on their words rather than ours.
    const BANNED = [/\byou should have\b/, /\btoo late\b/, /\byou forgot\b/, /\blate\b/, /\boverdue\b/, /\bbehind\b/];
    for (const sentence of EVERY_SENTENCE) {
      for (const re of BANNED) {
        expect(sentence.toLowerCase()).not.toMatch(re);
      }
    }
  });

  it('says what it DOES say — absence alone is not the rule', () => {
    // Three absence tests can all pass on "they haven't gotten back to you
    // yet". The sanctioned phrasing is positive and specific.
    const s = actionAskPrefill(
      at({ status: 'completed', completed_at: '2026-08-20', follow_up_date: '2026-09-20' }),
      { today: '2026-10-14' }
    );
    expect(s).toContain('An answer on it is past due.');
    // The subject of that sentence is the ANSWER, not a person.
    expect(s).not.toMatch(/\b(they|the county|the agency|the regional center)\b/i);
  });
});

describe('composer mechanics', () => {
  it('ends with a space so the caret sits ready for the question', () => {
    for (const locale of LOCALES) {
      const s = actionAskPrefill(at({ status: 'completed' }), { locale, today: '2026-10-14' });
      expect(s.endsWith(' ')).toBe(true);
      expect(s.trim().length).toBeGreaterThan(0);
    }
  });

  it('stays far under the composer\'s 2000-char limit, even with a long title', () => {
    const s = actionAskPrefill(
      at({
        title: 'x'.repeat(300),
        status: 'in_progress',
        due_date: '2026-08-24',
        steps: Array.from({ length: 40 }, () => ({ step: 'a', done: false })) as any,
      }),
      { childFirstName: 'Benjamin', today: '2026-10-14' }
    );
    expect(s.length).toBeLessThan(600);
  });
});

describe('trilingual parity', () => {
  it('every locale produces a non-empty, distinct sentence for every status', () => {
    for (const status of ['not_started', 'in_progress', 'completed', 'dismissed'] as const) {
      const byLocale = LOCALES.map((locale) =>
        actionAskPrefill(at({ status, completed_at: '2026-10-02' }), { locale, today: '2026-10-14' })
      );
      for (const s of byLocale) expect(s.trim().length).toBeGreaterThan(10);
      // Translated, not copy-pasted English.
      expect(new Set(byLocale).size).toBe(3);
      // The title is a proper noun — it survives translation untouched.
      for (const s of byLocale) expect(s).toContain('Apply for Medi-Cal');
    }
  });

  it('an unknown locale falls back to English rather than rendering blank', () => {
    const s = actionAskPrefill(at({}), { locale: 'fr' as ActionLocale, today: '2026-10-14' });
    expect(s).toContain("haven't started");
  });

  it('the label and hint are translated too', () => {
    expect(new Set(LOCALES.map(actionAskLabel)).size).toBe(3);
    expect(new Set(LOCALES.map(actionAskHint)).size).toBe(3);
    for (const locale of LOCALES) expect(actionAskLabel(locale).length).toBeGreaterThan(0);
  });
});

describe('the year, which the first build dropped', () => {
  it('carries the year when the day is not in the current one', () => {
    // Without this, a deadline 14 months old and one 7 weeks old produce
    // byte-identical sentences — and the model is told the wrong thing about
    // which clock the family is on.
    const lastYear = actionAskPrefill(at({ due_date: '2025-08-24' }), { today: '2026-10-14' });
    const thisYear = actionAskPrefill(at({ due_date: '2026-08-24' }), { today: '2026-10-14' });
    expect(lastYear).toContain('Aug 24, 2025');
    expect(lastYear).not.toBe(thisYear);
  });

  it('leaves the year off when it is this year — the chip does the same', () => {
    const s = actionAskPrefill(at({ due_date: '2026-08-24' }), { today: '2026-10-14' });
    expect(s).toContain('Aug 24,');
    expect(s).not.toContain('2026');
  });

  it('carries the year on a completion date too', () => {
    const s = actionAskPrefill(at({ status: 'completed', completed_at: '2024-10-02' }), {
      today: '2026-10-14',
    });
    expect(s).toContain('2024');
  });

  it('writes the month in the parent\'s language, not English', () => {
    const es = actionAskPrefill(at({ due_date: '2026-08-24' }), {
      locale: 'es',
      today: '2026-10-14',
    });
    // "24 ago" / "24 de agosto" — what matters is that it is NOT "Aug".
    expect(es).not.toContain('Aug');
  });
});

describe('in progress, at both ends of the step list', () => {
  const steps = (done: number, total: number) =>
    Array.from({ length: total }, (_, i) => ({ step: `s${i}`, done: i < done })) as any;

  it('does not say "part-way through" when every step is checked', () => {
    const s = actionAskPrefill(at({ status: 'in_progress', steps: steps(3, 3) }), {
      today: '2026-10-14',
    });
    expect(s).not.toContain('part-way');
    expect(s).toContain("isn't marked done");
  });

  it('does not say "part-way through" when no step is checked', () => {
    const s = actionAskPrefill(at({ status: 'in_progress', steps: steps(0, 2) }), {
      today: '2026-10-14',
    });
    expect(s).not.toContain('part-way');
    expect(s).toContain('none of its 2 steps');
  });

  it('still says "part-way through" in the middle, where it is true', () => {
    const s = actionAskPrefill(at({ status: 'in_progress', steps: steps(1, 3) }), {
      today: '2026-10-14',
    });
    expect(s).toContain('1 of 3 steps done');
  });
});

describe('titles are parent-written, so they are bounded and quoted', () => {
  it('clips a very long title instead of overrunning the composer', () => {
    const s = actionAskPrefill(at({ title: 'Ask the Regional Center '.repeat(40) }), {
      today: '2026-10-14',
    });
    // Now actually enforced by the code, not merely observed by the test.
    expect(s.length).toBeLessThan(300);
    expect(s).toContain('…');
  });

  it('a title containing a quote mark still reads as one quoted title', () => {
    const s = actionAskPrefill(at({ title: 'Ask why they said "no"' }), { today: '2026-10-14' });
    expect(s).toContain('“Ask why they said \'no\'”');
  });

  it('collapses newlines a pasted title can carry', () => {
    const s = actionAskPrefill(at({ title: 'Apply for\n\n  Medi-Cal' }), { today: '2026-10-14' });
    expect(s).toContain('Apply for Medi-Cal');
  });
});
