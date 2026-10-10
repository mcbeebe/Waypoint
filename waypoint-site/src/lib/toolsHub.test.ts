import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The /tools/ hub must list every free tool (initiative 013, PR 3). A tool
 * page added anywhere under src/pages/tools/ without a card on the hub would
 * be reachable only from the footer, so this fails until the hub links it.
 * The header's "Free Tools" and the homepage's free-tools card must open the
 * hub, not one tool.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..');
const toolsDir = path.join(src, 'pages', 'tools');

/** Source with code comments removed: a link in a comment is not a card. */
// Block comments are matched only where they open a line, so a path such as
// '/_astro/*.js' inside a string is never mistaken for one.
const strip = (s: string) =>
  s
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/{\/\*[\s\S]*?\*\/}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const read = (...p: string[]) => strip(readFileSync(path.join(src, ...p), 'utf8'));

/** Every route under src/pages/tools/ except the hub itself, as its URL path. */
function toolRoutes(dir: string, base = '/tools/'): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...toolRoutes(full, `${base}${name}/`));
    } else if (name.endsWith('.astro')) {
      if (name.startsWith('[')) throw new Error(`dynamic route ${full}: list its pages on the hub and teach this test about them`);
      out.push(name === 'index.astro' ? base : `${base}${name.replace(/\.astro$/, '')}/`);
    }
  }
  return out;
}

const hub = read('pages', 'tools', 'index.astro');
const tools = toolRoutes(toolsDir).filter((u) => u !== '/tools/');

describe('free tools hub', () => {
  it('finds the tool pages it guards', () => {
    expect(tools.length).toBeGreaterThanOrEqual(3);
  });

  it.each(tools)('has a card for %s', (url) => {
    expect(hub).toContain(`href: '${url}'`);
  });

  it('is what the header’s Free Tools link and the homepage’s tools card open', () => {
    expect(read('components', 'SiteHeader.astro')).toMatch(/label: 'Free Tools', href: '\/tools\/'/);
    expect(read('pages', 'index.astro')).toMatch(/title: 'Free tools',[\s\S]{0,300}?href: '\/tools\/'/);
  });

  it('does not promise the app reads a tool result (it records it only as attribution)', () => {
    for (const re of [/carry (?:a|your) (?:short )?summary/i, /about your result/i, /\bplan step\b/i, /every step/i]) {
      expect(hub, String(re)).not.toMatch(re);
    }
  });
});
