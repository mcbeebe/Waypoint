#!/usr/bin/env node
/**
 * JSON-LD gate (launch-checklist row 7).
 *
 * That row is a launch BLOCKER and until now it was a manual Rich Results
 * Test nobody had run — on an already-live site. This makes it a build
 * gate: every ld+json block in dist must parse, declare @context and
 * @type, and carry the fields the type actually needs to be useful to a
 * search or answer engine.
 *
 * It validates SHAPE, not truth. It cannot tell you an author is real —
 * that is the review ladder's job. It can tell you an Article shipped
 * without a headline, which is the failure mode that silently wastes
 * every structured-data signal on the page.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');

/** Required top-level fields per @type we emit. */
const REQUIRED = {
  Organization: ['name', 'url'],
  Article: ['headline', 'author', 'datePublished', 'publisher'],
  BreadcrumbList: ['itemListElement'],
  Person: ['name'],
  ListItem: ['position', 'name'],
};

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === '.prerender' || name === '_astro') continue;
      out.push(...htmlFiles(p));
    } else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** Walk a node and every nested object, checking any that declares @type. */
function checkNode(node, file, errors, seen) {
  if (Array.isArray(node)) {
    for (const n of node) checkNode(n, file, errors, seen);
    return;
  }
  if (!node || typeof node !== 'object') return;

  const type = node['@type'];
  if (typeof type === 'string') {
    seen.add(type);
    const required = REQUIRED[type];
    if (required) {
      for (const field of required) {
        const v = node[field];
        const missing = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (missing) errors.push(`${file}: ${type} is missing required field "${field}"`);
      }
    }
  }
  for (const value of Object.values(node)) checkNode(value, file, errors, seen);
}

const errors = [];
const seen = new Set();
let blocks = 0;
let files = 0;

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file);
  const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (matches.length) files += 1;
  for (const [, raw] of matches) {
    blocks += 1;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      errors.push(`${rel}: ld+json does not parse — ${err.message}`);
      continue;
    }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (!node['@context']) errors.push(`${rel}: ld+json block has no @context`);
      if (!node['@type']) errors.push(`${rel}: ld+json block has no @type`);
    }
    checkNode(parsed, rel, errors, seen);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`FAIL: ${errors.length} JSON-LD problem(s) (launch-checklist row 7).`);
  process.exit(1);
}

console.log(
  `PASS: JSON-LD — ${blocks} block(s) across ${files} page(s); types: ${[...seen].sort().join(', ') || 'none'}.`,
);
