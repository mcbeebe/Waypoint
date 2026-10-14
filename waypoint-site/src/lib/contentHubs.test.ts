import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The /answers/ and /letters/ hubs: the pages must list through the publish
 * gate (visibleEntries), content.ts must register the hub URL only when
 * entries exist (so hubCrumb never links a missing page), and the entry
 * pages' breadcrumbs must route through hubCrumb. Source-level checks, like
 * toolsHub.test.ts — the real behavior is exercised by the build gates.
 */
const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p: string[]) => readFileSync(path.join(src, ...p), 'utf8');

describe.each([
  { seg: 'answers', coll: 'answers', label: 'Answers' },
  { seg: 'letters', coll: 'letters', label: 'Letters' },
])('$seg hub', ({ seg, coll, label }) => {
  it('lists only gate-visible entries and is noindex when empty', () => {
    const page = read('pages', seg, 'index.astro');
    expect(page).toContain(`visibleEntries('${coll}')`);
    expect(page).not.toContain('getCollection');
    expect(page).toMatch(/noindex=\{empty\}/);
  });

  it('registers its URL in the content URL sets only when entries exist', () => {
    const content = read('lib', 'content.ts');
    expect(content).toMatch(new RegExp(`length > 0\\) urls\\.add\\('/${seg}/'\\)`, 'g'));
    expect(content.match(new RegExp(`urls\\.add\\('/${seg}/'\\)`, 'g'))).toHaveLength(2);
  });

  it('is the target of the entry pages\' breadcrumb via hubCrumb', () => {
    const slugPage = read('pages', seg, '[slug].astro');
    expect(slugPage).toContain(`hubCrumb('${label}', '/${seg}/', urls)`);
  });
});
