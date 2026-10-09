import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CTA_IDS, type CtaId, type Pillar } from './appLinks';
import { CTA_SCREEN_CARDS, ctaScreenCard, ctaScreenFor, type CtaScreenKind } from './ctaScreen';

/**
 * The sample screens beside content-page CTA boxes (initiative 013, PR 6)
 * must show only what the app can produce, worded exactly as the app renders
 * it. Each string is pinned to the app file that renders it, not to "appears
 * somewhere in the app": an accessibility label or a comment does not count.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.join(here, '..', '..');
const appSrc = path.join(site, '..', 'waypoint-app', 'src');
const appFile = (rel: string) => readFileSync(path.join(appSrc, rel), 'utf8');
const clocks = appFile('lib/requestClocks.ts');
const triage = appFile('lib/homeTriage.ts');
const sentNext = appFile('lib/sentNext.ts');

/** Clock length in days, keyed by the citation the app attaches to it. */
const CLOCK_DAYS = new Map(
  [...clocks.matchAll(/days:\s*(\d+),\s*citation:\s*'([^']+)'/g)].map((m) => [m[2], Number(m[1])]),
);
/** Titles the app gives the request a sent letter starts tracking. */
const TRACKED_TITLES = new Set([...sentNext.matchAll(/track:\s*\{[^}]*title:\s*'([^']+)'/g)].map((m) => m[1]));

/**
 * True when `text` is rendered as visible copy in `file`: an English `L('…'`
 * string or JSX text, on a line that is not a comment or accessibility label.
 */
function rendersVisibly(file: string, text: string): boolean {
  return file.split('\n').some((line) => {
    const t = line.trim();
    if (/^(?:\/\/|\*|\/\*)/.test(t) || /accessibility(?:Label|Hint)/.test(t)) return false;
    return t.includes(`L('${text}'`) || t.includes(`L(\`${text}\``) || t.includes(`'${text}',`) || t === text || t.includes(`>${text}<`);
  });
}

/** Which app file renders each card's button. */
const BUTTON_SOURCE: Record<CtaScreenKind, string> = {
  iep: 'lib/homeTriage.ts',
  rc: 'lib/homeTriage.ts',
  benefits: 'lib/homeTriage.ts',
  'rc-navigator': 'screens/main/NavigatorScreen.tsx',
  insurance: 'screens/main/LettersScreen.tsx',
  letter: 'screens/main/LettersScreen.tsx',
};

const KINDS = Object.keys(CTA_SCREEN_CARDS) as CtaScreenKind[];
const PILLARS: (Pillar | undefined)[] = ['regional-centers', 'iep', 'benefits', 'insurance', 'first-steps', 'start', undefined];
const ALLOWED_NAMES = new Set(['Maya', 'Leo', 'Ana', 'Sam', 'Lopez', 'Mike']);
const cardText = (k: CtaScreenKind) => Object.values(ctaScreenCard(k)).join(' \n ');

/** "Oct 16" → a UTC date in 2026, the sample year. */
const day = (s: string) => new Date(`${s} 2026 12:00 UTC`);
/** The sample "today" the cards are written against (Monday, Oct 12, 2026). */
const TODAY = day('Oct 12');
const MS_PER_DAY = 86_400_000;

/** Every .mdx file under a directory. */
function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? mdxFiles(p) : e.name.endsWith('.mdx') ? [p] : [];
  });
}
const contentDir = path.join(site, 'src', 'content');
const CONTENT_FILES = mdxFiles(contentDir);

describe('ctaScreenFor', () => {
  it.each([
    ['guide-footer', 'iep', 'iep'],
    ['guide-footer', 'regional-centers', 'rc'],
    ['guide-footer', 'benefits', 'benefits'],
    ['guide-footer', 'insurance', 'insurance'],
    ['guide-footer', 'first-steps', null],
    ['guide-footer', 'start', null],
    ['guide-footer', undefined, null],
    ['rc-footer', 'regional-centers', 'rc-navigator'],
    ['rc-footer', undefined, 'rc-navigator'],
    ['letter-footer', 'iep', 'letter'],
    ['letter-footer', 'regional-centers', null],
    ['letter-footer', undefined, null],
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
    expect([...KINDS].sort()).toEqual(['benefits', 'iep', 'insurance', 'letter', 'rc', 'rc-navigator']);
  });

  it.each(KINDS)('%s: a clock card cites a request clock the app runs, with dates that add up', (k) => {
    const c = ctaScreenCard(k);
    const isClock = /^CLOCK RUNNING/.test(c.pill ?? '');
    expect(Boolean(c.cite), `${k}: a cite field belongs to clock cards only`).toBe(isClock);
    if (!isClock) return;
    expect(CLOCK_DAYS.has(c.cite!), `${c.cite} is not in requestClocks.ts`).toBe(true);
    const due = c.title.match(/is due (\w{3} \d{1,2})$/)?.[1];
    const asked = c.body?.match(/asked on (\w{3} \d{1,2})/)?.[1];
    const left = Number(c.pill?.match(/(\d+) DAYS LEFT/)?.[1]);
    expect(due && asked && left, k).toBeTruthy();
    expect((day(due!).getTime() - day(asked!).getTime()) / MS_PER_DAY, `${k}: asked + clock = due`).toBe(CLOCK_DAYS.get(c.cite!));
    expect((day(due!).getTime() - TODAY.getTime()) / MS_PER_DAY, `${k}: days left`).toBe(left);
    // Home shows a clock card only inside its window (homeTriage CLOCK_WINDOW_DAYS).
    expect(left).toBeLessThanOrEqual(Number(triage.match(/CLOCK_WINDOW_DAYS = (\d+);/)?.[1]));
    // The spoken label says the same number of days as the pill.
    expect(c.label).toContain(`in ${left} days`);
  });

  it.each(KINDS)('%s: Home card wording is exactly what homeTriage renders', (k) => {
    const c = ctaScreenCard(k);
    if (c.pill?.startsWith('CLOCK')) {
      expect(triage).toContain('`Clock running — ${dl.daysRemaining} days left`');
      expect(c.pill).toMatch(/^CLOCK RUNNING — \d+ DAYS LEFT$/);
      expect(triage).toContain('`An answer on ${r.title} is due ${');
      const t = c.title.match(/^An answer on (.+) is due \w{3} \d{1,2}$/)?.[1];
      expect(TRACKED_TITLES.has(t ?? ''), `"${t}" is not a title sentNext tracks`).toBe(true);
      expect(triage).toContain('and the law gives them a fixed window.`');
      expect(c.body).toMatch(/^Because you asked on \w{3} \d{1,2} and the law gives them a fixed window\.$/);
    } else if (c.pill) {
      expect(c.pill).toBe('DUE TODAY');
      expect(rendersVisibly(triage, 'Due today')).toBe(true);
      expect(triage).toContain(`\`${c.body}\``);
    }
  });

  it.each(KINDS)('%s: button is visible copy in the app file that renders it', (k) => {
    expect(rendersVisibly(appFile(BUTTON_SOURCE[k]), ctaScreenCard(k).button), BUTTON_SOURCE[k]).toBe(true);
  });

  it('the Navigator card cites only sections the site’s own guides cite', () => {
    const content = CONTENT_FILES.map((f) => readFileSync(f, 'utf8')).join('\n');
    const cited = [...cardText('rc-navigator').matchAll(/§\s*(\d{4,5}(?:\.\d+)?)/g)].map((m) => m[1]);
    expect(cited.length).toBeGreaterThan(0);
    for (const s of cited) expect(content, `§${s}`).toMatch(new RegExp(`§\\s*${s.replace('.', '\\.')}(?![\\d.])`));
  });

  it.each(KINDS)('%s: names only the fictional family, emails only on .example, no phone numbers', (k) => {
    const text = cardText(k);
    for (const e of text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []) expect(e).toMatch(/\.example$/);
    const NOT_PEOPLE = new Set(['Regional', 'Center', 'Medi', 'Service', 'Coordinator', 'Gmail', 'Home', 'Special', 'Insurance']);
    for (const m of text.matchAll(/\b([A-Z][a-z]{2,})['’]s\b|\b(?:of|for|son,|daughter,|Hi|Dear|Ms\.|Mr\.)\s+([A-Z][a-z]+)\b/g)) {
      const n = m[1] ?? m[2];
      if (!NOT_PEOPLE.has(n)) expect(ALLOWED_NAMES.has(n), `unexpected name: ${n}`).toBe(true);
    }
    expect(text).not.toMatch(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/);
  });

  it.each(KINDS)('%s: asks, never demands; states status, never blame', (k) => {
    expect(cardText(k)).not.toMatch(/\b(?:demand(?:s|ed)?|missed the deadline|they owe you|failed to respond|ignored your|overdue)\b/i);
  });

  it.each(KINDS)('%s: has a screen-reader label that says it is a sample', (k) => {
    expect(ctaScreenCard(k).label).toMatch(/^Sample /);
  });
});

describe('CTA box copy', () => {
  const boxes = CONTENT_FILES.flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/<HandoffCTA[\s\S]*?\/>/g)].map((m) => [path.relative(contentDir, f), m[0]] as const),
  );
  const bodies = boxes.map(([f, b]) => [f, b.match(/body="([^"]*)"/)?.[1] ?? ''] as const);

  it('finds the boxes', () => {
    expect(bodies.length).toBeGreaterThan(30);
  });

  it.each(bodies)('%s promises no clock the app does not run', (_f, body) => {
    // The app runs 15-, 30- and 120-day request clocks (requestClocks.ts) and
    // the IEP hub's 15- and 60-day estimates (iepDeadlines.ts). It has no
    // appeal or Notice of Action clock and no Early Start 45-day clock.
    expect(body).not.toMatch(/\bappeal deadlines?\b|\b45-day\b/i);
    // Nor a tracker it doesn't have: the app tracks the clocks a family's
    // requests start and the dates they add, not "every deadline".
    expect(body).not.toMatch(/\bdeadline tracker\b|\bevery deadline tracked\b|\btracker for every\b/i);
  });

  it.each(bodies)('%s asks, never demands (CLAUDE.md tone rule)', (_f, body) => {
    expect(body).not.toMatch(/\b(?:demand(?:s|ed)?|missed the deadline|they owe you|failed to respond|ignored your)\b/i);
  });

  it.each(boxes)('%s names only a screen kind that exists', (_f, box) => {
    const s = box.match(/screen="([^"]*)"/)?.[1];
    if (s) expect(['none', ...KINDS]).toContain(s);
  });
});
