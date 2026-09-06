#!/usr/bin/env node
/**
 * Internal-link check over a built dist/: every root-relative href/src in the
 * HTML must resolve to a file in the same build. This is what catches an
 * out-of-order publish — an MDX body linking a sibling page that isn't
 * published yet ships a 404 on a live YMYL page, and no schema check can see
 * it (adversary finding A6). Run against the PRODUCTION build.
 *
 * Usage: node scripts/check-internal-links.mjs [dist-dir]
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] ?? path.join(HERE, '..', 'dist'));

if (!existsSync(dist)) {
  console.error(`ERROR: ${dist} does not exist — build first.`);
  process.exit(1);
}

/** All .html files under dist. */
function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Does a root-relative URL path resolve inside this dist? */
function resolves(urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  const rel = clean.replace(/^\//, '');
  const candidates = [
    path.join(dist, rel),
    path.join(dist, rel, 'index.html'),
    path.join(dist, rel.replace(/\/$/, '') + '.html'),
  ];
  return candidates.some((c) => existsSync(c));
}

const errors = [];
let checked = 0;
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8');
  const refs = html.matchAll(/(?:href|src)="(\/[^"]*)"/g);
  for (const [, url] of refs) {
    if (url.startsWith('//')) continue; // protocol-relative external
    checked += 1;
    if (!resolves(url)) {
      errors.push(`${path.relative(dist, file)} → ${url}`);
    }
  }
}

if (errors.length) {
  for (const e of [...new Set(errors)]) console.error(`ERROR: dead internal link: ${e}`);
  console.error(`FAIL: ${errors.length} dead internal reference(s) in ${dist}.`);
  process.exit(1);
}
console.log(`PASS: internal links — ${checked} root-relative refs resolve in ${path.basename(dist)}.`);
