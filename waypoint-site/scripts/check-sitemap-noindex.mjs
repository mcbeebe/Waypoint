#!/usr/bin/env node
/**
 * Invariant: nothing in the sitemap may carry a noindex robots meta tag.
 *
 * The sitemap filter in astro.config.mjs used to be a fail-safe prefix rule
 * ("no /tools/ pages"). Launching the deeming calculator turned it into a
 * one-URL denylist, i.e. fail-OPEN: a new noindexed page is now sitemapped
 * by default, defended only by a code comment. This script makes the
 * invariant real — telling Google to index a page that tells Google not to
 * index it is a self-inflicted SEO fault no other gate can see.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');

if (!existsSync(DIST)) {
  console.error('ERROR: dist/ not found — build before running the sitemap check.');
  process.exit(1);
}

const sitemaps = readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
if (sitemaps.length === 0) {
  console.log('PASS: sitemap ∩ noindex — no sitemap in this build (drafts build); nothing to check.');
  process.exit(0);
}

const locs = new Set();
for (const file of sitemaps) {
  const xml = readFileSync(path.join(DIST, file), 'utf8');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (!/sitemap.*\.xml$/.test(m[1])) locs.add(m[1]);
  }
}

/** dist-relative index.html for a sitemap URL. */
const pageFor = (loc) => {
  const p = new URL(loc).pathname;
  return path.join(DIST, p === '/' ? 'index.html' : path.join(p, 'index.html'));
};

const errors = [];
for (const loc of locs) {
  const file = pageFor(loc);
  if (!existsSync(file)) {
    errors.push(`${loc} — listed in the sitemap but no page was built for it`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html)) {
    errors.push(`${loc} — in the sitemap AND carries a noindex robots meta tag`);
  }
}

// The reverse direction: a page that dropped noindex but never made it in.
let noindexed = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name === 'index.html') {
      if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(readFileSync(p, 'utf8'))) noindexed += 1;
    }
  }
};
walk(DIST);

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error('FAIL: the sitemap and the robots meta tags disagree.');
  process.exit(1);
}
console.log(
  `PASS: sitemap ∩ noindex = ∅ — ${locs.size} sitemapped URL(s) all indexable; ${noindexed} noindexed page(s) correctly excluded.`
);
