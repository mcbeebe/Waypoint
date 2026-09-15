import { describe, it, expect } from 'vitest';
import { leadCitation, citeKey, sourceAnchorId, findSource, anchorableKeys } from './citations';

const src = (label: string) => ({ label, url: 'https://example.gov/x', accessed: '2026-09-15' });

describe('leadCitation', () => {
  it('drops the parenthetical gloss a label carries for the reader', () => {
    expect(leadCitation('WIC §4643 (assessment within 120 days of intake)')).toBe('WIC §4643');
    expect(leadCitation('17 CCR §52086 (Early Start 45-day timeline)')).toBe('17 CCR §52086');
  });

  it('drops an em-dash gloss too, and leaves a bare citation alone', () => {
    expect(leadCitation('DDS — Family Fee Programs Ended')).toBe('DDS');
    expect(leadCitation('WIC §4512')).toBe('WIC §4512');
  });
});

describe('citeKey pairs a chip with the source that backs it', () => {
  it('ignores case and whitespace noise', () => {
    expect(citeKey('WIC  §4643')).toBe(citeKey('wic §4643'));
  });

  it('treats "et seq." as the same authority', () => {
    // The chip on the Regional Centers page reads "WIC §4500 et seq."; a
    // source labelled "WIC §4500" is the same statute and must pair with it.
    expect(citeKey('WIC §4500 et seq.')).toBe(citeKey('WIC §4500'));
  });

  it('keeps genuinely different sections apart', () => {
    expect(citeKey('WIC §4646')).not.toBe(citeKey('WIC §4646.5(a)(5)'));
    expect(citeKey('Ed Code §56321')).not.toBe(citeKey('Ed Code §56320'));
  });
});

describe('sourceAnchorId', () => {
  it('is a stable, url-safe id', () => {
    expect(sourceAnchorId('WIC §4643')).toBe('src-wic-4643');
    expect(sourceAnchorId('17 CCR §52086')).toBe('src-17-ccr-52086');
    // The subdivision folds into its section — (a)(3) is part of §1374.73, and
    // the source for the section is the right receipt for it. The decimal
    // stays, because §1374.73 is not §1374.7.
    expect(sourceAnchorId('HSC §1374.73(a)(3)')).toBe('src-hsc-1374-73');
    expect(sourceAnchorId('HSC §1374.7')).not.toBe(sourceAnchorId('HSC §1374.73'));
  });

  it('gives a chip and its source the same id, so the link lands', () => {
    expect(sourceAnchorId('WIC §4500 et seq.')).toBe(sourceAnchorId('WIC §4500'));
  });

  it('keeps distinct sections apart, so two receipts never collide', () => {
    // §4646.4 is its own section; only its (a)(2) subdivision folds away.
    expect(sourceAnchorId('WIC §4646')).not.toBe(sourceAnchorId('WIC §4646.4(a)(2)'));
    expect(sourceAnchorId('WIC §4646.4(a)(2)')).toBe('src-wic-4646-4');
  });
});

describe('findSource', () => {
  const sources = [
    src('WIC §4643 (assessment within 120 days of intake)'),
    src('WIC §4512 (developmental disability)'),
    src('Disability Rights California — Regional Center Appeals Changes (2023)'),
  ];

  it('finds the entry behind a chip', () => {
    expect(findSource('WIC §4643', sources)?.label).toMatch(/^WIC §4643/);
  });

  it('returns null rather than guessing when the page lists no source', () => {
    // This is the 216-chip case across the site today. A wrong receipt is
    // worse than none, so an unmatched chip must stay plain text.
    expect(findSource('Ed Code §56321', sources)).toBeNull();
  });

  it('pairs a non-statute publisher source when it is named exactly and once', () => {
    expect(findSource('Disability Rights California', sources)?.label).toMatch(/Disability Rights/);
    expect(findSource('WIC §9999', sources)).toBeNull();
  });

  it('refuses to choose when two sources answer to the same name', () => {
    // Real shape: several pages cite DHCS three or four times, and every one
    // of those labels reduces to "DHCS". Returning the first would be a
    // confidently wrong receipt — and would mint duplicate DOM ids.
    const ambiguous = [
      src('DHCS — Medi-Cal for Families'),
      src('DHCS — Institutional Deeming'),
      src('WIC §4512 (developmental disability)'),
    ];
    expect(findSource('DHCS', ambiguous)).toBeNull();
    expect(findSource('WIC §4512', ambiguous)?.label).toMatch(/^WIC §4512/);
    expect([...anchorableKeys(ambiguous)]).toEqual(['wic §4512']);
  });
});

describe('the spellings the site actually uses in prose vs frontmatter', () => {
  it('pairs a bare "Ed Code" chip with a "CA Ed Code" label', () => {
    // 26 labels say "CA Ed Code §…" while 100 chips say "Ed Code §…" — the
    // style guide's own chip format. Unnormalised, this orphaned every Ed Code
    // chip on the site's most statute-dense pages.
    const sources = [src('CA Ed Code §56321 (15-day assessment plan; vacation pause)')];
    expect(findSource('Ed Code §56321', sources)?.label).toMatch(/^CA Ed Code/);
  });

  it('pairs a subdivision chip with the section that contains it', () => {
    const sources = [src('WIC §4646 (IPP process)')];
    expect(findSource('WIC §4646(f)(1)', sources)?.label).toMatch(/^WIC §4646/);
  });

  it('never collapses a decimal section into its neighbour', () => {
    // §4646.5 is a different section from §4646, not a part of it. Pairing
    // them would put the wrong statute under a parent's claim.
    const sources = [src('WIC §4646 (IPP process)')];
    expect(findSource('WIC §4646.5', sources)).toBeNull();
    expect(findSource('WIC §4646.5(a)(5)', sources)).toBeNull();
    expect(sourceAnchorId('WIC §4646.5')).not.toBe(sourceAnchorId('WIC §4646'));
  });
});
