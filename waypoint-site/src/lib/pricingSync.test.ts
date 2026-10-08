import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Lockstep guard between what this site says Waypoint costs and what the app
 * defines. One paid tier, Premium (owner decision 2026-10-08): the figures and
 * the Premium feature list live in waypoint-app/src/lib/entitlements.ts, and
 * this test fails if the site shows anything else — the drift that left the
 * site on Plus/Pro while the app sold one Premium tier. site.yml also triggers
 * on entitlements.ts, so an app-only price change re-runs it.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, '..');
const entitlements = readFileSync(path.join(site, '..', '..', 'waypoint-app', 'src', 'lib', 'entitlements.ts'), 'utf8');

/** A numeric `export const NAME = 123;` from the app's entitlements module. */
function appConst(name: string): number {
  const m = entitlements.match(new RegExp(`export const ${name}(?::\\s*number)? = (\\d+);`));
  if (!m) throw new Error(`${name} not found in entitlements.ts`);
  return Number(m[1]);
}

/** The string entries of an `export const NAME = [ ... ] as const;` array. */
function appList(name: string): string[] {
  const m = entitlements.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!m) throw new Error(`${name} not found in entitlements.ts`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Page text with code comments removed: the guard checks what ships. */
const read = (rel: string) =>
  readFileSync(path.join(site, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const monthly = `$${(appConst('PRICE_MONTHLY_CENTS') / 100).toFixed(2)}`;
const annual = `$${(appConst('PRICE_ANNUAL_CENTS') / 100).toFixed(0)}`;
const trialDays = appConst('FREE_TRIAL_DAYS');
const pricing = read('pages/pricing.astro');
/** The drafts-only comparison quotes a competitor's own price; that cell alone is exempt. */
const COMPETITOR_CELL = '<td>$19/mo ($149/yr)</td>';
const PAGES = ['pages/pricing.astro', 'pages/product.astro', 'pages/index.astro'];

describe('site pricing matches the app', () => {
  it('the Premium card shows the app’s monthly and yearly prices', () => {
    expect(pricing).toContain(`<div class="amount">${monthly}<small>/mo</small></div>`);
    expect(pricing).toContain(`Or ${annual} billed yearly`);
  });

  it.each(PAGES)('%s names no price the app does not charge', (rel) => {
    const text = read(rel).replace(COMPETITOR_CELL, '');
    // "save over $N": the yearly saving, derived from the two prices.
    const saving = `$${Math.floor((appConst('PRICE_MONTHLY_CENTS') * 12 - appConst('PRICE_ANNUAL_CENTS')) / 100)}`;
    const allowed = new Set([monthly, annual, '$0', saving]);
    for (const m of text.matchAll(/\$\s*\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s*dollars\b/gi)) {
      expect(allowed.has(m[0]), `${rel} shows ${m[0]}`).toBe(true);
    }
  });

  it.each(PAGES)('%s states only the app’s trial length', (rel) => {
    const text = read(rel);
    // Every "first N days/months (are) free" and "N-day trial" must be the app's trial.
    for (const m of text.matchAll(/\bfirst\s+\w+\s+(?:days?|months?)\s+(?:are\s+|is\s+)?free\b|\b\w+[- ](?:day|month)\s+(?:free\s+)?trial\b/gi)) {
      expect(m[0].toLowerCase().replace(/\s+/g, ' '), `${rel}: "${m[0]}"`).toMatch(
        new RegExp(`^(first ${trialDays} days (are )?free|${trialDays}[- ]day (free )?trial)$`),
      );
    }
    expect(text, rel).not.toMatch(/\b(?:\w+\s+)?months?\s+free\b/i);
  });

  it.each(PAGES.filter((p) => p !== 'pages/index.astro'))('%s has no retired tier, guarantee or claim', (rel) => {
    // index.astro is covered by the homepage rebuild's own copy guard (#307).
    const text = read(rel);
    for (const re of [
      /\bWaypoint (?:Plus|Pro)\b/i,
      /\bStart (?:Plus|Pro)\b/i,
      /class="plan">\s*(?:plus|pro)\s*</i,
      /money[- ]?back|full refund/i,
      /priority AI/i,
      /full parity/i,
    ]) {
      expect(text, `${rel} matched ${re}`).not.toMatch(re);
    }
  });

  it('the Premium card lists exactly what the app’s paywall gates', () => {
    const appFeatures = appList('PREMIUM_FEATURES').map((f) =>
      f.replace(/\*/g, '').replace(/ \+ /g, ' and ').replace('Waypoint Navigator', 'AI Navigator'),
    );
    const card = pricing.slice(pricing.indexOf('Everything in Free, plus:'), pricing.indexOf('</ul>', pricing.indexOf('Everything in Free, plus:')));
    const listed = [...card.matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(listed).toEqual(appFeatures);
  });

  it('the free Navigator allowance on the page is the one the app enforces', () => {
    expect(pricing).toContain(`${appConst('FREE_NAVIGATOR_MONTHLY_LIMIT')} AI Navigator messages a month`);
  });

  it('the page discloses that Premium renews until cancelled, at the app’s prices', () => {
    expect(pricing.replace(/\s+/g, ' ')).toContain(`renews at ${monthly} a month or ${annual} a year until you cancel`);
  });
});
