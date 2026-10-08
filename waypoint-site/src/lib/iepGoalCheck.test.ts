import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  GOAL_PARTS,
  MAX_GOAL_LENGTH,
  checkGoal,
  joinPhrases,
  looksNotEnglish,
  normalizeGoal,
  type GoalCheckResult,
  type GoalPartId,
} from './iepGoalCheck';

function checked(goal: string): GoalCheckResult {
  const r = checkGoal(goal);
  if (!r || r.kind !== 'checked') throw new Error(`expected a checked result for ${JSON.stringify(goal)}`);
  return r;
}
const presentIds = (goal: string): GoalPartId[] =>
  checked(goal)
    .parts.filter((p) => p.present)
    .map((p) => p.id);

const STRONG =
  'By May 2027, when given a grade-level passage, Maya will answer 4 of 5 comprehension questions correctly in 3 of 4 trials, as measured by teacher-charted data.';

describe('checkGoal — ratings', () => {
  it('rates a goal with all five parts as strong and asks for nothing', () => {
    const r = checked(STRONG);
    expect(r.rating).toBe('strong');
    expect(r.found).toBe(5);
    expect(r.ask).toBeNull();
  });

  it('rates the classic vague goal as needs work, with all five not spotted', () => {
    const r = checked('Maya will improve her reading skills.');
    expect(r.rating).toBe('needs-work');
    expect(r.found).toBe(0);
    expect(r.ask).toBe(
      'Could we add a date it should be met by, the conditions it will be measured under, the specific skill we will see, a number for how well, and how progress will be measured to this goal, so we can all track progress the same way?',
    );
  });

  it('rates 3–4 parts as adequate and names only what was not spotted', () => {
    const r = checked(
      'Given a visual schedule, Maya will transition between activities within 2 minutes in 4 of 5 opportunities by June 2027.',
    );
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
    expect(checked(STRONG).parts.map((p) => p.id)).toEqual(GOAL_PARTS.map((p) => p.id));
  });
});

/**
 * Golden set: complete, realistic goals written the many ways California
 * goal banks write them. Each must be rated strong. Several were rated
 * "needs work" by the first version — the worst failure this tool can have.
 */
describe('golden — well-written goals are never marked deficient', () => {
  it.each([
    STRONG,
    'In 12 months, when given a grade-level passage, Maya will read 90 wcpm, as measured by DIBELS.',
    'Within one year, given a writing prompt and a graphic organizer, Maya will write a five-sentence paragraph with 80% accuracy, as measured by work samples.',
    'By the next IEP meeting, when frustrated, Maya will request a break using her break card in 4 of 5 opportunities, as documented in staff data.',
    'By the end of the IEP, during independent work, Maya will demonstrate the ability to answer 4 of 5 inferential questions, as measured by teacher probes.',
    'By June 2027, Maya will, when given a passage, answer 4 of 5 questions correctly, as determined by the teacher.',
    'By May 2027, at recess, Maya shall initiate play with a peer at least 3 times per week, per teacher report.',
    'By June 2027, on the playground, Maya will use words to resolve conflict, reducing incidents to 1 per week, as monitored by the SLP.',
    'By May 2027, across 3 school settings, Maya will follow 3-step directions with no more than 1 prompt in 80% of opportunities, as measured by teacher observation.',
    'By June 2027, in speech therapy sessions, Maya will produce /r/ in words with eighty percent accuracy, based on SLP data.',
    'By the annual review, upon arrival at school, Maya will unpack and start her morning work within 5 minutes on 4 of 5 days, as recorded on a daily checklist.',
    'By May 2027, when given a rubric, Maya will write an opinion piece that scores 3 or higher, as measured by the district writing rubric.',
    'By May 2027, given a field of 3, Maya will demonstrate knowledge of the main idea by answering 4 of 5 questions, according to teacher-charted data.',
    'Within 36 weeks, given grade-level text, Maya will increase oral reading fluency from 60 to 90 words correct per minute, as measured by curriculum-based measurement probes.',
  ])('%s', (goal) => {
    const r = checked(goal);
    expect(r.parts.filter((p) => !p.present).map((p) => p.id)).toEqual([]);
    expect(r.rating).toBe('strong');
  });
});

describe('timeframe', () => {
  it.each([
    'By June 2027, Maya will write a paragraph.',
    'Within one year, Maya will write a paragraph.',
    'In 12 months Maya will write a paragraph.',
    'Maya will write a paragraph by the end of the IEP year.',
    'Maya will write a paragraph by the end of the IEP.',
    'Maya will write a paragraph by her annual review.',
    'Maya will write a paragraph by the next IEP meeting.',
    'Maya will write a paragraph by 6/2027.',
    'Maya will write a paragraph by 6/15/2027.',
    'Maya will write a paragraph by 6/27.',
    'Maya will write a paragraph by the end of the school year.',
    'Maya will write a paragraph by the end of May.',
  ])('finds a timeframe in %j', (g) => {
    expect(presentIds(g)).toContain('timeframe');
  });

  it.each([
    'Maya will write a paragraph, measured by work samples each trimester.',
    'Maya will write a paragraph as agreed by the IEP team.',
    'Maya will start a task within 2 minutes of the request.',
    // words that merely begin like a month
    'Maya will answer questions by marking the correct picture.',
    'Maya will read new words by decoding them.',
    'Given a passage read by the teacher, Maya will retell it.',
    'Maya will read aloud by Mayra in the group.',
    'Maya will sort cards by separating them into two piles.',
    'Maya will greet staff; by then she may join the group.',
  ])('does not invent a timeframe in %j', (g) => {
    expect(presentIds(g)).not.toContain('timeframe');
  });
});

describe('conditions', () => {
  it.each([
    'When given a grade-level passage, Maya will read aloud.',
    'When verbally prompted, Maya will read aloud.',
    'Using a graphic organizer, Maya will write a paragraph.',
    'With a visual timer, Maya will stay with the group.',
    'During independent work, Maya will ask for help.',
    'In the general education classroom, Maya will ask for help.',
    'Following a teacher model, Maya will solve the problem.',
    'At recess, Maya will join a game.',
    'On the playground, Maya will join a game.',
    'Across 3 school settings, Maya will greet a peer.',
    'In speech therapy sessions, Maya will name pictures.',
    'Upon arrival at school, Maya will hang up her backpack.',
  ])('finds conditions in %j', (g) => {
    expect(presentIds(g)).toContain('conditions');
  });

  it.each([
    'Maya will answer questions with 80% accuracy.',
    'Maya will improve at following two-step directions.',
    'Maya will copy notes as measured by data from the teacher.',
  ])('does not count accuracy, a skill phrase, or a source as a condition in %j', (g) => {
    expect(presentIds(g)).not.toContain('conditions');
  });
});

describe('observable skill', () => {
  it.each([
    'Maya will write a five-sentence paragraph.',
    'Maya will independently request a break.',
    'Maya will be able to name 20 sight words.',
    'Maya will demonstrate the steps of long division.',
    'Maya will demonstrate the ability to answer 4 of 5 questions.',
    'Maya will demonstrate knowledge of the main idea by answering questions.',
    'Maya will show her understanding by answering questions.',
    'Maya will increase oral reading fluency from 60 to 90 words correct per minute.',
    'Maya will reduce call-outs to 2 per class period.',
    'Maya will, when given a passage, answer questions.',
    'Maya shall answer questions.',
    'Maya will have fewer than 2 meltdowns per week.',
    'Maya will work independently for 10 minutes.',
    'Maya will make a request using her device.',
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
    'Maya will receive speech services 2 times per week.',
    'Teacher will provide Maya with reading support.',
    'Maya will make progress in math.',
    'Maya will have fewer meltdowns.',
    'Maya will maintain appropriate behavior.',
    'Maya will display appropriate behavior.',
    'Maya will exhibit positive behavior.',
    'Maya will utilize appropriate coping skills.',
    'Maya will work towards grade-level reading.',
    'By May 2027, Maya will have improved her behavior by 50%.',
    'Maya reads well.',
  ])('flags no observable skill in %j', (g) => {
    expect(presentIds(g)).not.toContain('skill');
  });
});

describe('criterion', () => {
  it.each([
    'Maya will spell words with 80% accuracy.',
    'Maya will spell words with eighty percent accuracy.',
    'Maya will spell words correctly in 4 out of 5 trials.',
    'Maya will spell words in three out of four trials.',
    'Maya will stay seated for 10 minutes.',
    'Maya will read 90 words correct per minute.',
    'Maya will read 90 wcpm.',
    'Maya will read 90 WPM.',
    'Maya will answer 4/5 questions.',
    'Maya will write a 5-sentence paragraph.',
    'Maya will follow 3-step directions.',
    'Maya will have 0 incidents per week.',
    'Maya will score 3 or higher on the rubric.',
    'Maya will greet at least 2 peers.',
  ])('finds a number for how well in %j', (g) => {
    expect(presentIds(g)).toContain('criterion');
  });

  it.each([
    'By May 2027, Maya will spell words.',
    'By 6/2027, Maya will spell words.',
    'By 6/15/2027, Maya will spell words.',
    'By 6/27, Maya will answer questions correctly.',
    'Maya will work independently by June 2027.',
  ])('does not mistake a date for a criterion in %j', (g) => {
    expect(presentIds(g)).not.toContain('criterion');
  });
});

describe('measurement', () => {
  it.each([
    'as measured by teacher-charted data',
    'documented in work samples',
    'based on a running record',
    'per curriculum-based measurement probes',
    'through teacher observation',
    'as determined by the teacher',
    'per teacher report',
    'as monitored by the SLP',
    'as measured by DIBELS',
  ])('finds a measurement method in %j', (tail) => {
    expect(presentIds(`Maya will write a paragraph, ${tail}.`)).toContain('measurement');
  });

  it.each([
    'Maya will write a paragraph.',
    'Maya will read charts and graphs.',
    'Maya will record her answers on a log.',
    'Maya will take tests calmly.',
  ])('does not find a method in %j', (g) => {
    expect(presentIds(g)).not.toContain('measurement');
  });
});

describe('language', () => {
  const SPANISH =
    'Para mayo de 2027, dado un texto de nivel de grado, Maya responderá 4 de 5 preguntas correctamente, según los datos del maestro.';

  it('declines Spanish instead of reporting every part missing', () => {
    expect(checkGoal(SPANISH)).toEqual({ kind: 'not-english' });
    expect(looksNotEnglish(SPANISH)).toBe(true);
  });

  it('still reads English goals that mention a Spanish name or word', () => {
    expect(looksNotEnglish(STRONG)).toBe(false);
    expect(checkGoal('By May 2027, Sofía will read "la casa" and 9 other Spanish words, as measured by data.')!.kind).toBe(
      'checked',
    );
  });
});

describe('input handling', () => {
  it('reads a goal pasted from a PDF the same as one typed', () => {
    const pdf =
      'By May 2027,\n when given a “grade-level” passage, Maya will\tanswer 4 of 5 questions, as measured by data.';
    expect(checked(pdf).rating).toBe('strong');
  });

  it('flags text that looks like several goals pasted together', () => {
    const many = 'Maya will read. Maya will write. Maya will count. Maya will draw.';
    expect(checked(many).looksLikeSeveralGoals).toBe(true);
    expect(checked(STRONG).looksLikeSeveralGoals).toBe(false);
  });

  it('does not call one goal with three "will" clauses several goals', () => {
    const one =
      'By May 2027, when frustrated, Maya will request a break, will use a calming strategy, and will return to task within 5 minutes in 4 of 5 opportunities, as measured by staff data.';
    const r = checked(one);
    expect(r.looksLikeSeveralGoals).toBe(false);
    expect(r.rating).toBe('strong');
  });

  it('caps very long input instead of scanning it all', () => {
    const huge = `${STRONG} ${'x'.repeat(MAX_GOAL_LENGTH * 5)}`;
    const t = Date.now();
    expect(checkGoal(huge)).not.toBeNull();
    expect(Date.now() - t).toBeLessThan(200);
  });

  it('does not hang on adversarial input (no catastrophic backtracking)', () => {
    const inputs = [
      `by ${'a '.repeat(900)}will ${'improve '.repeat(100)}`,
      `will , ${'x'.repeat(80)}${', '.repeat(400)}`,
      `${'by the the the '.repeat(120)}IEP`,
      `${'1 / '.repeat(500)}`,
    ];
    for (const evil of inputs) {
      const t = Date.now();
      checkGoal(evil);
      expect(Date.now() - t).toBeLessThan(200);
    }
  });
});

describe('helpers', () => {
  it('joinPhrases reads naturally, with a serial comma', () => {
    expect(joinPhrases([])).toBe('');
    expect(joinPhrases(['a'])).toBe('a');
    expect(joinPhrases(['a', 'b'])).toBe('a and b');
    expect(joinPhrases(['a', 'b', 'c'])).toBe('a, b, and c');
  });

  it('normalizeGoal collapses whitespace and straightens quotes', () => {
    expect(normalizeGoal('  “hi” \n there ’s ')).toBe('"hi" there \'s');
  });
});

describe('tone (CLAUDE.md escalation rule)', () => {
  it('the ask is a collaborative request, never a demand', () => {
    const ask = checked('Maya will improve her reading skills.').ask!;
    expect(ask).toMatch(/^Could we /);
    expect(ask).not.toMatch(/\b(demand|must|require|insist|fail(ed)?|violat)/i);
  });
});

describe('privacy guard — the goal check never sends what a parent pastes', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const FILES = [
    path.join(here, 'iepGoalCheck.ts'),
    path.join(here, 'iepGoalCheckUi.ts'),
    path.join(here, '..', 'components', 'GoalCheck.astro'),
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
    /<form\b/,
  ];

  it.each(FILES)('%s contains no network, storage, or form submission', (file) => {
    const src = readFileSync(file, 'utf8');
    for (const re of FORBIDDEN) expect(src, `${path.basename(file)} matched ${re}`).not.toMatch(re);
  });

  it('the widget only imports the goal-check modules', () => {
    const src = readFileSync(FILES[2], 'utf8');
    const script = src.slice(src.indexOf('<script>'), src.indexOf('</script>'));
    const imports = [...script.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual(['../lib/iepGoalCheckUi']);
  });

  it('the textarea opts out of browser spellcheck and autofill services', () => {
    const src = readFileSync(FILES[2], 'utf8');
    expect(src).toMatch(/spellcheck="false"/);
    expect(src).toMatch(/autocomplete="off"/);
  });

  it('analytics never carry the goal text — only tool id, locale and rating', () => {
    const src = readFileSync(FILES[1], 'utf8');
    const calls = src.match(/plausible\?\.\([^)]*\)/gs) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) expect(c).not.toMatch(/value|goal\b|text/i);
  });
});
