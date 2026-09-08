#!/usr/bin/env node
/**
 * The [TBC] ratchet (pipeline §3): a draft may carry [TBC] markers, but a
 * page may not advance past founder_edit with one intact — "it does not go
 * to review with a [TBC]". Fails the gates for any content file whose
 * status is in_review/approved/published while [TBC appears anywhere in it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(HERE, '..', 'src', 'content');
const GATED = new Set(['in_review', 'approved', 'published']);

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

const errors = [];
let checked = 0;
for (const file of mdxFiles(CONTENT)) {
  checked += 1;
  const text = readFileSync(file, 'utf8');
  const status = text.match(/^status:\s*(\S+)/m)?.[1];
  if (status && GATED.has(status) && text.includes('[TBC')) {
    const count = (text.match(/\[TBC/g) ?? []).length;
    errors.push(`${path.relative(process.cwd(), file)}: status '${status}' with ${count} [TBC] marker(s)`);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error('FAIL: [TBC] markers must be resolved before a page enters review (pipeline §3).');
  process.exit(1);
}
console.log(`PASS: [TBC] ratchet — ${checked} content files; none past founder_edit with markers.`);
