/**
 * IEP goal check — pure, rule-based, browser-only (initiative 013, option A).
 *
 * Checks whether ONE annual goal names the five parts that make a goal
 * measurable. It reads the words, not the child: it never judges whether a
 * goal is appropriate, ambitious, or legally sufficient. Nothing here touches
 * the network or storage — a guard test enforces that, because the privacy
 * promise on the page ("nothing you paste leaves your browser") is only as
 * good as this file.
 */

export type GoalPartId = 'timeframe' | 'conditions' | 'skill' | 'criterion' | 'measurement';

export interface GoalPart {
  id: GoalPartId;
  /** Short name shown as the checklist row. */
  label: string;
  /** Phrase used inside the friendly ask ("Could we add …"). */
  askPhrase: string;
  /** What to look for when the part is missing. */
  hint: string;
}

export type GoalRating = 'strong' | 'adequate' | 'needs-work';

export interface GoalCheckResult {
  rating: GoalRating;
  /** How many of the five parts were found. */
  found: number;
  parts: Array<GoalPart & { present: boolean }>;
  /** A collaborative request naming what is missing; null when nothing is. */
  ask: string | null;
  /** True when the text looks like more than one goal pasted together. */
  looksLikeSeveralGoals: boolean;
}

export const MIN_GOAL_LENGTH = 15;
export const MAX_GOAL_LENGTH = 2000;

const NUM_WORD = '(?:one|two|three|four|five|six|seven|eight|nine|ten)';
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';

/**
 * Verbs that describe a hoped-for change rather than something a teacher can
 * see or count. "Will improve reading" names no skill; "will read" does.
 */
const VAGUE_VERBS = new Set([
  'understand',
  'develop',
  'learn',
  'know',
  'be',
  'become',
  'appreciate',
  'gain',
  'enhance',
  'continue',
  'feel',
  'grow',
  'progress',
  'strengthen',
  'demonstrate',
  'show',
  'try',
]);

/**
 * Change verbs that become measurable once the clause names a target
 * ("will increase oral reading fluency from 60 to 90 words correct per
 * minute"). Without a number they say only that something should change.
 */
const CHANGE_VERBS = new Set(['improve', 'increase', 'decrease', 'reduce']);

/**
 * "demonstrate"/"show" are vague only when followed by an abstraction
 * ("demonstrate an understanding of"); "demonstrate the steps of" is fine.
 */
const VAGUE_OBJECT = /^(?:an?\s+|the\s+|their\s+|his\s+|her\s+)?(?:understanding|knowledge|improvement|improved|growth|progress|awareness|ability|skills?|competence|mastery|appreciation)\b/i;

export const GOAL_PARTS: readonly GoalPart[] = [
  {
    id: 'timeframe',
    label: 'A timeframe',
    askPhrase: 'a date it should be met by',
    hint: 'When should this be met? For example "By May 2027" or "within one year".',
  },
  {
    id: 'conditions',
    label: 'The conditions',
    askPhrase: 'the conditions it will be measured under',
    hint: 'Under what circumstances? For example "when given a grade-level passage" or "with a visual schedule".',
  },
  {
    id: 'skill',
    label: 'An observable skill',
    askPhrase: 'the specific skill we will see',
    hint: 'Something you can see or count — "will write", "will answer", "will ask for a break" — rather than "will improve" or "will understand".',
  },
  {
    id: 'criterion',
    label: 'How well — a number',
    askPhrase: 'a number for how well',
    hint: 'A target you can measure: "4 of 5", "80% accuracy", "in 3 of 4 trials", "for 10 minutes".',
  },
  {
    id: 'measurement',
    label: 'How it will be measured',
    askPhrase: 'how progress will be measured',
    hint: 'Who tracks it and how — "as measured by teacher-charted data", "work samples", "observation".',
  },
];

const TIMEFRAME = new RegExp(
  [
    // "by May 2027", "by the end of the IEP year", "within one year", "by 6/2027"
    // Not after "measured by" etc. — "measured by records each trimester" is a
    // method, not a deadline.
    `(?<!(?:measured|documented|recorded|observed|charted|evidenced|assessed|reported|collected|graphed|tracked) )\\b(?:by|within|before|on or before|at the end of|by the end of|over the next|in the next)\\b[^.;]{0,40}?\\b(?:\\d{4}|\\d{1,2}/\\d{2,4}|(?:${NUM_WORD}|\\d+)\\s+(?:years?|months?|weeks?)\\b|(?:school |calendar |IEP )?years?\\b|semesters?\\b|trimesters?\\b|quarters?\\b|grading periods?\\b|annual (?:IEP|review|goal)|IEP (?:year|period|term|date|cycle)|(?:annual|next|IEP) review|${MONTH})`,
    // a bare "May 2027" / "June of 2027"
    `\\b${MONTH}\\s+(?:of\\s+)?\\d{4}\\b`,
    // "annual goal date", "by the next annual review"
    `\\bannual review\\b`,
  ].join('|'),
  'i',
);

const CONDITIONS =
  /\b(?:given|when (?:given|presented|asked|provided|shown|prompted|offered|faced|frustrated|upset)|using|during|after (?:a|an|the|being|lunch|recess)\b|following (?:a|an|the) (?:[a-z-]+ )?(?:model|prompt|demonstration|cue|break|request|mini-lesson)|across (?:settings|environments|school)|in (?:the )?(?:general education|classroom|class|small[- ]group|large[- ]group|whole[- ]group|lunch|recess|community|home)|with(?:out)? (?:an? |the )?(?:visual|verbal|gestural|adult|teacher|peer|graphic|picture|written|minimal|no |one |a |an |the |prompts?|cues?|supports?|access|assistive|calculator|manipulatives|scaffold|check)|from (?:a|an|the) )/i;

const CRITERION = new RegExp(
  `(?:\\d+(?:\\.\\d+)?|${NUM_WORD})\\s*(?:%|percent\\b|out of\\s+(?:\\d+|${NUM_WORD})\\b|of\\s+(?:\\d+|${NUM_WORD})\\b|consecutive\\b|trials?\\b|opportunities\\b|attempts?\\b|minutes?\\b|seconds?\\b|times?\\b|words(?:\\s+(?:correct|per))?\\b|sentences?\\b|paragraphs?\\b|days?\\b|sessions?\\b|data points?\\b|probes?\\b|steps?\\b|problems?\\b|questions?\\b|correct\\b)|\\b\\d{1,2}\\s*/\\s*\\d{1,2}\\b(?!/)|\\b(?:accuracy|independently)\\b[^.;]{0,20}\\d`,
  'i',
);

const MEASUREMENT =
  /\b(?:measured by|as measured|as documented|as recorded|as evidenced|data|probes?|observations?|observed by|work samples?|charts?|charted|records?|rubrics?|assessments?|tally|checklists?|curriculum[- ]based|CBM|logs?|graphs?|graphed|progress (?:reports?|monitoring)|running records?|tests?|quizzes|inventory|screeners?)\b/i;

function hasObservableSkill(goal: string): boolean {
  // "will [adverb] [be able to] VERB …" — look at every "will" clause.
  const re = /\bwill\s+(?:\w+ly\s+)?(?:be able to\s+(?:\w+ly\s+)?)?([a-z]+)([^.;]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(goal)) !== null) {
    const verb = m[1].toLowerCase();
    const rest = m[2].trim();
    if (verb === 'demonstrate' || verb === 'show') {
      if (!VAGUE_OBJECT.test(rest)) return true;
      continue;
    }
    if (CHANGE_VERBS.has(verb)) {
      if (/\b(?:from|to)\s+\d/i.test(rest)) return true;
      continue;
    }
    if (verb === 'work' && /^on\b/i.test(rest)) continue;
    if (!VAGUE_VERBS.has(verb)) return true;
  }
  return false;
}

/**
 * Normalizes pasted text: collapses whitespace and curly quotes so a goal
 * copied out of a PDF reads the same as one typed by hand.
 *
 * @param raw - The text exactly as pasted.
 * @returns The trimmed, single-spaced text.
 */
export function normalizeGoal(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Joins phrases as "a, b and c" — the list inside the friendly ask.
 *
 * @param items - Phrases to join.
 * @returns The joined phrase, or "" for an empty list.
 */
export function joinPhrases(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Checks one IEP annual goal for the five parts of a measurable goal.
 *
 * @param raw - The goal as pasted by a parent.
 * @returns The result, or null when the text is too short to be a goal.
 */
export function checkGoal(raw: string): GoalCheckResult | null {
  const goal = normalizeGoal(raw).slice(0, MAX_GOAL_LENGTH);
  if (goal.length < MIN_GOAL_LENGTH) return null;

  const present: Record<GoalPartId, boolean> = {
    timeframe: TIMEFRAME.test(goal),
    conditions: CONDITIONS.test(goal),
    skill: hasObservableSkill(goal),
    criterion: CRITERION.test(goal),
    measurement: MEASUREMENT.test(goal),
  };

  const parts = GOAL_PARTS.map((p) => ({ ...p, present: present[p.id] }));
  const found = parts.filter((p) => p.present).length;
  const rating: GoalRating = found === 5 ? 'strong' : found >= 3 ? 'adequate' : 'needs-work';
  const missing = parts.filter((p) => !p.present).map((p) => p.askPhrase);
  const ask = missing.length
    ? `Could we add ${joinPhrases(missing)} to this goal, so we can all track progress the same way?`
    : null;
  const willClauses = goal.match(/\bwill\b/gi)?.length ?? 0;

  return { rating, found, parts, ask, looksLikeSeveralGoals: willClauses >= 3 };
}

/** Display words for each rating — shared by the page and the homepage embed. */
export const RATING_LABEL: Record<GoalRating, string> = {
  strong: 'Strong',
  adequate: 'Adequate',
  'needs-work': 'Needs work',
};
