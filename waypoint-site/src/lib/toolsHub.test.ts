import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The /tools/ hub must list every free tool (initiative 013, PR 3). A tool
 * page added under src/pages/tools/ without a card here would be reachable
 * only from the footer, so this fails until the hub links it — and the
 * header's "Free Tools" must open the hub, not one tool.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(here, '..', 'pages', 'tools');
const hub = readFileSync(path.join(pagesDir, 'index.astro'), 'utf8');
const header = readFileSync(path.join(here, '..', 'components', 'SiteHeader.astro'), 'utf8');

const toolSlugs = readdirSync(pagesDir)
  .filter((f) => f.endsWith('.astro') && f !== 'index.astro')
  .map((f) => f.replace(/\.astro$/, ''));

describe('free tools hub', () => {
  it('finds the tool pages it guards', () => {
    expect(toolSlugs.length).toBeGreaterThanOrEqual(3);
  });

  it.each(toolSlugs)('links /tools/%s/', (slug) => {
    expect(hub).toContain(`href: '/tools/${slug}/'`);
  });

  it('is what the header’s Free Tools link opens', () => {
    expect(header).toMatch(/label: 'Free Tools', href: '\/tools\/'/);
  });

  it('makes no claim the tools cannot back up', () => {
    const copy = hub.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const re of [/nothing you type/i, /\bplan step\b/i, /\bguarantee/i, /\bthe best\b/i, /\bHIPAA\b/]) {
      expect(copy, String(re)).not.toMatch(re);
    }
  });
});
