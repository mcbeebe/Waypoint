import { describe, it, expect } from 'vitest';
import { leadCitation, citeKey, sourceAnchorId, findSource } from './citations';

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
    expect(sourceAnchorId('HSC §1374.73(a)(3)')).toBe('src-hsc-1374-73-a-3');
  });

  it('gives a chip and its source the same id, so the link lands', () => {
    expect(sourceAnchorId('WIC §4500 et seq.')).toBe(sourceAnchorId('WIC §4500'));
  });

  it('keeps subsections distinct, so two receipts never collide', () => {
    expect(sourceAnchorId('WIC §4646')).not.toBe(sourceAnchorId('WIC §4646.4(a)(2)'));
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

  it('never pairs a chip with a non-statute source that happens to sit nearby', () => {
    expect(findSource('Disability Rights California', sources)?.label).toMatch(/Disability Rights/);
    expect(findSource('WIC §9999', sources)).toBeNull();
  });
});
