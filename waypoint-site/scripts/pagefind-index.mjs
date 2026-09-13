#!/usr/bin/env node
/**
 * Search-index step for both build flavors. Pagefind's documented fallback
 * when NO page carries [data-pagefind-body] is to index EVERY page — which,
 * on a production build with zero published articles, means the 404 page,
 * pricing, and the search page itself become the search corpus (adversary
 * finding). So: index only when at least one article body exists in the
 * build; otherwise skip, and the search page's no-index fallback handles it.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] ?? path.join(HERE, '..', 'dist'));

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

if (!existsSync(dist)) {
  console.error(`ERROR: ${dist} does not exist — build first.`);
  process.exit(1);
}

const hasBody = htmlFiles(dist).some((f) => readFileSync(f, 'utf8').includes('data-pagefind-body'));
if (!hasBody) {
  console.log('pagefind-index: no [data-pagefind-body] pages in this build — index skipped (nothing to search yet).');
  process.exit(0);
}

execFileSync('npx', ['pagefind', '--site', dist], { stdio: 'inherit' });
