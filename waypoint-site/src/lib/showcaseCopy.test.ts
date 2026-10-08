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
  path.join(src, 'lib', 'iepGoalCheckUi.ts'),
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
    const NOT_PEOPLE = new Set(['Waypoint', 'Home', 'District', 'This', 'That', 'Every', 'Each', 'Goal', 'Student', 'Teacher', 'Center', 'California', 'Regional', 'School', 'County', 'Here', 'Who', 'What', 'There', 'Let', 'Today']);
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
    ];
    for (const re of BANNED) expect(text, `${path.basename(f)} matched ${re}`).not.toMatch(re);
  });

  it('agency status is framed neutrally (CLAUDE.md tone rule)', () => {
    for (const f of FILES) {
      const text = read(f);
      expect(text, path.basename(f)).not.toMatch(/\b(?:missed the deadline|they owe you|failed to respond|ignored your|demand(?:s|ed)?\b)/i);
    }
  });
});
