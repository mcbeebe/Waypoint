#!/usr/bin/env node
/**
 * Citation link-rot check: every URL in a content file's `sources[]`.
 *
 * The internal-link gate cannot see these — they live in frontmatter, not
 * in rendered HTML — yet they are the receipts the whole trust contract
 * rests on. A statute link that 404s on a published YMYL page is exactly
 * the thing a reader checks when deciding whether to believe us.
 *
 * NETWORK-DEPENDENT, so it is deliberately NOT in `npm run gates`: a
 * flaky government host must never block a content PR. Run it on a
 * schedule (CI weekly) and before a reviewer packet goes out.
 *
 *   node scripts/check-sources.mjs            # report, always exit 0
 *   node scripts/check-sources.mjs --strict   # exit 1 on any dead link
 *
 * Government sites often refuse HEAD and bot-ish agents, so a failure is
 * retried as a GET with a browser UA before being called dead.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(HERE, '..', 'src', 'content');
const STRICT = process.argv.includes('--strict');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const TIMEOUT_MS = 20000;

function mdxFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...mdxFiles(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Pull url: "..." lines out of the sources: block of the frontmatter. */
function sourceUrls(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return [];
  // Take the indented lines under `sources:` until a line that starts at
  // column 0 (the next frontmatter key). Written as a line walk rather than
  // a regex: the obvious regex used \Z, which is Python, not JavaScript,
  // and silently matched nothing at all.
  const lines = fm[1].split('\n');
  const start = lines.findIndex((l) => l === 'sources:');
  if (start === -1) return [];
  const urls = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() !== '' && !/^\s/.test(line)) break;
    const m = line.match(/url:\s*"([^"]+)"/);
    if (m) urls.push(m[1]);
  }
  return urls;
}

async function probe(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: '*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return { ok: true, status: res.status };
      // Many .gov hosts 403/405 a HEAD but serve the GET fine.
      if (method === 'GET') return { ok: false, status: res.status };
    } catch (err) {
      if (method === 'GET') return { ok: false, status: err.name === 'TimeoutError' ? 'timeout' : err.message };
    }
  }
  return { ok: false, status: 'unknown' };
}

const byUrl = new Map(); // url -> Set(file)
for (const file of mdxFiles(CONTENT)) {
  const rel = path.relative(process.cwd(), file);
  for (const url of sourceUrls(readFileSync(file, 'utf8'))) {
    if (!byUrl.has(url)) byUrl.set(url, new Set());
    byUrl.get(url).add(rel);
  }
}

if (byUrl.size === 0) {
  console.log('PASS: citation sources — no sources[] URLs found to check.');
  process.exit(0);
}

const dead = [];
const urls = [...byUrl.keys()];
const CONCURRENCY = 6;
let cursor = 0;

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const { ok, status } = await probe(url);
      if (!ok) dead.push({ url, status, files: [...byUrl.get(url)] });
    }
  }),
);

for (const d of dead) {
  console.error(`DEAD (${d.status}): ${d.url}`);
  for (const f of d.files) console.error(`        cited by ${f}`);
}

if (dead.length && STRICT) {
  console.error(`FAIL: ${dead.length} dead citation URL(s) of ${byUrl.size} checked.`);
  process.exit(1);
}

console.log(
  `${dead.length ? 'WARN' : 'PASS'}: citation sources — ${byUrl.size} unique URL(s) checked, ${dead.length} unreachable.`,
);
