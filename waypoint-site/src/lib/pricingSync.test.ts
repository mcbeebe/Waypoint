import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Lockstep guard between what this site says Waypoint costs and what the app
 * charges. One paid tier, Premium (owner decision 2026-10-08): the figures
 * live in waypoint-app/src/lib/entitlements.ts, and this test fails if the
 * pricing page shows anything else — the drift that left the site on Plus/Pro
 * while the app sold one Premium tier.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, '..');
const entitlements = readFileSync(path.join(site, '..', '..', 'waypoint-app', 'src', 'lib', 'entitlements.ts'), 'utf8');

/** A numeric `export const NAME = 123;` from the app's entitlements module. */
function appConst(name: string): number {
  const m = entitlements.match(new RegExp(`export const ${name} = (\\d+);`));
  if (!m) throw new Error(`${name} not found in entitlements.ts`);
  return Number(m[1]);
}

/** Page text with code comments removed: the guard checks what ships. */
const read = (rel: string) =>
  readFileSync(path.join(site, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const monthly = `$${(appConst('PRICE_MONTHLY_CENTS') / 100).toFixed(2)}`;
const annual = `$${(appConst('PRICE_ANNUAL_CENTS') / 100).toFixed(0)}`;
const PAGES = ['pages/pricing.astro', 'pages/product.astro', 'pages/index.astro'];

describe('site pricing matches the app', () => {
  it('the pricing page shows the app’s monthly and yearly Premium prices', () => {
    const page = read('pages/pricing.astro');
    expect(page).toContain(monthly);
    expect(page).toMatch(new RegExp(`\\${annual}\\b(?!\\.)`));
  });

  it.each(PAGES)('%s names no price the app does not charge', (rel) => {
    // The drafts-only comparison quotes a competitor's own prices; nothing else may.
    const COMPETITOR = rel === 'pages/pricing.astro' ? ['$19', '$149'] : [];
    const allowed = new Set([monthly, annual, '$0', ...COMPETITOR]);
    for (const m of read(rel).matchAll(/\$\d[\d,]*(?:\.\d{2})?/g)) {
      expect(allowed.has(m[0]), `${rel} shows ${m[0]}`).toBe(true);
    }
  });

  // index.astro is left out here: its "full parity" stat is replaced by the
  // homepage rebuild (#307), whose own copy guard covers it.
  it.each(PAGES.filter((p) => p !== 'pages/index.astro'))('%s has no retired tier, trial or claim', (rel) => {
    const text = read(rel);
    for (const re of [/\bWaypoint (?:Plus|Pro)\b/, /\bStart (?:Plus|Pro)\b/, /\b(?:PLUS|PRO)\b/, /3 months free|first 3 months/i, /priority AI/i, /full parity/i, /money-back/i]) {
      expect(text, `${rel} matched ${re}`).not.toMatch(re);
    }
  });

  it('the trial the page promises is the app’s trial', () => {
    expect(appConst('FREE_TRIAL_DAYS')).toBe(30);
    expect(read('pages/pricing.astro')).toMatch(/first month free/i);
  });

  it('the free Navigator allowance on the page is the one the app enforces', () => {
    const limit = appConst('FREE_NAVIGATOR_MONTHLY_LIMIT');
    expect(read('pages/pricing.astro')).toContain(`${limit} AI Navigator messages a month`);
  });
});
