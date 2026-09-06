#!/usr/bin/env node
/**
 * axe-core accessibility gate (launch checklist row 8): scan one page per
 * template in the built dist/ and FAIL on any serious/critical violation.
 * Moderate/minor issues are reported as warnings, not failures — the
 * checklist threshold is serious/critical.
 *
 * Run against the DRAFTS build so content templates have pages to scan.
 * Usage: node scripts/axe-scan.mjs [dist-dir]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] ?? path.join(HERE, '..', 'dist'));

// One exemplar per template. A path listed here that doesn't exist in the
// build is an ERROR — a silently skipped template is how a11y regressions
// hide (drafts build required).
const PAGES = [
  '/',
  '/guides/',
  '/guides/regional-centers/',
  '/guides/benefits/ihss-protective-supervision/',
  '/start/autism/',
  '/answers/does-my-child-need-ssi-to-get-ihss/',
  '/letters/iep-evaluation-request/',
  '/regional-centers/east-bay/',
  '/tools/ssi-deeming-calculator/',
  '/tools/regional-center-finder/',
  '/pricing/',
  '/about/',
  '/search/',
  '/privacy/',
  '/404.html',
];

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const rel = clean.replace(/^\/+/, '');
  for (const candidate of [
    path.join(dist, rel),
    path.join(dist, rel, 'index.html'),
    path.join(dist, `${rel.replace(/\/$/, '')}.html`),
  ]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      try {
        return readFileSync(candidate) && candidate;
      } catch {
        /* directory — keep looking */
      }
    }
  }
  return null;
}

/** Locate a chromium executable when the default resolution fails. */
function findChromium() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root)) {
      if (!dir.startsWith('chromium-')) continue;
      const bin = path.join(root, dir, 'chrome-linux', 'chrome');
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

const server = createServer((req, res) => {
  const file = fileFor(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    const notFound = path.join(dist, '404.html');
    res.end(existsSync(notFound) ? readFileSync(notFound) : 'not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

let browser;
try {
  browser = await chromium.launch();
} catch {
  const bin = findChromium();
  if (!bin) throw new Error('No chromium available for the axe scan.');
  browser = await chromium.launch({ executablePath: bin });
}

const failures = [];
let warnings = 0;
// @axe-core/playwright requires a page from an explicit context.
const context = await browser.newContext();
const page = await context.newPage();
for (const url of PAGES) {
  if (!fileFor(url)) {
    failures.push(`${url}: page missing from build (scan requires the drafts build)`);
    continue;
  }
  await page.goto(`${base}${url}`, { waitUntil: 'load' });
  const results = await new AxeBuilder({ page }).analyze();
  for (const v of results.violations) {
    const line = `${url}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`;
    if (v.impact === 'serious' || v.impact === 'critical') failures.push(line);
    else {
      warnings += 1;
      console.warn(`WARN: ${line}`);
    }
  }
}

await browser.close();
server.close();

if (failures.length) {
  for (const f of failures) console.error(`ERROR: ${f}`);
  console.error(`FAIL: axe — ${failures.length} serious/critical issue(s) across ${PAGES.length} pages.`);
  process.exit(1);
}
console.log(
  `PASS: axe — 0 serious/critical across ${PAGES.length} template pages (${warnings} lesser warning${warnings === 1 ? '' : 's'}).`,
);
