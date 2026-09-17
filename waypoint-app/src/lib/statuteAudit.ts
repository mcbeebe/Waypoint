/**
 * Statute audit (Build-Plan-Items1-4 phase A1) — finds statutes asserted in
 * PROSE that the provenance registry does not cover.
 *
 * `contentSources.test.ts` already guards the structured path: it enumerates
 * the `citation` fields the content modules emit and fails on any orphan. It
 * cannot see a statute written into a sentence, and a scan of `src/` finds
 * several that only ever appear that way — `W&I §4642`, `W&I §4648`,
 * `Health & Safety Code §1374.73`, and the `W&I Code §4731` spelling variant.
 * To a parent those read exactly like the cited ones.
 *
 * Why a substring match against `covers` is not enough: the registry stores
 * EXACT DISPLAY STRINGS (`'W&I §4646 · §4646.5(b)'`), while prose says the same
 * law many ways — `W&I §4646.5`, `W&I Code §4731`, `Welfare and Institutions
 * Code section 4643`. So both sides are normalised to a **citation atom**
 * (code · section · optional subsection) and compared there.
 *
 * Scope: numeric statutes and regulations only. Named authorities ("Lanterman
 * Act", "IDEA") are exact display strings already guarded by
 * `sourceForCitation`, and are deliberately out of scope here.
 *
 * Pure: no I/O, no network, no clock. The audit REPORTS; promoting it to a
 * failing gate is phase A2, once the registry has been paid down.
 */
import { CONTENT_SOURCES } from '@/data/contentSources';

/** A statute reference normalised for comparison. */
export interface CitationAtom {
  /** Canonical code key — 'WIC', 'EDC', 'HSC', 'CFR34', 'CCR17', … */
  code: string;
  /** Section number as written, e.g. '4646.5' or '300.301'. */
  section: string;
  /** Subsection chain without spaces, e.g. '(a)(3)'; null when absent. */
  subsection: string | null;
  /** `CODE:section(subsection)` — the exact identity. */
  id: string;
  /** `CODE:section` — identity ignoring subsection. */
  sectionId: string;
  /** The text that produced this atom, for reporting. */
  source: string;
}

/** Code used when a `§` reference appears with no code named anywhere before it. */
export const UNATTRIBUTED = 'UNKNOWN';

/**
 * Code-name spellings → canonical key. Order matters: the scanner tries these
 * in array order, so longer spellings must precede the abbreviations they
 * contain ('W&I Code' before 'W&I').
 */
const CODE_SPELLINGS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Welfare\s*(?:&|and)\s*Institutions\s*Code/iy, 'WIC'],
  [/W&I\s*Code/iy, 'WIC'],
  [/W&I/iy, 'WIC'],
  [/Education\s*Code/iy, 'EDC'],
  [/Ed\.?\s*Code/iy, 'EDC'],
  [/Health\s*(?:&|and)\s*Safety\s*Code/iy, 'HSC'],
  [/H&S\s*Code/iy, 'HSC'],
  [/H&S/iy, 'HSC'],
  [/Insurance\s*Code/iy, 'INS'],
  [/Government\s*Code/iy, 'GOV'],
  [/Civil\s*Code/iy, 'CIV'],
  [/(\d{1,2})\s*C\.?F\.?R\.?/iy, 'CFR'],
  [/Title\s*(\d{1,2})\s*C\.?C\.?R\.?/iy, 'CCR'],
  [/(\d{1,2})\s*C\.?C\.?R\.?/iy, 'CCR'],
  [/(\d{1,2})\s*U\.?\s?S\.?\s?C\.?/iy, 'USC'],
];

/**
 * Prefixes that mean the `§` after them is NOT law — a spec, a PRD, an RFC, one
 * of this repo's own documents. Without these, `RFC 4648 §5`, `PRD §7 kill
 * criteria` and `content-ops STYLE-GUIDE §4` all report as uncited statutes.
 *
 * This list grows by discovery rather than guesswork: each entry was added
 * because a real line in `src/` tripped the gate. Add the next one the same way
 * — when the build fails on a document reference, not in anticipation of one.
 */
const NON_STATUTE = /\b(?:RFC|PRD|ISO|IETF|W3C|STYLE-GUIDE|SOP|SCHEMA|README)\b\s*\d*/iy;

/**
 * `§ 4646.5(b)(2)` or `section 4643`.
 *
 * Two deliberate constraints, both learned from the first run of this audit
 * against `src/`:
 * - the section number may carry a trailing letter (`42 USC §1396d(r)`);
 * - a subsection must sit TIGHT against the number and hold one or two
 *   alphanumerics. `§4642 (intake)` is a statute followed by an English gloss,
 *   not subsection "(intake)" — the space and the word length both say so.
 */
const SECTION_AT =
  /(?:§+\s*|\bsections?\s+)(\d+(?:\.\d+)*[a-z]?)((?:\((?:[A-Za-z]|\d{1,2})\))*)/iy;

/**
 * Scan ONE LINE left to right, tracking the most recently named code so that a
 * bare continuation (`Ed Code §56329(b) · §56501`) inherits it and an explicit
 * new code (`… · 34 CFR §300.148`) switches it.
 *
 * Inheritance is line-scoped on purpose. Scanning a whole file as one stream
 * let an `Ed Code` mention in one entry attach itself to a `§4731` twelve
 * entries later, reporting `EDC:4731` for what is plainly a W&I section. A
 * wrong attribution is worse than no attribution, so a section that cannot see
 * a code on its own line is reported as unattributed instead.
 */
function scanLine(text: string): CitationAtom[] {
  const atoms: CitationAtom[] = [];
  let currentCode: string | null = null;
  let i = 0;

  while (i < text.length) {
    // A non-statute prefix? Consume it and forget any code — whatever `§`
    // follows belongs to that document, not to the law.
    NON_STATUTE.lastIndex = i;
    const skip = NON_STATUTE.exec(text);
    if (skip) {
      currentCode = null;
      i = NON_STATUTE.lastIndex;
      while (i < text.length && /\s/.test(text[i])) i += 1;
      SECTION_AT.lastIndex = i;
      const attached = SECTION_AT.exec(text);
      if (attached) i = SECTION_AT.lastIndex;
      continue;
    }

    // A code name at this position?
    let matchedCode = false;
    for (const [re, key] of CODE_SPELLINGS) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m) {
        currentCode = m[1] ? `${key}${m[1]}` : key;
        i = re.lastIndex;
        matchedCode = true;
        break;
      }
    }
    if (matchedCode) continue;

    // A section reference at this position?
    SECTION_AT.lastIndex = i;
    const s = SECTION_AT.exec(text);
    if (s) {
      const section = s[1];
      const subsection = s[2] ?? '';
      const code = currentCode ?? UNATTRIBUTED;
      const sectionId = `${code}:${section}`;
      atoms.push({
        code,
        section,
        subsection: subsection || null,
        id: `${sectionId}${subsection}`,
        sectionId,
        source: s[0].trim(),
      });
      i = SECTION_AT.lastIndex;
      continue;
    }

    i += 1;
  }

  return atoms;
}

/**
 * Scan a block of any size, resetting code inheritance at every PHYSICAL line
 * break.
 *
 * Physical, not the `\n` escape inside a string literal: the content modules
 * hold a whole knowledge-base entry on one source line, and inside it a single
 * `W&I Code §4500+` legitimately governs a bulleted list of `§4642 · §4643 ·
 * §4646` further down. Splitting on the escape would strip the code from every
 * one of those. Splitting on the real line break is what stops one entry's
 * code from reaching the next entry's sections.
 */
function scan(text: string): CitationAtom[] {
  return text.split(/\r?\n/).flatMap(scanLine);
}

/**
 * Every statute atom referenced in a block of free text, de-duplicated by
 * identity and returned in first-seen order.
 */
export function parseCitations(text: string): CitationAtom[] {
  const seen = new Set<string>();
  return scan(text).filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

/** The atom identities the registry covers, at both exact and section level. */
export interface RegistryCoverage {
  /** `CODE:section(subsection)` strings the registry names exactly. */
  exact: Set<string>;
  /** `CODE:section` strings, ignoring subsection. */
  sections: Set<string>;
  /**
   * Registered authorities that carry no `§` — "Lanterman Act", "IDEA Part C ·
   * Early Start", "Section 504". They are proper nouns, and the last of those
   * is why this exists: "Section 504" parses as a bare section number and
   * reported as unattributed forever. The fix is NOT to write "29 U.S.C. §794"
   * into a parent's letter to a principal — that is over-lawyering the first,
   * friendliest ask, which the escalation-tone rule forbids. It is to let the
   * registry say "this phrase is an authority I cover," and take its word.
   *
   * Longest first, so a longer name wins over a shorter one it contains.
   */
  named: string[];
}

/**
 * Normalise every `covers` string in the provenance registry into comparable
 * atoms. Registry entries are display strings, so this runs the same scanner
 * the prose side uses — one parser, no chance of the two drifting.
 */
export function registryCoverage(
  sources: ReadonlyArray<{ covers: string[] }> = CONTENT_SOURCES
): RegistryCoverage {
  const exact = new Set<string>();
  const sections = new Set<string>();
  const named: string[] = [];
  for (const source of sources) {
    for (const cover of source.covers) {
      if (!cover.includes('§')) named.push(cover);
      for (const atom of scan(cover)) {
        exact.add(atom.id);
        sections.add(atom.sectionId);
      }
    }
  }
  named.sort((a, b) => b.length - a.length);
  return { exact, sections, named };
}

/** Escape a literal for use inside a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Blank out registered named authorities before scanning, so their numbers are
 * never mistaken for statute references.
 *
 * Replaced with spaces rather than removed, so every other citation on the line
 * keeps its offsets and its inherited code.
 */
function redactNamed(text: string, named: ReadonlyArray<string>): string {
  let out = text;
  for (const name of named) {
    out = out.replace(new RegExp(escapeRe(name), 'gi'), (m) => ' '.repeat(m.length));
  }
  return out;
}

/** How well a prose citation lines up with the registry. */
export type CoverageMatch = 'exact' | 'section' | 'none';

/**
 * Classify one atom against registry coverage.
 *
 * `'section'` means the registry verified a different subsection of the same
 * section — real coverage of the authority, but not of the exact claim. It is
 * reported separately rather than silently accepted or silently failed.
 */
export function classify(atom: CitationAtom, coverage: RegistryCoverage): CoverageMatch {
  if (coverage.exact.has(atom.id)) return 'exact';
  if (coverage.sections.has(atom.sectionId)) return 'section';
  return 'none';
}

/** One prose citation and how it fared. */
export interface AuditFinding {
  atom: CitationAtom;
  match: CoverageMatch;
  /** Where it was found — a file path, a case id, whatever the caller passed. */
  where: string;
}

/**
 * Audit one block of text. Returns a finding for every citation that is not an
 * exact registry match — `'none'` is an unregistered authority, `'section'` is
 * a subsection the registry never verified.
 */
export function auditText(
  text: string,
  where = '',
  coverage: RegistryCoverage = registryCoverage()
): AuditFinding[] {
  return parseCitations(redactNamed(text, coverage.named))
    .map((atom) => ({ atom, match: classify(atom, coverage), where }))
    .filter((f) => f.match !== 'exact');
}

/**
 * Audit many labelled blocks against one shared coverage set.
 *
 * This is the shape both callers need: the repo scan in phase A1, and the
 * answer gate in A3b that runs it over what the Navigator actually said.
 */
export function auditAll(
  blocks: ReadonlyArray<{ where: string; text: string }>,
  coverage: RegistryCoverage = registryCoverage()
): AuditFinding[] {
  return blocks.flatMap((b) => auditText(b.text, b.where, coverage));
}

/**
 * Group findings by atom identity so a statute asserted in nine files reports
 * once, with the nine places listed.
 */
export function summarise(
  findings: ReadonlyArray<AuditFinding>
): Array<{ id: string; match: CoverageMatch; source: string; where: string[] }> {
  const byId = new Map<string, { id: string; match: CoverageMatch; source: string; where: string[] }>();
  for (const f of findings) {
    const row = byId.get(f.atom.id);
    if (row) {
      if (f.where && !row.where.includes(f.where)) row.where.push(f.where);
    } else {
      byId.set(f.atom.id, {
        id: f.atom.id,
        match: f.match,
        source: f.atom.source,
        where: f.where ? [f.where] : [],
      });
    }
  }
  // Unregistered authorities first, then by identity — the order a human
  // paying the registry down wants to read.
  return [...byId.values()].sort((a, b) =>
    a.match === b.match ? a.id.localeCompare(b.id) : a.match === 'none' ? -1 : 1
  );
}
