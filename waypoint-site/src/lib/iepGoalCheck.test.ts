import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COMPLETE, HELDOUT_COMPLETE, HELDOUT_STRIPPED, STRIPPED } from './iepGoalCheck.fixtures';
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

/**
 * Golden set A2 — every wording the second adversarial review reproduced as a
 * false "not spotted" (school-year ranges, all-caps months, seasons, ordinals,
 * on-task intervals, reduction goals, continue-to, leading conditions, "as
 * indicated by", a second "will" in one sentence). All five must be spotted.
 */
describe('golden A2 — review-reproduced complete goals', () => {
  it.each([
 "By the end of the 2026-2027 school year, during toileting routines, Sam will independently use the restroom with 100% accuracy on 5 consecutive days as measured by staff checklist.",
 "By the end of the 2026–27 school year, when given a grade-level passage, Sam will read 90 wcpm as measured by DIBELS.",
 "Within the next 12 months, given a visual schedule, Sam will transition within 2 minutes in 4 of 5 opportunities, as measured by staff data.",
 "By JUNE 2027, when given a writing prompt, Sam will write 5 sentences, as measured by work samples.",
 "by june 2027, during independent work, Sam will complete 4 of 5 math problems, as measured by teacher data.",
 "By spring 2027, during small group, Sam will answer 4 of 5 questions, as measured by teacher probes.",
 "By the end of the first trimester, during recess, Sam will join a game 3 times per week, as measured by staff observation.",
 "By 3rd quarter, in the general education classroom, Sam will ask for help 3 times per day, per teacher report.",
 "By Sam's next annual IEP, given a field of 3, Sam will identify the main idea in 4 of 5 trials, as measured by teacher data.",
 "By the conclusion of this IEP, during transitions, Sam will follow a 2-step direction in 80% of opportunities, as measured by staff data.",
 "By 6-15-2027, given a passage, Sam will retell 3 key events in 4 of 5 trials, as measured by teacher records.",
 "By 06.15.2027, given a passage, Sam will retell 3 key events in 4 of 5 trials, as measured by teacher records.",
 "By May 2027, during independent work, Sam will be on task for 80% of intervals, as measured by teacher data.",
 "By May 2027, during whole-group instruction, Sam will be seated in his chair for 15 minutes, as measured by staff data.",
 "By May 2027, at recess, Sam will decrease tantrums to fewer than 2 per week, as measured by staff logs.",
 "By May 2027, during transitions, Sam will reduce elopement to zero incidents per week, as measured by staff data.",
 "By May 2027, given grade-level text, Sam will increase fluency from 60 wcpm to ninety wcpm, as measured by DIBELS.",
 "By May 2027, during snack, Sam will continue to use his AAC device to request items in 4 of 5 opportunities, as measured by SLP data.",
 "By the end of the IEP period, using manipulatives, Sam will count objects up to 20 with 1:1 correspondence in 4/5 trials as measured by teacher data.",
 "By May 2027, with sentence starters, Sam will write a 3-sentence paragraph in 4 of 5 trials, as measured by work samples.",
 "By May 2027, with 1 verbal prompt, Sam will start a task within 2 minutes in 4 of 5 trials, as measured by staff data.",
 "By May 2027, with fading adult prompts, Sam will pack his backpack in 4 of 5 days, as measured by staff checklist.",
 "By May 2027, after reading a grade-level passage, Sam will answer 4 of 5 questions, as measured by teacher probes.",
 "By May 2027, when Sam becomes frustrated, Sam will request a break in 4 of 5 opportunities, as measured by staff data.",
 "By May 2027, when it is time to transition, Sam will move to the next activity within 1 minute in 80% of opportunities, as measured by staff data.",
 "By May 2027, in a 1:1 setting, Sam will produce /s/ in words with 80% accuracy, as measured by SLP data.",
 "By May 2027, in the presence of peers, Sam will greet a peer 3 times per day, as measured by staff observation.",
 "By May 2027, in response to a peer greeting, Sam will respond verbally in 4 of 5 opportunities, as measured by staff data.",
 "By May 2027, at the sentence level, Sam will use regular past tense in 80% of opportunities, as measured by SLP probes.",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions, as indicated by teacher data.",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions, as shown by work samples.",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions, as noted in teacher records.",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions by teacher observation.",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions (teacher observation).",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions. Data will be collected weekly by the SLP.",
 "By May 2027, given a passage, Sam will answer 4 of 5 questions, according to the SLP.",
 "By May 2027, with staff support, the teacher will provide a visual schedule and Sam will request a break in 4 of 5 trials as measured by staff data.",
  ])('%s', (goal) => {
    expect(checked(goal).parts.filter((p) => !p.present).map((p) => p.id)).toEqual([]);
  });
});

/**
 * Golden set B — the other error direction: a goal missing a part must keep
 * it missing, or a parent is told a goal is complete and never asks.
 */
describe('golden B — a missing part stays missing', () => {
  it.each([
 ["By May 2027, Sam will write a paragraph with an accuracy of 80%, as measured by work samples.","conditions"],
 ["By May 2027, Sam will spell words with one hundred percent accuracy, as measured by teacher data.","conditions"],
 ["By May 2027, Sam will answer questions in 4 of 5 trials with the SLP measuring progress through probes.","conditions"],
 ["During the 2026-27 school year, Sam will answer 4 of 5 questions, as measured by teacher data.","conditions"],
 ["By May 2027, Sam will answer 4 of 5 questions, with data collected during the year by the teacher.","conditions"],
 ["Sam will answer questions by marking the picture in 4 of 5 trials.","timeframe"],
 ["Given a passage read by the teacher, Maya will retell it in 4 of 5 trials.","timeframe"],
 ["Sam will be aware of his emotions.","skill"],
 ["Sam will continue to improve his reading.","skill"],
 ["By May 2027, Sam will read charts and graphs.","measurement"],
 ["Sam will improve reading by 50%.","skill"],
  ] as Array<[string, GoalPartId]>)('%s → %s not spotted', (goal, id) => {
    expect(presentIds(goal)).not.toContain(id);
  });
});

describe('declined input', () => {
  it.each([
    'Maya reads well.',
    'Baseline: As of 9/2026, Sam completes 2 of 5 tasks independently, per teacher data.',
    'The district provides 30 minutes of speech therapy 2 times per week.',
  ])('declines text with no "will"/"shall" as not a goal: %j', (g) => {
    expect(checkGoal(g)).toEqual({ kind: 'not-a-goal' });
  });

  it.each([
    'Đến tháng 5 năm 2027, khi được đưa một đoạn văn, Minh sẽ trả lời đúng 4 trên 5 câu hỏi.',
    '到2027年5月，在给定一段文章时，小明将正确回答5个问题中的4个。',
  ])('declines Vietnamese and Chinese as not English, never "not a goal": %s', (g) => {
    expect(checkGoal(g)).toEqual({ kind: 'not-english' });
  });

  it('reads a short English goal for a child with an accented name', () => {
    expect(checkGoal('Sofía Núñez will read 90 wcpm per DIBELS.')!.kind).toBe('checked');
  });
});

/**
 * Independent corpora (third adversarial review): written by someone other
 * than the rules' author, balanced across both error directions.
 */
describe('independent corpus — complete goals (all five spotted)', () => {
  it.each(COMPLETE)('[%s] %s', (_domain, goal) => {
    expect(checked(goal).parts.filter((p) => !p.present).map((p) => p.id)).toEqual([]);
  });
});

describe('independent corpus — stripped goals (the removed part stays not spotted)', () => {
  it.each(STRIPPED)('%s → %s', (goal, id) => {
    expect(presentIds(goal)).not.toContain(id);
  });
});

describe('held-out corpus (fourth review) — complete goals', () => {
  it.each(HELDOUT_COMPLETE.map((g) => [g.id, g.text]))('%s %s', (_id, goal) => {
    expect(checked(goal).parts.filter((p) => !p.present).map((p) => p.id)).toEqual([]);
  });
});

/** Known, documented misses: debatable edge cases, not silently dropped. */
const KNOWN_FALSE_SPOTTED = new Set(['s62']);

describe('held-out corpus (fourth review) — stripped goals', () => {
  it.each(HELDOUT_STRIPPED.filter((g) => !KNOWN_FALSE_SPOTTED.has(g.id)).map((g) => [g.id, g.text, g.missing!] as const))(
    '%s %s → %s not spotted',
    (_id, goal, id) => {
      const r = checkGoal(goal);
      if (r && r.kind === 'checked') expect(r.parts.find((p) => p.id === id)!.present).toBe(false);
    },
  );

  it('the known miss is still the only one (update KNOWN_FALSE_SPOTTED if it changes)', () => {
    const misses = HELDOUT_STRIPPED.filter((g) => {
      const r = checkGoal(g.text);
      return r?.kind === 'checked' && r.parts.find((p) => p.id === g.missing)!.present;
    }).map((g) => g.id);
    expect(misses).toEqual([...KNOWN_FALSE_SPOTTED]);
  });
});

describe('verb-first goals', () => {
  it('reads "Annual goal: Increase…" as a goal instead of declining it', () => {
    const r = checkGoal('Annual goal: Increase reading fluency to 90 wcpm by May 2027 as measured by DIBELS.');
    expect(r!.kind).toBe('checked');
  });

  it('still declines a baseline with no goal label and no "will"', () => {
    expect(checkGoal('Baseline: Sam reads 60 wcpm on a 2nd grade passage.')).toEqual({ kind: 'not-a-goal' });
  });

  it('does not count an IEP header date as the timeframe', () => {
    expect(presentIds('IEP date 10/14/2026. Given a passage, Sam will answer 4 of 5 questions, as measured by teacher data.')).not.toContain('timeframe');
  });
});

describe('false "spotted" probes from the third review', () => {
  it.each([
    ['By May 2027, using a hundreds chart, Sam will count to 100 in 4 of 5 trials.', 'measurement'],
    ['By May 2027, given a passage, Sam will master grade-level reading with 80% accuracy, as measured by teacher data.', 'skill'],
    ['By May 2027, Sam will comprehend grade-level text with 80% accuracy, as measured by teacher data.', 'skill'],
    ['By May 2027, Sam will work to improve his writing in 4 of 5 trials, as measured by work samples.', 'skill'],
    ['By May 2027, Sam will be more independent 80% of the time, as measured by staff data.', 'skill'],
    ['Sam will be provided 30 minutes of speech therapy 2x weekly.', 'skill'],
    ['By May 2027, given 3-step directions, Sam will follow directions, as measured by teacher data.', 'criterion'],
    ['By May 2027, Sam will initiate play with a peer 3 times per day, as measured by staff observation.', 'conditions'],
    ['By May 2027, Sam will write sentences using correct capitalization in 4 of 5 trials, as measured by work samples.', 'conditions'],
    ['By May 2027, Sam will be given 30 minutes of speech therapy weekly.', 'conditions'],
    ['IEP Goal #2, Sam will improve his reading skills.', 'conditions'],
    ['Goal 1 Reading Fluency, Sam will read more fluently.', 'conditions'],
    ['Based on his baseline, Sam will read more fluently.', 'conditions'],
    ['In the area of reading, Sam will read more fluently.', 'conditions'],
    ['By May 2027, Sam will name the items shown in the picture in 4 of 5 trials.', 'measurement'],
  ] as Array<[string, GoalPartId]>)('%s → %s not spotted', (goal, id) => {
    expect(presentIds(goal)).not.toContain(id);
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
    // the size of the task is not how well it is done
    'Maya will write a 5-sentence paragraph.',
    'Maya will follow 3-step directions.',
    'Goal 1 of 3: By May 2027, Maya will improve her reading.',
  ])('does not mistake a date, task size, or goal number for a criterion in %j', (g) => {
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
    path.join(here, 'appLinks.ts'),
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
    /new\s+Image\b/,
    /location\.(?:assign|replace|href\s*=)/,
    /window\.open\b/,
    /postMessage\b/,
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
