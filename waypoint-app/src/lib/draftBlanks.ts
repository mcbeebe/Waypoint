/**
 * Letter [BLANK] handling.
 *
 * Drafts come back with [BRACKETED] placeholders for anything the model
 * doesn't know. Most of those are things the family already told us once —
 * their last name, the school, the child's grade, a phone number. This
 * module fills those in from the profile after generation (a deterministic
 * safety net for when the model brackets a value anyway), and sorts what's
 * left into "we could save this for you" vs "only you know this".
 *
 * Pure module — no react-native imports — so it stays unit-testable.
 */

export interface LetterProfile {
  parentFirstName?: string | null;
  parentLastName?: string | null;
  email?: string | null;
  phone?: string | null;
  childFirstName?: string | null;
  childGrade?: string | null;
  schoolName?: string | null;
  schoolDistrict?: string | null;
  regionalCenter?: string | null;
  insurance?: string | null;
}

export type LetterProfileKey = keyof LetterProfile;

interface BlankField {
  key: LetterProfileKey;
  /** What the parent sees in the "add this once" prompt */
  label: string;
  /** Where in the app it's edited */
  where: 'family' | 'child';
  /** Bracket tokens (without brackets) this field satisfies */
  pattern: RegExp;
}

/**
 * Bracket tokens the model actually emits, mapped to profile fields.
 * Patterns match the token's INNER text, case-insensitively.
 */
export const BLANK_FIELDS: BlankField[] = [
  {
    key: 'parentLastName',
    label: 'Your last name',
    where: 'family',
    pattern: /^(your |parent'?s? |family )?last name$/i,
  },
  {
    key: 'phone',
    label: 'Your phone number',
    where: 'family',
    pattern: /^(your |my |cell |mobile |contact |home )?(phone|telephone)( number)?$/i,
  },
  {
    key: 'email',
    label: 'Your email',
    where: 'family',
    pattern: /^(your |my )?e-?mail( address)?$/i,
  },
  {
    key: 'schoolName',
    label: "Your child's school",
    where: 'child',
    pattern: /^(name of )?(the )?(current |child'?s? )?school( name)?$/i,
  },
  {
    key: 'childGrade',
    label: "Your child's grade",
    where: 'child',
    pattern: /^(current |child'?s? )?grade( level)?$/i,
  },
  {
    key: 'schoolDistrict',
    label: 'Your school district',
    where: 'family',
    pattern: /^(school )?district( name)?$/i,
  },
  {
    key: 'regionalCenter',
    label: 'Your Regional Center',
    where: 'family',
    pattern: /^regional center( name)?$/i,
  },
  {
    key: 'insurance',
    label: 'Your insurance',
    where: 'family',
    pattern: /^insurance( provider| company| carrier| plan)?$/i,
  },
  {
    key: 'childFirstName',
    label: "Your child's name",
    where: 'child',
    pattern: /^(child|student)'?s?( first)? name$/i,
  },
];

/** Any bracketed token, e.g. "[school name]" — kept short to avoid matching prose. */
// Any single-line bracketed placeholder, with NO upper length cap: a long
// descriptive fill like "[Describe the specific limitations …]" is still a
// blank, and the send gate must catch it (a 60-char cap once let long
// placeholders through as "no blanks left" → a letter sent with the
// instruction still in it). Bounded by the next "]" or newline either way.
const BRACKET_RE = /\[([^\]\n]+)\]/g;

function valueFor(profile: LetterProfile, key: LetterProfileKey): string | null {
  const raw = profile[key];
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : null;
}

/** The profile field a bracket token corresponds to, if any. */
export function fieldForToken(inner: string): BlankField | null {
  const cleaned = inner.trim();
  return BLANK_FIELDS.find((f) => f.pattern.test(cleaned)) ?? null;
}

export interface FillResult {
  text: string;
  /** Labels of the fields that got filled in, for the confirmation toast */
  filled: string[];
}

/**
 * Replace bracketed placeholders with real profile values.
 * A "[Last Name]" with a saved last name becomes the name; anything we
 * don't have a value for is left alone for the parent to fill.
 */
export function fillKnownBlanks(draft: string, profile: LetterProfile): FillResult {
  const filled = new Set<string>();
  const text = draft.replace(BRACKET_RE, (whole, inner: string) => {
    const field = fieldForToken(inner);
    if (!field) return whole;
    const value = valueFor(profile, field.key);
    if (!value) return whole;
    filled.add(field.label);
    return value;
  });
  return { text, filled: Array.from(filled) };
}

export interface BlankAnalysis {
  /** Every distinct bracket token still in the draft, as written */
  remaining: string[];
  /**
   * Blanks that exist only because the profile is missing something —
   * saving these once makes future drafts fill themselves in.
   */
  fixableInProfile: Array<{ token: string; label: string; where: 'family' | 'child' }>;
  /** Blanks nobody but the parent can supply (dates, times, specifics) */
  onlyYouKnow: string[];
}

/**
 * Sort the remaining blanks so the UI can say something useful:
 * which ones the profile could answer, and which are inherently manual.
 */
export function analyzeBlanks(draft: string, profile: LetterProfile): BlankAnalysis {
  const remaining: string[] = [];
  const fixable: BlankAnalysis['fixableInProfile'] = [];
  const onlyYou: string[] = [];
  const seen = new Set<string>();

  for (const match of draft.matchAll(BRACKET_RE)) {
    const token = match[0];
    if (seen.has(token)) continue;
    seen.add(token);
    remaining.push(token);

    const field = fieldForToken(match[1]);
    if (field && !valueFor(profile, field.key)) {
      fixable.push({ token, label: field.label, where: field.where });
    } else if (!field) {
      onlyYou.push(token);
    }
  }

  return { remaining, fixableInProfile: fixable, onlyYouKnow: onlyYou };
}

/**
 * Profile fields that letters commonly need and this family hasn't saved —
 * drives the "complete your profile" nudge on Home.
 */
export function missingLetterFields(profile: LetterProfile): BlankField[] {
  const NUDGE_KEYS: LetterProfileKey[] = [
    'parentLastName',
    'phone',
    'schoolName',
    'childGrade',
  ];
  return BLANK_FIELDS.filter(
    (f) => NUDGE_KEYS.includes(f.key) && !valueFor(profile, f.key)
  );
}

export interface SendReadiness {
  /** Distinct bracket blanks still in the draft. */
  blanksLeft: number;
  /** No saved recipient to send to. */
  needsRecipient: boolean;
  /**
   * Ready to fire a DIRECT, immediate send (Gmail). False keeps a letter with
   * "[DATE]" or "[SERVICE]" still in it from going to an agency unedited — the
   * "Send turns on when it's ready" gate (draft flow phase 9c). Copy and the
   * open-in-mail path stay available so the parent can finish elsewhere.
   */
  canSend: boolean;
}

/** Whether a draft can be sent directly, and why not. Pure, so it is tested. */
export function sendReadiness(
  draft: string,
  profile: LetterProfile,
  hasRecipient: boolean
): SendReadiness {
  const blanksLeft = analyzeBlanks(draft, profile).remaining.length;
  return {
    blanksLeft,
    needsRecipient: !hasRecipient,
    canSend: blanksLeft === 0 && hasRecipient,
  };
}
