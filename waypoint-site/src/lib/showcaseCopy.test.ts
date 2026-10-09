import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Copy guard for the code-built app screens and the homepage (initiative
 * 013). The screens show a FICTIONAL family; this test makes sure no real
 * family's details (names, phone numbers, emails) and no claim the product
 * cannot back up ever ship in them.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..');
const showcaseDir = path.join(src, 'components', 'showcase');
const FILES = [
  ...readdirSync(showcaseDir).map((f) => path.join(showcaseDir, f)),
  path.join(src, 'pages', 'index.astro'),
  path.join(src, 'components', 'GoalCheck.astro'),
  path.join(src, 'components', 'OneLoop.astro'),
  path.join(src, 'components', 'GuideVsApp.astro'),
  path.join(src, 'components', 'WithoutWith.astro'),
  path.join(src, 'lib', 'iepGoalCheckUi.ts'),
  path.join(src, 'pages', 'product.astro'),
];
/** File text with code comments removed: the guard checks what ships as copy. */
const read = (f: string) =>
  readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** The only people the mock screens may name. All fictional. */
const ALLOWED_NAMES = new Set(['Maya', 'Leo', 'Ana', 'Sam', 'Lopez', 'Mike']);

describe('showcase copy guard', () => {
  it.each(FILES)('%s has no phone number', (f) => {
    expect(read(f)).not.toMatch(/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/);
  });

  it.each(FILES)('%s has no email address except on a reserved .example domain', (f) => {
    const emails = read(f).match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    for (const e of emails) expect(e, e).toMatch(/\.example$/);
  });

  it.each(FILES)('%s names only the fictional sample family', (f) => {
    // "<Name> will", "<Name>'s", "Hi/Dear <Name>", "Ms. <Name>" — how a person shows up in copy
    const names = [
      ...read(f).matchAll(/\b(?:Hi|Dear)\s+(?:(?:Ms|Mr|Mrs)\.\s+)?([A-Z][a-z]+)|\b(?:Ms|Mr|Mrs)\.\s+([A-Z][a-z]+)|\b([A-Z][a-z]{2,})(?:'s\b|\s+(?:will|turns|met|reads)\b)/g),
    ].map((m) => m[1] ?? m[2] ?? m[3]);
    const NOT_PEOPLE = new Set(['Waypoint', 'Home', 'District', 'This', 'That', 'Every', 'Each', 'Goal', 'Student', 'Teacher', 'Center', 'California', 'Regional', 'School', 'County', 'Here', 'Who', 'What', 'There', 'Let', 'Today', 'Nobody', 'Premium']);
    for (const n of names) if (!NOT_PEOPLE.has(n)) expect(ALLOWED_NAMES.has(n), `unexpected name: ${n}`).toBe(true);
  });

  it.each(FILES)('%s makes no claim the product cannot back up', (f) => {
    const text = read(f);
    const BANNED = [
      /\bthe best\b/i,
      /#1\b/,
      /\bguarantee/i,
      /\bfull parity\b/i,
      /\bpriority AI\b/i,
      /\bpush notifications?\b/i,
      /\bcalendar (?:export|sync)\b/i,
      /\b\d[\d,]*\+?\s+(?:families|parents|users)\b/i,
      /\bHIPAA\b/,
      // The app has no Early Start, Medi-Cal, IHSS or SSI request clock
      // (waypoint-app/src/lib/requestClocks.ts), and no Notice of Action clock.
      /\btrack of every clock\b/i,
      /\bwatches your specific 60-day window\b/i,
      // Nothing is drafted ahead of time: Home offers "Draft the follow-up".
      /\balready drafted\b/i,
      // The app runs 15-, 30- and 120-day request clocks only (/product/
      // once promised "the 15-day, the 60-day, the 45-day").
      /\b(?:60|45)-day\b/i,
      // "Nothing you type leaves" is false once a parent carries a summary
      // into the app; the tools say what actually stays.
      /\bnothing you type\b/i,
    ];
    for (const re of BANNED) expect(text, `${path.basename(f)} matched ${re}`).not.toMatch(re);
  });

  it('agency status is framed neutrally (CLAUDE.md tone rule)', () => {
    for (const f of FILES) {
      const text = read(f);
      expect(text, path.basename(f)).not.toMatch(/\b(?:missed the deadline|they owe you|failed to respond|ignored your|demand(?:s|ed)?\b|the other side|stalls?\b)/i);
    }
  });

  it('the 30-day aid-paid-pending rule states one condition, not two (WIC §4715)', () => {
    // The regional-centers guide removed "before the change takes effect" on
    // 2026-09-08: §4715 asks only that the appeal be filed within 30 days of
    // receiving the notice. The homepage demo brought it back once; never again.
    for (const f of FILES) expect(read(f), path.basename(f)).not.toMatch(/before the change takes effect/i);
  });

  it('every clock on a hero card is one the app actually runs', () => {
    // Home triage can only show a request clock the app defines. The hero
    // must not show one it doesn't (an Early Start 45-day card did, once).
    const clocks = readFileSync(path.join(src, '..', '..', 'waypoint-app', 'src', 'lib', 'requestClocks.ts'), 'utf8');
    const appCitations = new Set([...clocks.matchAll(/citation:\s*'([^']+)'/g)].map((m) => m[1]));
    expect(appCitations.size).toBeGreaterThan(0);
    const hero = read(path.join(showcaseDir, 'HeroFamilies.astro'));
    const cites = [...hero.matchAll(/cite:\s*'([^']*)'/g)].map((m) => m[1]).filter(Boolean);
    expect(cites.length).toBeGreaterThan(0);
    for (const c of cites) expect(appCitations.has(c), `hero cites ${c}, which no app clock uses`).toBe(true);
    // The /product/ tour's Home card too: its citation sits in a <b> after the reason.
    const tour = read(path.join(src, 'pages', 'product.astro'));
    const tourCites = [...tour.matchAll(/fixed window\. <b>([^<]+)<\/b>/g)].map((m) => m[1]);
    expect(tourCites.length).toBeGreaterThan(0);
    for (const c of tourCites) expect(appCitations.has(c), `/product/ cites ${c}, which no app clock uses`).toBe(true);
    // The app's own kicker, with its em dash (homeTriage.ts), not the hero's middle dot.
    for (const pill of tour.matchAll(/class="ms-pill[^"]*">([^<]+)</g)) {
      expect(pill[1]).toMatch(/^(?:CLOCK RUNNING — \d+ DAYS LEFT|COMING UP — \d+ DAYS|DUE TODAY)$/);
    }
    // And every clock card uses the app's own kicker, not an invented one.
    for (const pill of hero.matchAll(/pill:\s*'([^']+)'/g)) {
      expect(pill[1]).toMatch(/^(?:CLOCK RUNNING · \d+ DAYS LEFT|COMING UP · \d+ DAYS|DUE TODAY)$/);
    }
  });
});
