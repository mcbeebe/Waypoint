/**
 * statuteAudit — the prose half of the provenance guard.
 *
 * `contentSources.test.ts` proves the structured citations are covered. These
 * prove the scanner can find a statute written into a sentence, normalise the
 * many ways prose spells the same law, and tell an unregistered authority from
 * a subsection the registry never verified.
 */
import { describe, it, expect } from 'vitest';
import {
  parseCitations,
  registryCoverage,
  classify,
  auditText,
  auditAll,
  summarise,
  UNATTRIBUTED,
  type CitationAtom,
} from './statuteAudit';

const ids = (text: string) => parseCitations(text).map((a) => a.id);

describe('parseCitations — the many ways prose names a law', () => {
  it('reads the plain abbreviated form', () => {
    expect(ids('The Regional Center must assess within 120 days (W&I §4643).')).toEqual([
      'WIC:4643',
    ]);
  });

  it('keeps the subsection, because the subsection is the claim', () => {
    expect(ids('a review within 30 days — W&I §4646.5(b)')).toEqual(['WIC:4646.5(b)']);
  });

  it('reads a subsection chain', () => {
    expect(ids('Ed Code §56345(a)(3) governs the goal')).toEqual(['EDC:56345(a)(3)']);
  });

  it('inherits the code across a · continuation', () => {
    expect(ids('Ed Code §56321 · §56344')).toEqual(['EDC:56321', 'EDC:56344']);
  });

  it('switches code when a new one is named mid-string', () => {
    expect(ids('Ed Code §56329(b) · §56501 · 34 CFR §300.148')).toEqual([
      'EDC:56329(b)',
      'EDC:56501',
      'CFR34:300.148',
    ]);
  });

  it('normalises every spelling of the same code to one key', () => {
    const spellings = [
      'W&I §4731',
      'W&I Code §4731',
      'Welfare & Institutions Code §4731',
      'Welfare and Institutions Code section 4731',
    ];
    for (const s of spellings) expect(ids(s)).toEqual(['WIC:4731']);
  });

  it('reads Health & Safety in both spellings', () => {
    expect(ids('Health & Safety Code §1374.73')).toEqual(['HSC:1374.73']);
    expect(ids('H&S §1374.73')).toEqual(['HSC:1374.73']);
  });

  it('reads federal regulations with their title number', () => {
    expect(ids('34 CFR §303.310 sets the 45-day IFSP clock')).toEqual(['CFR34:303.310']);
    expect(ids('Title 17 CCR §54320')).toEqual(['CCR17:54320']);
  });

  it('marks a section with no code named anywhere as unattributed', () => {
    // An unattributed section is itself a finding: a parent cannot look it up.
    expect(ids('the law says §4646.5 applies')).toEqual([`${UNATTRIBUTED}:4646.5`]);
  });

  it('de-duplicates repeats but keeps first-seen order', () => {
    expect(ids('W&I §4643 … later, again, W&I §4643, and then W&I §4512')).toEqual([
      'WIC:4643',
      'WIC:4512',
    ]);
  });

  it('treats a subsection as a different atom from its parent section', () => {
    expect(ids('W&I §4646.5 and W&I §4646.5(b)')).toEqual(['WIC:4646.5', 'WIC:4646.5(b)']);
  });

  it('does not invent citations from ordinary prose', () => {
    const prose =
      'Call your service coordinator. The 2026 COLA raised the figure. Codes 024 and 099 apply. ' +
      'DDS D-2026-SDP-002 is the directive. Your IEP meeting is on Oct 2, 2026.';
    expect(parseCitations(prose)).toEqual([]);
  });

  // ── The four false-positive classes the first real run of this audit against
  // src/ exposed. Each line here is a bug the report caught in the scanner.

  it('does not mistake an English gloss in parentheses for a subsection', () => {
    // agencies.ts writes "§4642 (intake)" — a statute followed by a plain-word
    // gloss. A real subsection sits tight against the number: "§4646.5(b)".
    expect(ids('§4642 (intake), §4643 (eligibility)')).toEqual([
      `${UNATTRIBUTED}:4642`,
      `${UNATTRIBUTED}:4643`,
    ]);
  });

  it('does not let one line’s code attach to the next line’s section', () => {
    // Scanning a file as one stream reported EDC:4731 for a W&I section
    // twelve entries below an "Ed Code" mention. A wrong attribution is worse
    // than none, so a section that cannot see a code on its own line is
    // reported unattributed instead.
    const text = 'Per CA Ed Code §56321, send the plan.\nFile a complaint under §4731.';
    expect(ids(text)).toEqual(['EDC:56321', `${UNATTRIBUTED}:4731`]);
  });

  it('still inherits a code down a list inside one source line', () => {
    // The same content modules hold a whole KB entry on one line, where a
    // single "W&I Code" legitimately governs a bulleted list below it.
    const entry =
      'The Lanterman Act (W&I Code §4500+) is the law.\\n• §4642 — Intake\\n• §4643 — Eligibility';
    expect(ids(entry)).toEqual(['WIC:4500', 'WIC:4642', 'WIC:4643']);
  });

  it('reads a section number that carries a trailing letter', () => {
    expect(ids('cite EPSDT — 42 U.S.C. §1396d(r)')).toEqual(['USC42:1396d(r)']);
  });

  it('ignores a § that belongs to a spec or a repo document, not a statute', () => {
    expect(parseCitations('base64url per RFC 4648 §5: the alphabet with +/ swapped')).toEqual([]);
    expect(parseCitations('Phase-1 gates (PRD §7 kill criteria) — single source')).toEqual([]);
    // Added when a real line tripped the gate: DiagnosisSelector.tsx cites
    // "content-ops STYLE-GUIDE §4" for its disability-language rule.
    expect(parseCitations('phrasing (content-ops STYLE-GUIDE §4 — per-community language)')).toEqual([]);
  });

  it('reports where it found each citation', () => {
    const [atom] = parseCitations('under W&I §4685.8(u) the budget is certified');
    expect(atom.source).toBe('§4685.8(u)');
    expect(atom.code).toBe('WIC');
    expect(atom.section).toBe('4685.8');
    expect(atom.subsection).toBe('(u)');
    expect(atom.sectionId).toBe('WIC:4685.8');
  });
});

describe('registryCoverage — the registry, run through the same parser', () => {
  const fake = [{ covers: ['W&I §4646 · §4646.5(b)', '34 CFR §303.310 · Early Start'] }];

  it('normalises display strings into atoms', () => {
    const { exact } = registryCoverage(fake);
    expect([...exact].sort()).toEqual(['CFR34:303.310', 'WIC:4646', 'WIC:4646.5(b)']);
  });

  it('records section-level identity alongside exact identity', () => {
    const { sections } = registryCoverage(fake);
    expect(sections.has('WIC:4646.5')).toBe(true);
  });

  it('covers the real registry without throwing', () => {
    const { exact, sections } = registryCoverage();
    expect(exact.size).toBeGreaterThan(0);
    expect(sections.size).toBeGreaterThan(0);
  });
});

describe('classify — exact, section, or nothing at all', () => {
  const coverage = registryCoverage([{ covers: ['W&I §4646.5(b)'] }]);
  const atom = (text: string): CitationAtom => parseCitations(text)[0];

  it('an exactly-registered citation is exact', () => {
    expect(classify(atom('W&I §4646.5(b)'), coverage)).toBe('exact');
  });

  it('the parent section of a registered subsection is a section match', () => {
    expect(classify(atom('W&I §4646.5'), coverage)).toBe('section');
  });

  it('a DIFFERENT subsection of a registered section is only a section match', () => {
    // The registry verified (b). Citing (c) rests on a claim nobody checked.
    expect(classify(atom('W&I §4646.5(c)'), coverage)).toBe('section');
  });

  it('an unregistered authority is none', () => {
    expect(classify(atom('W&I §4642'), coverage)).toBe('none');
  });
});

describe('auditText — reports everything that is not an exact match', () => {
  const coverage = registryCoverage([{ covers: ['W&I §4643'] }]);

  it('says nothing when every citation is registered', () => {
    expect(auditText('assessment within 120 days, W&I §4643', 'a.ts', coverage)).toEqual([]);
  });

  it('reports an unregistered authority with its location', () => {
    const found = auditText('intake begins under W&I §4642', 'planGenerator.ts', coverage);
    expect(found).toHaveLength(1);
    expect(found[0].match).toBe('none');
    expect(found[0].atom.id).toBe('WIC:4642');
    expect(found[0].where).toBe('planGenerator.ts');
  });

  it('reports the registered and the unregistered from one sentence separately', () => {
    const found = auditText('W&I §4643 and W&I §4648 both apply', 'x.ts', coverage);
    expect(found.map((f) => f.atom.id)).toEqual(['WIC:4648']);
  });
});

describe('auditAll and summarise — what a human pays the registry down from', () => {
  const coverage = registryCoverage([{ covers: ['W&I §4643'] }]);

  it('groups one statute asserted in several files into a single row', () => {
    const findings = auditAll(
      [
        { where: 'planGenerator.ts', text: 'W&I §4642 at intake' },
        { where: 'adaptiveEngine.ts', text: 'see W&I §4642' },
        { where: 'agencies.ts', text: 'W&I §4642 again' },
      ],
      coverage
    );
    const rows = summarise(findings);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('WIC:4642');
    expect(rows[0].where).toEqual(['planGenerator.ts', 'adaptiveEngine.ts', 'agencies.ts']);
  });

  it('puts unregistered authorities above unverified subsections', () => {
    const withSub = registryCoverage([{ covers: ['W&I §4646.5(b)'] }]);
    const rows = summarise(
      auditAll(
        [
          { where: 'a.ts', text: 'W&I §4646.5(c)' },
          { where: 'b.ts', text: 'W&I §4642' },
        ],
        withSub
      )
    );
    expect(rows.map((r) => r.match)).toEqual(['none', 'section']);
  });

  it('returns nothing for text with no citations at all', () => {
    expect(summarise(auditAll([{ where: 'a.ts', text: 'Call the Regional Center.' }]))).toEqual([]);
  });
});

describe('against the real registry', () => {
  const coverage = registryCoverage();

  it('recognises a statute the registry actually covers', () => {
    expect(auditText('assessment within 120 days (W&I §4643)', '', coverage)).toEqual([]);
  });

  it('the prose-only statutes the level-up review found are now registered', () => {
    // These were the audit's original findings — asserted in running text with
    // nothing behind them. Phase A2 registered them on 2026-09-15, so the
    // assertion inverted: the audit must now find nothing to say about them.
    // (The previous version of this test expected them to be FLAGGED, and its
    // comment said it should fail the day they were registered. It did.)
    const flagged = summarise(
      auditAll(
        [
          { where: 'prose', text: 'W&I §4642' },
          { where: 'prose', text: 'Health & Safety Code §1374.73' },
          { where: 'prose', text: '34 CFR §300.301 and 34 CFR §300.502' },
          { where: 'prose', text: 'Ed Code §56302.1 · Ed Code §56341.1' },
          { where: 'prose', text: 'W&I §4500 · W&I §4502 · W&I §4620 · W&I §95014' },
        ],
        coverage
      )
    );
    expect(flagged).toEqual([]);
  });

  it('a named authority is covered by its phrase, not by a section number', () => {
    // "Section 504" is a proper noun. It must stay plain English in a parent's
    // letter to a principal — writing "29 U.S.C. §794" there over-lawyers the
    // friendliest ask, which the escalation-tone rule forbids.
    expect(auditText('if denied, request a Section 504 plan', 'x.ts', coverage)).toEqual([]);
  });

  it('still flags a statute that genuinely has no entry', () => {
    // The gate has to keep biting now that KNOWN_GAPS is empty.
    const flagged = summarise(auditAll([{ where: 'x.ts', text: 'W&I §9999' }], coverage));
    expect(flagged.map((r) => r.id)).toEqual(['WIC:9999']);
  });
});
