/**
 * IEP goal check — pure, rule-based, browser-only (initiative 013, option A).
 *
 * Checks whether ONE annual goal names the five parts that make a goal
 * measurable. It reads the words, not the child: it never judges whether a
 * goal is appropriate, ambitious, or legally sufficient. Nothing here touches
 * the network or storage — a guard test enforces that, because the privacy
 * promise on the page is only as good as this file.
 *
 * Pattern rules miss things. The UI therefore reports a missing part as
 * "not spotted — check the goal", never as a verdict, and the golden tests in
 * iepGoalCheck.test.ts pin the realistic wordings that were once misread.
 */

export type GoalPartId = 'timeframe' | 'conditions' | 'skill' | 'criterion' | 'measurement';

export interface GoalPart {
  id: GoalPartId;
  /** Short name shown as the checklist row. */
  label: string;
  /** Phrase used inside the friendly ask ("Could we add …"). */
  askPhrase: string;
  /** What to look for when the part is not spotted. */
  hint: string;
}

export type GoalRating = 'strong' | 'adequate' | 'needs-work';

export interface GoalCheckResult {
  kind: 'checked';
  rating: GoalRating;
  /** How many of the five parts were spotted. */
  found: number;
  parts: Array<GoalPart & { present: boolean }>;
  /** A collaborative request naming what was not spotted; null when nothing. */
  ask: string | null;
  /** True when the text looks like more than one goal pasted together. */
  looksLikeSeveralGoals: boolean;
}

/** The rules read English wording only; anything else is declined, not rated. */
export interface GoalNotEnglish {
  kind: 'not-english';
}

/** Text with no "will"/"shall" (a baseline, a services line) is declined, not rated. */
export interface GoalNotAGoal {
  kind: 'not-a-goal';
}

export const MIN_GOAL_LENGTH = 15;
export const MAX_GOAL_LENGTH = 2000;

const NUM_WORD =
  '(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)';
const NUMBER = `(?:\\d+(?:\\.\\d+)?|${NUM_WORD})`;
/** Capitalised month names only, so "Maya", "marking", "decoding" never read as dates. */
const MONTHS =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan\\.|Feb\\.|Mar\\.|Apr\\.|Jun\\.|Jul\\.|Aug\\.|Sept?\\.|Oct\\.|Nov\\.|Dec\\.)';

export const GOAL_PARTS: readonly GoalPart[] = [
  {
    id: 'timeframe',
    label: 'A timeframe',
    askPhrase: 'a date it should be met by',
    hint: 'When it should be met, for example "By May 2027" or "within one year".',
  },
  {
    id: 'conditions',
    label: 'The conditions',
    askPhrase: 'the conditions it will be measured under',
    hint: 'The situation it is measured in, for example "when given a grade-level passage" or "with a visual schedule".',
  },
  {
    id: 'skill',
    label: 'An observable skill',
    askPhrase: 'the specific skill we will see',
    hint: 'Something a teacher can see or count, like "will write" or "will ask for a break", rather than "will improve" or "will understand".',
  },
  {
    id: 'criterion',
    label: 'How well, as a number',
    askPhrase: 'a number for how well',
    hint: 'A target you can measure, like "4 of 5", "80% accuracy", "90 words correct per minute", or "for 10 minutes".',
  },
  {
    id: 'measurement',
    label: 'How it will be measured',
    askPhrase: 'how progress will be measured',
    hint: 'Who tracks it and how, like "as measured by teacher-charted data", "work samples", or "observation".',
  },
];

// ─── Timeframe ──────────────────────────────────────────────────────────────

const TIMEFRAME_I = new RegExp(
  [
    // "in 12 months", "within one year", "over the next 36 weeks"
    `\\b(?:in|within|within the next|over the next|in the next|after)\\s+${NUMBER}\\s+(?:school\\s+|calendar\\s+|instructional\\s+)?(?:years?|months?|weeks?)\\b`,
    // "by the end of the IEP year", "by her annual review", "by the next IEP meeting",
    // "by the end of the IEP" — but never "by the IEP team"
    `\\b(?:by|before|on or before|until|through|within)\\s+(?:the\\s+)?(?:(?:end|conclusion|close) of\\s+(?:the\\s+)?)?(?:(?:her|his|their|the|next|current|this|annual|[a-z]+'s|first|second|third|fourth|final|last|\\d(?:st|nd|rd|th)|20\\d\\d\\s*[-\u2013/]\\s*(?:20)?\\d\\d)\\s+)*(?:school year|IEP(?:\\s+(?:year|meeting|review|date|period|term|cycle))?(?!\\s+(?:team|members?|case|manager|coordinator))\\b|annual (?:review|IEP|goal date)|review|year|semester|trimester|quarter|grading period|reporting period|progress report)\\b`,
    // "by 2027", "during the 2026-27 school year"
    `\\b(?:by|before|during|in|through)\\s+(?:the\\s+)?20\\d\\d\\b`,
    // "within a year", "over the next year", "over the course of the IEP", "annually"
    `\\b(?:within|over|in)\\s+(?:a|one|the next|the coming)\\s+(?:school\\s+)?year\\b`,
    `\\bover the course of (?:the|this) (?:IEP|school year|year)\\b`,
    `\\bannually\\b`,
    // grade milestones, typical of transition goals: "by the end of 11th grade"
    `\\b(?:by|before) the end of (?:the )?(?:preschool|pre-k|kindergarten|transitional kindergarten|TK)(?: year)?\\b`,
    `\\b(?:by|before) the end of (?:\\d{1,2}(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\\s+grade\\b`,
    `\\bupon (?:the )?completion of (?:\\d{1,2}(?:st|nd|rd|th)|eleventh|twelfth)\\s+grade\\b`,
    // "by next May", even typed in lower case — "next" makes it a date, never the verb "may"
    `\\bby next (?:january|february|march|april|may|june|july|august|september|october|november|december|week|month|year|semester|trimester|quarter)\\b`,
    // seasons: "by spring 2027", "by the end of spring semester"
    `\\b(?:by|before|in|until|through|end of)\\s+(?:the\\s+)?(?:spring|summer|fall|autumn|winter)\\s+(?:of\\s+)?(?:20\\d\\d|semester|term|trimester|quarter|break)\\b`,
    // months in ANY case, but only with a day or year after them ("by JUNE 2027")
    `\\b(?:by|before|in|until|through|end of|on or before)\\s+(?:the end of\\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\\.?\\s+(?:\\d{1,2}(?:st|nd|rd|th)?,?\\s+)?(?:of\\s+)?(?:20\\d\\d|\\d{1,2}(?:st|nd|rd|th)?)\\b`,
    // numeric dates (6/15/2027, 6-15-2027, 06.15.2027, 6/2027) — only after a
    // deadline word or a date field, never "IEP date 10/14/2026" or a baseline date
    `\\b(?:by|before|until|through|on or before|no later than|target(?: date)?|timeline|due(?: date)?|date of mastery|end date)\\s*:?\\s+(?:\\d{1,2}/\\d{1,2}/\\d{2,4}|\\d{1,2}[-.]\\d{1,2}[-.](?:20)?\\d\\d|\\d{1,2}/20\\d\\d)\\b`,
    // short date after a deadline word: "by 6/27"
    `\\b(?:by|before|on|until)\\s+\\d{1,2}/\\d{2}\\b`,
  ].join('|'),
  'i',
);

const TIMEFRAME_MONTH = new RegExp(
  [
    `\\b(?:[Bb]y|[Bb]efore|[Ii]n|[Uu]ntil|[Tt]hrough|[Ee]nd of|[Oo]n or before)\\s+(?:the end of\\s+)?${MONTHS}(?![A-Za-z])`,
    `\\b${MONTHS}\\s+(?:\\d{1,2}(?:st|nd|rd|th)?,?\\s+)?(?:of\\s+)?20\\d\\d\\b`,
  ].join('|'),
);

// ─── Conditions ─────────────────────────────────────────────────────────────

const CONDITIONS = new RegExp(
  [
    // "given a passage" — but not "will be given 30 minutes of speech" (a service)
    '(?<!\\b(?:be|been|being|is|are)\\s)\\bgiven\\b',
    "\\b(?:when|if|while)\\s+(?:[\\w']+\\s+){0,3}?(?:becomes?|is|gets|feels|needs|wants|given|presented|asked|provided|shown|prompted|offered|faced|frustrated|upset|transitioning|working|reading|writing|playing|stuck)\\b",
    '\\bupon\\s+(?:arrival|entering|entry|request|being|a|an|the)\\b',
    // "using manipulatives" — a named support. "using correct punctuation" is part of
    // the skill; a lead-in "Using X," is caught by hasLeadingCondition instead.
    '\\busing\\s+(?:an?\\s+|the\\s+|her\\s+|his\\s+|their\\s+)?(?:manipulatives|calculators?|graphic organizers?|visuals?|visual \\w+|AAC|(?:speech-generating |communication )?devices?|picture \\w+|word banks?|sentence (?:starters?|frames?)|assistive technology|timers?|schedules?|number lines?|hundreds charts?|token (?:charts?|boards?)|fidgets?|headphones|text-to-speech|speech-to-text|keyboards?|slant boards?|adapted \\w+|models?|templates?|notes|break cards?|first-then \\w+|(?:[\\w-]+ )?checklists?)\\b',
    // "during independent work" — but "during the 2026-27 school year" is a timeframe
    '\\bduring\\b(?!\\s+(?:the\\s+)?(?:20\\d\\d|(?:[\\w-]+\\s+){0,2}(?:school\\s+)?year)\\b)',
    '\\bafter\\s+(?:[a-z]+ing|a|an|the|being|lunch|recess)\\b',
    '\\bin\\s+(?:a\\s+)?(?:1:1|one-on-one|one-to-one|individual)\\b',
    '\\bin the presence of\\b',
    '\\bin response to\\b',
    '\\bat the (?:word|sentence|paragraph|phrase|conversation) level\\b',
    '\\bfollowing\\s+(?:a|an|the)\\s+(?:[a-z-]+\\s+)?(?:model|prompt|demonstration|cue|break|request|mini-lesson)\\b',
    `\\bacross\\s+(?:\\d+\\s+|${NUM_WORD}\\s+|all\\s+|multiple\\s+)?(?:school\\s+)?(?:settings|environments|classes|subjects|activities|staff|adults|school)\\b`,
    '\\bat\\s+(?:recess|lunch|arrival|dismissal|school|home|circle time|transitions?|the start|the beginning)\\b',
    '\\bon the (?:playground|bus|school bus)\\b',
    '\\bin\\s+(?:the\\s+|a\\s+)?(?:general education|classroom|class|small[- ]group|large[- ]group|whole[- ]group|lunch|recess|community|home|speech|OT|PT|therapy|occupational therapy|resource|RSP|SDC|structured)\\b',
    // "with a visual timer", "with 1 verbal prompt", "with fading adult prompts" —
    // never "with an accuracy of", "with one hundred percent", "with the SLP"
    // "with 1 verbal prompt", "with adult support" — never "with a peer" (the skill's
    // object), "with an accuracy of", "with one hundred percent", "with the SLP"
    `\\bwith(?:out)?\\s+(?:an?\\s+|the\\s+|her\\s+|his\\s+|their\\s+)?(?:(?:\\d+|${NUM_WORD}|no more than \\d+|fewer than \\d+)\\s+)?(?:(?:fading|faded|minimal|moderate|maximum|no)\\s+)?(?:(?:visual|verbal|gestural|physical|written|picture)\\b|(?:adult|teacher|staff|peer)\\s+(?:support|model|prompts?|cues?|assistance|help|modeling)\\b|graphic organizers?|sentence starters?|sentence frames?|word banks?|prompts?\\b|cues?\\b|supports?\\b|access to|assistive|calculators?|manipulatives|scaffold\\w*|checklists?|models?\\b|timers?|schedules?|fidgets?|breaks?\\b|accommodations?|AAC|devices?\\b|reminders?)`,
    "\\bat (?:his|her|their|the student's|the) (?:instructional|independent|grade) level\\b",
    '\\bin an? (?:informational|narrative|fiction|nonfiction|grade-level|leveled|unfamiliar|unpracticed) (?:text|passage|story)\\b',
    '\\bfrom\\s+(?:a|an)\\s+(?:field|choice|set|list|bank|menu|array)\\s+of\\b',
  ].join('|'),
  'i',
);

// ─── Observable skill ───────────────────────────────────────────────────────

/** Verbs that describe a hoped-for change or a service, not something a teacher can see the child do. */
const VAGUE_VERBS = new Set([
  'understand',
  'enjoy',
  'master',
  'comprehend',
  'achieve',
  'acquire',
  'attain',
  'generalize',
  'internalize',
  'develop',
  'know',
  'become',
  'appreciate',
  'gain',
  'enhance',
  'feel',
  'grow',
  'progress',
  'strengthen',
  'try',
  'receive',
  'provide',
  'benefit',
  'need',
  'get',
]);

/** Change verbs: measurable only with a target ("to 90 words", "from 60 to 90"). */
const CHANGE_VERBS = new Set([
  'improve',
  'increase',
  'decrease',
  'reduce',
  'improved',
  'increased',
  'decreased',
  'reduced',
]);

/** Verbs that are vague when their object is a judgement ("appropriate behavior"). */
const JUDGEMENT_VERBS = new Set(['maintain', 'display', 'exhibit', 'utilize', 'use', 'demonstrate', 'show']);
const JUDGEMENT_OBJECT =
  /^(?:an?\s+|the\s+|their\s+|his\s+|her\s+)?(?:appropriate|positive|good|age[- ]appropriate|expected|acceptable|improved|better|understanding|knowledge|improvement|growth|progress|awareness|competence|mastery|appreciation|skills?)\b/i;
const ABILITY_TO = /^(?:an?\s+|the\s+|their\s+|his\s+|her\s+)?(?:ability|capacity)\s+to\s+([a-z]+)/i;
const HAS_NUMBER = new RegExp(`\\b${NUMBER}\\b`, 'i');
const TO_TARGET = new RegExp(`\\bto\\s+(?:${NUMBER}|zero|fewer|no more|less|at least|a maximum)\\b`, 'i');
const BE_OBSERVABLE = /^(?:on[- ]task|seated|in (?:his |her |their )?(?:seat|assigned area|line)|present|prepared|ready|engaged)\b/i;

function observableVerb(verb: string, rest: string): boolean {
  if (VAGUE_VERBS.has(verb)) return false;
  if (CHANGE_VERBS.has(verb)) return TO_TARGET.test(rest);
  // "continue to use", "learn to tie": judge the verb after "to"
  if (verb === 'continue' || verb === 'learn') {
    const next = /^to\s+([a-z]+)\s*(.*)$/i.exec(rest);
    return next ? observableVerb(next[1].toLowerCase(), next[2]) : false;
  }
  // "be on task for 80% of intervals", "be seated" — observable; "be aware",
  // "be more independent", "be given/provided" (a service) are not
  if (verb === 'be') return BE_OBSERVABLE.test(rest);
  if (verb === 'engage') return !/^(?:appropriately|positively|meaningfully|more|better)\b/i.test(rest);
  if (verb === 'build') return !/^(?:(?:her|his|their|the)\s+)?(?:[\w-]+\s+){0,2}(?:strength|skills?|confidence|endurance|tolerance|awareness|capacity)\b/i.test(rest);
  if (verb === 'work') return !/^(?:on|toward|towards|to improve|to increase|to develop|to become)\b/i.test(rest);
  if (verb === 'make') return !/^(?:\w+\s+)?(?:progress|gains?|improvements?|growth)\b/i.test(rest);
  if (verb === 'have') {
    const m = /^([a-z]+)\s*(.*)$/i.exec(rest);
    if (m && CHANGE_VERBS.has(m[1].toLowerCase())) return observableVerb(m[1].toLowerCase(), m[2]);
    return HAS_NUMBER.test(rest) && /\b(?:fewer|less|more|no more|at least)\b/i.test(rest);
  }
  if (JUDGEMENT_VERBS.has(verb)) {
    const ability = ABILITY_TO.exec(rest);
    if (ability) return observableVerb(ability[1].toLowerCase(), rest.slice(ability[0].length).trim());
    // "demonstrate knowledge … by answering …" or "use age-appropriate strategies to
    // produce fluent speech" names the real skill after "by" or "to".
    if (JUDGEMENT_OBJECT.test(rest)) {
      if (/\bby\s+[a-z]+ing\b/i.test(rest)) return true;
      const to = /\bto\s+([a-z]+)\s*(.*)$/i.exec(rest);
      return to ? !JUDGEMENT_VERBS.has(to[1].toLowerCase()) && observableVerb(to[1].toLowerCase(), to[2]) : false;
    }
  }
  return true;
}

function hasObservableSkill(goal: string): boolean {
  // "will [, when given X,] [adverb] [be able to] VERB …" and the "shall" form.
  const re =
    /\b(?:will|shall)\b\s*(?:,[^,.;]{1,80},\s*)?(?:[a-z]+ly\s+)?(?:be able to\s+(?:[a-z]+ly\s+)?)?([a-z]+)([^.;]*?)(?=\b(?:will|shall)\b|[.;]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(goal)) !== null) {
    if (observableVerb(m[1].toLowerCase(), m[2].trim())) return true;
  }
  return false;
}

// ─── Criterion ──────────────────────────────────────────────────────────────

const CRITERION = new RegExp(
  [
    `(?<!\\bgoal\\s+#?)(?<!\\b(?:administered|measured|collected|assessed|monitored|probed|reviewed|checked|recorded|reported)\\s+(?:[a-z]+\\s+){0,2})\\b${NUMBER}\\s*(?:%|percent\\b|out of\\s+${NUMBER}\\b|of\\s+${NUMBER}\\b|consecutive\\b|trials?\\b|opportunities\\b|attempts?\\b|minutes?\\b|seconds?\\b|hours?\\b|times?\\b|words?\\b|sentences?\\b|paragraphs?\\b|days?\\b|sessions?\\b|data points?\\b|probes?\\b|steps?\\b|problems?\\b|questions?\\b|correct\\b|incidents?\\b|occurrences?\\b|episodes?\\b|intervals?\\b|prompts?\\b|points?\\b|c?wc?pm\\b|per\\s+(?:day|week|hour|class|period|session|minute)\\b|or\\s+(?:higher|better|more|fewer|less|above|below)\\b)`,
    `\\b(?:at least|no more than|fewer than|less than|more than|a minimum of|a maximum of|score of|scores? of at least|rating of)\\s+${NUMBER}\\b`,
    // a fraction like 4/5 — but not a short date after "by 6/27"
    '(?<!(?:[Bb]y|[Bb]efore|[Oo]n|[Uu]ntil|[Tt]hrough)\\s)\\b\\d{1,2}\\s*/\\s*\\d{1,2}\\b(?!\\s*/)',
  ].join('|'),
  'i',
);

// ─── Measurement ────────────────────────────────────────────────────────────

const MEASURE_NOUN =
  '(?:data(?!\\s+screen)|probes?|observations?|work samples?|records?|rubrics?|assessments?|reports?|checklists?|logs?|CBMs?|inventor(?:y|ies)|tests?|DIBELS|screeners?|tally|tallies|frequency counts?)';

const MEASUREMENT = new RegExp(
  [
    '\\b(?:measured|documented|recorded|evidenced|determined|monitored|tracked|assessed|observed|charted|graphed|reported|verified|collected|evaluated|scored|checked|graded|rated)\\s+(?:[a-z]+ly\\s+)?(?:by|in|on|through|using|via|with|from)\\b',
    // active voice, as parents and some districts write it: "the counselor keeps a
    // log", "OT will keep data", "her teacher tracks this on a progress chart"
    `\\b(?:teachers?|aides?|SLP|OT|PT|(?:job )?coach(?:es)?|counselors?|staff|case managers?|para(?:educator|professional)s?|therapists?|specialists?|coordinators?|psychologists?)\\s+(?:will\\s+)?(?:tracks?|records?|keeps?|takes?|collects?|charts?|logs?|notes?|writes?)\\b[^.;]{0,50}?\\b(?:data|logs?|notes|charts?|sheets?|records?|tally|checklists?|probes?)\\b`,
    '\\bas\\s+(?:indicated|shown|noted|kept|maintained)\\s+(?:by|in|on|through)\\b',
    `\\bby\\s+(?:[\\w-]+\\s+){0,2}(?:observations?|data|probes?|work samples?|records?|checklists?|rubrics?|assessments?|reports?)\\b`,
    '\\((?:[\\w-]+[\\s,]+){0,3}(?:observations?|data|probes?|records?|checklists?|rubrics?|reports?|samples?)(?:[\\s,]+[\\w-]+){0,4}\\)',
    '\\bdata\\s+(?:will\\s+be\\s+)?(?:collected|recorded|kept|tracked|charted)\\b',
    '\\baccording to (?:the\\s+)?(?:teacher|SLP|OT|PT|case manager|staff|therapist|aide)\\b',
    `\\b(?:according to|based on|per|via|through|using|from)\\s+(?:[\\w-]+\\s+){0,3}${MEASURE_NOUN}\\b`,
    '\\bprogress monitoring\\b',
    '\\b(?:DIBELS|CBM|running records?|curriculum[- ]based measur\\w+)\\b',
  ].join('|'),
  'i',
);

// ─── Language ───────────────────────────────────────────────────────────────

const EN_WORDS = /\b(?:the|will|shall|and|to|of|by|with|when|given|her|his|their|in|a|an)\b/gi;
const ES_WORDS = /\b(?:el|la|los|las|de|del|que|y|para|con|según|cuando|dado|dada|su|sus|en|un|una|por)\b|[¿¡]/gi;
/** Lowercase-initial words with an accent ("responderá"); capitalized ones are usually names. */
const ES_ACCENTED = /(?<![\p{L}])[a-zà-ÿ]*[áéíóúñ][a-zà-ÿ]*/gu;

/**
 * Whether the text reads as Spanish (or another non-English language) rather
 * than English. The rules only know English wording, so they decline instead
 * of reporting every part "not spotted".
 *
 * @param goal - Normalized goal text.
 * @returns True when the text should not be rated.
 */
export function looksNotEnglish(goal: string): boolean {
  if (!/\b(?:will|shall)\b/i.test(goal)) {
    const letters = goal.match(/\p{L}/gu) ?? [];
    const nonAscii = letters.filter((c) => c.charCodeAt(0) > 0x7f).length;
    if (letters.length > 0 && nonAscii / letters.length > 0.15) return true;
  }
  const en = goal.match(EN_WORDS)?.length ?? 0;
  const es = (goal.match(ES_WORDS)?.length ?? 0) + (goal.match(ES_ACCENTED)?.length ?? 0);
  return es >= 3 && es > en;
}

/** "Annual goal: Increase …" / "Goal 2: Given a passage, read …" — a goal label, then a verb. */
const VERB_FIRST = /^(?:annual\s+)?goal\s*(?:#?\s*\d+)?\s*[:.-]\s*((?:[^,.;:]{3,80},\s*)*)([A-Za-z][a-z]+\b.*)$/i;

/** A lead-in counts as a condition only if it opens like one ("Using X,", "In class,"). */
const LEAD_CONDITION_START =
  /^(?:in|during|with|without|using|when|whenever|while|after|following|at|on|upon|given|from|across|before|if|throughout)\s+\S/i;
/** …and never when it is a label or a reference ("IEP Goal #2,", "In the area of reading,"). */
const LEAD_NOT_CONDITION = /\b(?:goal|IEP|baseline|area|areas|discussed|domain)\b/i;

/**
 * A clause before "<subject> will" — "By May 2027, using manipulatives, Sam
 * will …" — is a condition, once any timeframe segment is set aside.
 */
function hasLeadingCondition(goal: string): boolean {
  const m = /^(.{3,160}?),\s*(?:the student|student|[A-Z][\p{L}'-]+|he|she|they)\s+(?:will|shall)\b/iu.exec(goal);
  if (!m) return false;
  return m[1]
    .split(',')
    .map((seg) => seg.trim())
    .some(
      (seg) =>
        LEAD_CONDITION_START.test(seg) &&
        !LEAD_NOT_CONDITION.test(seg) &&
        !TIMEFRAME_I.test(seg) &&
        !TIMEFRAME_MONTH.test(seg),
    );
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
 * Joins phrases as "a, b, and c" — the list inside the friendly ask. The
 * serial comma keeps the last two items from reading as one.
 *
 * @param items - Phrases to join.
 * @returns The joined phrase, or "" for an empty list.
 */
export function joinPhrases(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Checks one IEP annual goal for the five parts of a measurable goal.
 *
 * @param raw - The goal as pasted by a parent.
 * @returns The result; `not-english` when the rules cannot read it;
 *   `not-a-goal` when there is no "will"/"shall"; null when too short.
 */
export function checkGoal(raw: string): GoalCheckResult | GoalNotEnglish | GoalNotAGoal | null {
  const goal = normalizeGoal(raw).slice(0, MAX_GOAL_LENGTH);
  if (goal.length < MIN_GOAL_LENGTH) return null;
  if (looksNotEnglish(goal)) return { kind: 'not-english' };
  if (!/\b(?:will|shall)\b/i.test(goal)) {
    const verbFirst = VERB_FIRST.exec(goal);
    if (!verbFirst) return { kind: 'not-a-goal' };
    // Read "Annual goal: Increase…" as "The student will increase…"
    return checkGoal(`${verbFirst[1]}The student will ${verbFirst[2].charAt(0).toLowerCase()}${verbFirst[2].slice(1)}`);
  }

  const present: Record<GoalPartId, boolean> = {
    timeframe: TIMEFRAME_I.test(goal) || TIMEFRAME_MONTH.test(goal),
    conditions: CONDITIONS.test(goal) || hasLeadingCondition(goal),
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
  const goalSentences = goal.split(/[.;]\s+/).filter((s) => /\b(?:will|shall)\b/i.test(s)).length;

  return { kind: 'checked', rating, found, parts, ask, looksLikeSeveralGoals: goalSentences >= 3 };
}

