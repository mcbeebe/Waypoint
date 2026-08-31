/**
 * The warm brand palette (initiative 006) has to stay legible for the person it
 * was designed for — a stressed caregiver reading on her phone at 11pm. The
 * earlier navy/teal palette shipped real WCAG AA failures (a ~3.7:1 primary
 * button, ~2.6:1 meta text). This pins the roles and their contrast so a future
 * tweak can't quietly reintroduce that.
 */
import { describe, it, expect } from 'vitest';
import { brand } from './theme';

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const chan = (h: string) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = chan(n.slice(0, 2));
  const g = chan(n.slice(2, 4));
  const b = chan(n.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5; // WCAG AA for normal-size text and UI text on buttons

describe('warm brand palette — roles are present', () => {
  it('carries every role the system applies by rule', () => {
    for (const key of [
      'paper',
      'panel',
      'ink',
      'inkSoft',
      'inkFaint',
      'pine',
      'pineDeep',
      'sage',
      'sageInk',
      'urgent',
    ] as const) {
      expect(brand[key], key).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('warm brand palette — meets WCAG AA where it must', () => {
  it('white text on the primary (pine) button passes AA — the old teal did not', () => {
    expect(contrast('#FFFFFF', brand.pine)).toBeGreaterThanOrEqual(AA);
  });

  it('body and secondary text pass AA on both paper and panel', () => {
    expect(contrast(brand.ink, brand.paper)).toBeGreaterThanOrEqual(AA);
    expect(contrast(brand.ink, brand.panel)).toBeGreaterThanOrEqual(AA);
    expect(contrast(brand.inkSoft, brand.panel)).toBeGreaterThanOrEqual(AA);
  });

  it('meta text (inkFaint) passes AA — the fix for the old ~2.6:1 #94A3B8', () => {
    expect(contrast(brand.inkFaint, brand.panel)).toBeGreaterThanOrEqual(AA);
    expect(contrast(brand.inkFaint, brand.paper)).toBeGreaterThanOrEqual(AA);
  });

  it('sage-as-TEXT uses sageInk (fills fail as text) and urgent text passes AA', () => {
    expect(contrast(brand.sageInk, brand.panel)).toBeGreaterThanOrEqual(AA);
    expect(contrast(brand.urgent, brand.panel)).toBeGreaterThanOrEqual(AA);
    // Guard the role split: the sage FILL is deliberately too light for text,
    // which is exactly why sageInk exists — if this ever passes, the two have
    // been conflated.
    expect(contrast(brand.sage, brand.panel)).toBeLessThan(AA);
  });

  it('pine links pass AA on the paper ground too', () => {
    expect(contrast(brand.pine, brand.paper)).toBeGreaterThanOrEqual(AA);
  });
});
