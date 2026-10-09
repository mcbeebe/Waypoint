import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CTA_IDS, type CtaId, type Pillar } from './appLinks';
import { CTA_SCREEN_CARDS, ctaScreenCard, ctaScreenFor, type CtaScreenKind } from './ctaScreen';

/**
 * The sample screens beside content-page CTA boxes (initiative 013, PR 6)
 * must show only what the app can produce, worded the way the app words it.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, '..', '..');
const appLib = path.join(site, '..', 'waypoint-app', 'src');
const clocks = readFileSync(path.join(appLib, 'lib', 'requestClocks.ts'), 'utf8');

/** Every non-test app source file, concatenated: where the app's own strings live. */
function appSource(dir: string): string {
  let out = '';
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out += appSource(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out += readFileSync(p, 'utf8');
  }
  return out;
}
const app = appSource(appLib);

/** Clock length in days, keyed by the citation the app attaches to it. */
const CLOCK_DAYS = new Map(
  [...clocks.matchAll(/days:\s*(\d+),\s*citation:\s*'([^']+)'/g)].map((m) => [m[2], Number(m[1])]),
);

const KINDS = Object.keys(CTA_SCREEN_CARDS) as CtaScreenKind[];
const PILLARS: (Pillar | undefined)[] = ['regional-centers', 'iep', 'benefits', 'insurance', 'first-steps', 'start', undefined];
const ALLOWED_NAMES = new Set(['Maya', 'Leo', 'Ana', 'Sam', 'Lopez', 'Mike']);

/** "Oct 16" → a UTC date in 2026, the sample year. */
const day = (s: string) => new Date(`${s} 2026 12:00 UTC`);
/** The sample "today" the cards are written against (Monday, Oct 12, 2026). */
const TODAY = day('Oct 12');
const MS_PER_DAY = 86_400_000;

describe('ctaScreenFor', () => {
  it.each([
    ['guide-footer', 'iep', 'iep'],
    ['guide-footer', 'regional-centers', 'rc'],
    ['guide-footer', 'benefits', 'benefits'],
    ['guide-footer', 'insurance', 'insurance'],
    ['guide-footer', 'first-steps', null],
    ['guide-footer', 'start', null],
    ['guide-footer', undefined, null],
    ['rc-footer', 'regional-centers', 'rc-intake'],
    ['rc-footer', undefined, 'rc-intake'],
    ['letter-footer', 'iep', 'letter'],
    ['letter-footer', undefined, 'letter'],
  ] as const)('%s / %s → %s', (cta, pillar, want) => {
    expect(ctaScreenFor(cta, pillar)).toBe(want);
  });

  it('marketing, answer, checklist and tool boxes stay text-only, for every pillar', () => {
    const CONTENT: CtaId[] = ['guide-footer', 'rc-footer', 'letter-footer'];
    for (const cta of CTA_IDS.filter((c) => !CONTENT.includes(c))) {
      for (const p of PILLARS) expect(ctaScreenFor(cta, p), `${cta}/${p}`).toBeNull();
    }
  });
});

describe('sample screen cards', () => {
  it('there is a card for every kind ctaScreenFor can return', () => {
    expect([...KINDS].sort()).toEqual(['benefits', 'iep', 'insurance', 'letter', 'rc', 'rc-intake']);
    for (const k of KINDS) expect(ctaScreenCard(k).title.length).toBeGreaterThan(0);
  });

  it.each(KINDS)('%s: every clock cites a request clock the app runs, with dates that add up', (k) => {
    const c = ctaScreenCard(k);
    if (!c.cite) {
      expect(c.pill ?? '', 'a card without a citation shows no clock').not.toMatch(/CLOCK/);
      return;
    }
    expect(CLOCK_DAYS.has(c.cite), `${c.cite} is not in requestClocks.ts`).toBe(true);
    const due = c.title.match(/is due (\w{3} \d{1,2})$/)?.[1];
    const asked = c.body?.match(/asked on (\w{3} \d{1,2})/)?.[1];
    const left = Number(c.pill?.match(/(\d+) DAYS LEFT/)?.[1]);
    expect(due && asked && left, k).toBeTruthy();
    expect((day(due!).getTime() - day(asked!).getTime()) / MS_PER_DAY, `${k}: asked + clock = due`).toBe(CLOCK_DAYS.get(c.cite));
    expect((day(due!).getTime() - TODAY.getTime()) / MS_PER_DAY, `${k}: days left`).toBe(left);
    // Home shows a clock card only inside its 10-day window (homeTriage CLOCK_WINDOW_DAYS).
    expect(left).toBeLessThanOrEqual(10);
  });

  it.each(KINDS)('%s: pill is a Home kicker the app renders', (k) => {
    const { pill, pillTone } = ctaScreenCard(k);
    if (!pill) return;
    expect(pill).toMatch(/^(?:CLOCK RUNNING · \d+ DAYS LEFT|DUE TODAY)$/);
    expect(pillTone).toBe(pill === 'DUE TODAY' ? 'cs-today' : 'cs-clock');
  });

  it.each(KINDS)('%s: Home card wording is the app’s own', (k) => {
    const c = ctaScreenCard(k);
    if (c.pill?.startsWith('CLOCK')) {
      expect(c.title).toMatch(/^An answer on .+ is due \w{3} \d{1,2}$/);
      expect(c.body).toMatch(/^Because you asked on \w{3} \d{1,2} and the law gives them a fixed window\.$/);
      expect(app).toContain('and the law gives them a fixed window.');
    }
    if (c.pill === 'DUE TODAY') expect(app).toContain(c.body);
  });

  it.each(KINDS)('%s: button label is one the app shows', (k) => {
    expect(app).toContain(ctaScreenCard(k).button);
  });

  it.each(KINDS)('%s: names only the fictional family, emails only on .example', (k) => {
    const text = Object.values(ctaScreenCard(k)).join(' ');
    for (const e of text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []) expect(e).toMatch(/\.example$/);
    for (const m of text.matchAll(/\b([A-Z][a-z]{2,})(?:'s\b|,\s*…?$)|\b(?:of|for|son,|daughter,)\s+([A-Z][a-z]+)\b/g)) {
      const n = m[1] ?? m[2];
      expect(ALLOWED_NAMES.has(n), `unexpected name: ${n}`).toBe(true);
    }
    expect(text).not.toMatch(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/);
  });

  it.each(KINDS)('%s: asks, never demands; states status, never blame (CLAUDE.md tone rule)', (k) => {
    const text = Object.values(ctaScreenCard(k)).join(' ');
    expect(text).not.toMatch(/\b(?:demand(?:s|ed)?|missed the deadline|they owe you|failed to respond|ignored your|overdue)\b/i);
  });

  it.each(KINDS)('%s: has a screen-reader label that says it is a sample', (k) => {
    expect(ctaScreenCard(k).label).toMatch(/^Sample /);
  });
});

describe('CTA box copy beside the screens', () => {
  /** Every HandoffCTA body in content that gets a screen. */
  const content = path.join(site, 'src', 'content');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.mdx')) files.push(p);
    }
  };
  walk(content);
  const bodies = files.flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/<HandoffCTA[\s\S]*?body="([^"]*)"[\s\S]*?\/>/g)].map((m) => [path.relative(content, f), m[1]] as const),
  );

  it('finds the boxes', () => {
    expect(bodies.length).toBeGreaterThan(30);
  });

  it.each(bodies)('%s promises no clock the app does not run', (_f, body) => {
    // The app's request clocks are 15 (Ed Code §56321), 30 (IPP) and 120
    // (RC assessment) days. It has no 60-day assessment clock and no appeal
    // or Notice of Action clock, and it does not write to a calendar.
    expect(body).not.toMatch(/\bcalendars?\b/i);
    expect(body).not.toMatch(/\b(?:60|45)-day\b|\bday 60\b/i);
    expect(body).not.toMatch(/\bappeal deadlines?\b/i);
  });
});
