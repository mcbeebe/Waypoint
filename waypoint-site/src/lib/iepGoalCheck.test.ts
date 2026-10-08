import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GOAL_PARTS,
  MAX_GOAL_LENGTH,
  checkGoal,
  joinPhrases,
  normalizeGoal,
  type GoalPartId,
} from './iepGoalCheck';

const presentIds = (goal: string): GoalPartId[] =>
  checkGoal(goal)!
    .parts.filter((p) => p.present)
    .map((p) => p.id);

const STRONG =
  'By May 2027, when given a grade-level passage, Maya will answer 4 of 5 comprehension questions correctly in 3 of 4 trials, as measured by teacher-charted data.';

describe('checkGoal — ratings', () => {
  it('rates a goal with all five parts as strong and asks for nothing', () => {
    const r = checkGoal(STRONG)!;
    expect(r.rating).toBe('strong');
    expect(r.found).toBe(5);
    expect(r.ask).toBeNull();
  });

  it('rates the classic vague goal as needs work, with all five missing', () => {
    const r = checkGoal('Maya will improve her reading skills.')!;
    expect(r.rating).toBe('needs-work');
    expect(r.found).toBe(0);
    expect(r.ask).toContain('a date it should be met by');
    expect(r.ask).toContain('how progress will be measured');
  });

  it('rates 3–4 parts as adequate and names only what is missing', () => {
    const r = checkGoal(
      'Given a visual schedule, Maya will transition between activities within 2 minutes in 4 of 5 opportunities by June 2027.',
    )!;
    expect(r.rating).toBe('adequate');
    expect(r.found).toBe(4);
    expect(r.ask).toBe(
      'Could we add how progress will be measured to this goal, so we can all track progress the same way?',
    );
  });

  it('returns null for text too short to be a goal', () => {
    expect(checkGoal('')).toBeNull();
    expect(checkGoal('   reading   ')).toBeNull();
  });

  it('keeps every part in a stable order matching GOAL_PARTS', () => {
    expect(checkGoal(STRONG)!.parts.map((p) => p.id)).toEqual(GOAL_PARTS.map((p) => p.id));
  });
});

describe('checkGoal — timeframe', () => {
  it.each([
    'By June 2027, Maya will write a paragraph.',
    'Within one year, Maya will write a paragraph.',
    'Maya will write a paragraph by the end of the IEP year.',
    'Maya will write a paragraph by her annual review.',
    'Maya will write a paragraph by 6/2027.',
    'In 36 weeks Maya will write a paragraph... by the end of 36 weeks.',
    'Maya will write a paragraph by the end of the school year.',
  ])('finds a timeframe in %j', (g) => {
    expect(presentIds(g)).toContain('timeframe');
  });

  it.each([
    // a measurement method mentioning a period is not a deadline
    'Maya will write a paragraph, measured by work samples each trimester.',
    // "by the IEP team" names people, not a date
    'Maya will write a paragraph as agreed by the IEP team.',
    // a duration inside the skill is not a deadline
    'Maya will start a task within 2 minutes of the request.',
  ])('does not invent a timeframe in %j', (g) => {
    expect(presentIds(g)).not.toContain('timeframe');
  });
});

describe('checkGoal — conditions', () => {
  it.each([
    'When given a grade-level passage, Maya will read aloud.',
    'Using a graphic organizer, Maya will write a paragraph.',
    'With a visual timer, Maya will stay with the group.',
    'During independent work, Maya will ask for help.',
    'In the general education classroom, Maya will ask for help.',
    'Following a teacher model, Maya will solve the problem.',
  ])('finds conditions in %j', (g) => {
    expect(presentIds(g)).toContain('conditions');
  });

  it.each([
    'Maya will answer questions with 80% accuracy.',
    'Maya will improve at following two-step directions.',
  ])('does not count accuracy or a skill phrase as a condition in %j', (g) => {
    expect(presentIds(g)).not.toContain('conditions');
  });
});

describe('checkGoal — observable skill', () => {
  it.each([
    'Maya will write a five-sentence paragraph.',
    'Maya will independently request a break.',
    'Maya will be able to name 20 sight words.',
    'Maya will demonstrate the steps of long division.',
    'Maya will increase oral reading fluency from 60 to 90 words correct per minute.',
    'Maya will reduce call-outs to 2 per class period.',
  ])('finds a skill in %j', (g) => {
    expect(presentIds(g)).toContain('skill');
  });

  it.each([
    'Maya will improve her reading skills.',
    'Maya will understand fractions.',
    'Maya will demonstrate an understanding of fractions.',
    'Maya will show improvement in writing.',
    'Maya will work on her social skills.',
    'Maya will increase her self-regulation.',
    'Maya will be aware of her emotions.',
    'Maya reads well.',
  ])('flags no observable skill in %j', (g) => {
    expect(presentIds(g)).not.toContain('skill');
  });
});

describe('checkGoal — criterion', () => {
  it.each([
    'Maya will spell words with 80% accuracy.',
    'Maya will spell words correctly in 4 out of 5 trials.',
    'Maya will spell words in three out of four trials.',
    'Maya will stay seated for 10 minutes.',
    'Maya will read 90 words correct per minute.',
    'Maya will answer 4/5 questions.',
  ])('finds a number for how well in %j', (g) => {
    expect(presentIds(g)).toContain('criterion');
  });

  it.each([
    'By May 2027, Maya will spell words.',
    'By 6/2027, Maya will spell words.',
    'By 6/15/2027, Maya will spell words.',
  ])('does not mistake a date for a criterion in %j', (g) => {
    expect(presentIds(g)).not.toContain('criterion');
  });
});

describe('checkGoal — measurement', () => {
  it.each([
    'as measured by teacher-charted data',
    'documented in work samples',
    'based on a running record',
    'per curriculum-based measurement probes',
    'through teacher observation',
  ])('finds a measurement method in %j', (tail) => {
    expect(presentIds(`Maya will write a paragraph, ${tail}.`)).toContain('measurement');
  });

  it('does not find a method where none is named', () => {
    expect(presentIds('Maya will write a paragraph.')).not.toContain('measurement');
  });
});

describe('checkGoal — input handling', () => {
  it('reads a goal pasted from a PDF the same as one typed', () => {
    const pdf = 'By May 2027,\n when given a “grade-level” passage, Maya will\tanswer 4 of 5 questions, as measured by data.';
    expect(checkGoal(pdf)!.rating).toBe('strong');
  });

  it('flags text that looks like several goals pasted together', () => {
    const many = 'Maya will read. Maya will write. Maya will count. Maya will draw.';
    expect(checkGoal(many)!.looksLikeSeveralGoals).toBe(true);
    expect(checkGoal(STRONG)!.looksLikeSeveralGoals).toBe(false);
  });

  it('caps very long input instead of scanning it all', () => {
    const huge = `${STRONG} ${'x'.repeat(MAX_GOAL_LENGTH * 5)}`;
    const t = Date.now();
    expect(checkGoal(huge)).not.toBeNull();
    expect(Date.now() - t).toBeLessThan(200);
  });

  it('does not hang on adversarial input (no catastrophic backtracking)', () => {
    const evil = `by ${'a '.repeat(900)}will ${'improve '.repeat(100)}`;
    const t = Date.now();
    checkGoal(evil);
    expect(Date.now() - t).toBeLessThan(200);
  });
});

describe('helpers', () => {
  it('joinPhrases reads naturally for 0–3 items', () => {
    expect(joinPhrases([])).toBe('');
    expect(joinPhrases(['a'])).toBe('a');
    expect(joinPhrases(['a', 'b'])).toBe('a and b');
    expect(joinPhrases(['a', 'b', 'c'])).toBe('a, b and c');
  });

  it('normalizeGoal collapses whitespace and straightens quotes', () => {
    expect(normalizeGoal('  “hi” \n there ’s ')).toBe('"hi" there \'s');
  });
});

describe('tone (CLAUDE.md escalation rule)', () => {
  it('the ask is a collaborative request, never a demand', () => {
    const ask = checkGoal('Maya will improve her reading skills.')!.ask!;
    expect(ask).toMatch(/^Could we /);
    expect(ask).not.toMatch(/\b(demand|must|require|insist|fail(ed)?|violat)/i);
  });
});

describe('privacy guard — the goal check never leaves the browser', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const FILES = [
    path.join(here, 'iepGoalCheck.ts'),
    path.join(here, 'iepGoalCheckUi.ts'),
  ];
  const FORBIDDEN = [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /sendBeacon/,
    /WebSocket/,
    /localStorage/,
    /sessionStorage/,
    /indexedDB/,
    /document\.cookie/,
    /\bimport\s*\(/,
  ];

  it.each(FILES)('%s contains no network or storage call', (file) => {
    const src = readFileSync(file, 'utf8');
    for (const re of FORBIDDEN) expect(src, `${path.basename(file)} matched ${re}`).not.toMatch(re);
  });

  it('analytics never carry the goal text — only tool id, locale and rating', () => {
    const src = readFileSync(FILES[1], 'utf8');
    const calls = src.match(/plausible\?\.\([^)]*\)/gs) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c).not.toMatch(/value|goal\b|text/i);
  });
});
