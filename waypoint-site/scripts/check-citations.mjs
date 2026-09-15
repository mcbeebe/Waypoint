#!/usr/bin/env node
/**
 * Citation chip guard, over the BUILT html.
 *
 * Two failures this catches, both of which the site shipped silently before
 * chips were linked at all:
 *
 *   1. A dead chip link — `href="#src-x"` with no `id="src-x"` on the page.
 *      The reader taps a statute to check us and lands nowhere.
 *   2. Orphan growth — a chip with no sources[] entry behind it. The style
 *      guide has always required one ("Every chip must have a matching
 *      sources[] entry"); 216 chips predate the rule being enforceable, so
 *      this is a ratchet like check-tbc.mjs: the backlog may shrink, never
 *      grow. Pay it down by adding the verified source, never by deleting
 *      the chip.
 *
 *   node scripts/check-citations.mjs          # enforce the ratchet
 *   node scripts/check-citations.mjs --update # re-baseline after paying debt
 *
 * Runs against the PRODUCTION build, so the baseline counts only what ships.
 * A draft page's unsourced chips are therefore invisible here until the day it
 * publishes, and then they fail this gate — which is the point: sourcing a
 * claim is part of publishing it, not a follow-up.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');
const BASELINE = path.resolve(HERE, 'citation-orphans.json');
const UPDATE = process.argv.includes('--update');

function htmlFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (p.endsWith('.html')) out.push(p);
  }
  return out;
}

let dead = [];
let duplicates = [];
let orphans = 0;
const orphansByPage = {};

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const page = path.relative(DIST, file);

  const idList = [...html.matchAll(/id="(src-[^"]+)"/g)].map((m) => m[1]);
  const ids = new Set(idList);
  for (const m of html.matchAll(/<a class="[^"]*\bcite-link\b[^"]*" href="#(src-[^"]+)"/g)) {
    if (!ids.has(m[1])) dead.push(`${page} → #${m[1]}`);
  }

  // Two source entries sharing an id would make the chip's destination a coin
  // flip, and duplicate ids are their own accessibility defect.
  if (idList.length !== ids.size) {
    const seen = new Set();
    for (const id of idList) {
      if (seen.has(id)) duplicates.push(`${page} → #${id}`);
      seen.add(id);
    }
  }

  // A chip still rendered as a plain span found no source. Matched loosely on
  // purpose: keying off the exact string `<span class="cite">` meant any added
  // attribute silently hid orphans and reported the drop as progress.
  const n = [...html.matchAll(/<span[^>]*\bclass="[^"]*\bcite\b[^"]*"/g)].length;
  if (n > 0) {
    orphans += n;
    orphansByPage[page] = n;
  }
}

if (dead.length > 0) {
  console.error(`✗ ${dead.length} citation link(s) point at an anchor that does not exist:`);
  for (const d of dead.slice(0, 20)) console.error(`    ${d}`);
  process.exit(1);
}
if (duplicates.length > 0) {
  console.error(`✗ ${duplicates.length} duplicate source id(s) — a chip would land on a coin flip:`);
  for (const d of duplicates.slice(0, 20)) console.error(`    ${d}`);
  process.exit(1);
}
console.log(`✓ every linked chip resolves to a unique source on its own page`);

if (UPDATE) {
  writeFileSync(BASELINE, `${JSON.stringify({ total: orphans, byPage: orphansByPage }, null, 2)}\n`);
  console.log(`✓ baseline written: ${orphans} chip(s) still without a source`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  console.error(`✗ no baseline at ${path.relative(process.cwd(), BASELINE)} — run with --update`);
  process.exit(1);
}

// Per page, not just in total: a global count lets a new unsourced chip on one
// page hide behind a chip that got sourced on another, which is exactly how a
// ratchet stops ratcheting.
const worse = Object.entries(orphansByPage)
  .map(([p, n]) => [p, baseline.byPage?.[p] ?? 0, n])
  .filter(([, was, now]) => now > was);

if (worse.length > 0) {
  console.error(`✗ chips without a sources[] entry grew on ${worse.length} page(s):`);
  for (const [p, was, now] of worse.slice(0, 15)) console.error(`    ${p}: ${was} → ${now}`);
  console.error(
    `  Add the verified primary source to that page's sources[]; never delete the chip\n` +
      `  and never guess a URL (STYLE-GUIDE §3 rule 3).`
  );
  process.exit(1);
}

if (orphans < baseline.total) {
  console.log(
    `✓ unsourced chips: ${orphans} (down from ${baseline.total} — re-baseline with --update)`
  );
} else {
  console.log(`✓ unsourced chips: ${orphans}, no growth against the baseline`);
}
