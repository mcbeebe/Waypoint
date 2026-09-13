#!/usr/bin/env node
/**
 * Performance budget (launch-checklist row 24).
 *
 * The row asks for a recorded mobile baseline that regressions are tracked
 * from. A number in a doc rots; this keeps the baseline in the repo
 * (perf-baseline.json) and compares every run against it.
 *
 * Two honest caveats shape how strict this is:
 *
 *  1. Lighthouse scores move a few points run to run on identical code, and
 *     more than that on a shared CI runner. So the gate has tolerances, and
 *     a single point of drift is not a failure.
 *  2. This runs against a locally served dist, not the CDN. It measures what
 *     WE control — bundle size, render-blocking work, layout stability — not
 *     what Vercel's edge does. Field data in Search Console is the truth
 *     about real users; this is the guard on the code.
 *
 * Usage:
 *   node scripts/lighthouse-budget.mjs            compare against the baseline
 *   node scripts/lighthouse-budget.mjs --update   rewrite the baseline
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const dist = path.join(ROOT, 'dist');
const BASELINE = path.join(ROOT, 'perf-baseline.json');
const UPDATE = process.argv.includes('--update');

// The four main templates, per row 24. Marketing home, a long guide, an
// interactive tool, and the checklist — between them they cover every
// rendering path the site has.
const TEMPLATES = {
  home: '/',
  guide: '/guides/regional-centers/',
  tool: '/tools/ssi-deeming-calculator/',
  checklist: '/start/',
};

// How far a metric may drift before it counts as a regression rather than
// noise. Scores are 0-100; timings are milliseconds.
const TOLERANCE = {
  performance: 5,
  accessibility: 0,
  'best-practices': 5,
  seo: 0,
  lcp: 400,
  cls: 0.02,
  tbt: 200,
  transferKb: 40,
};

// Absolute floors, independent of the baseline: a slow page cannot be
// ratified into acceptability by updating the baseline enough times.
const FLOOR = {
  performance: 85,
  accessibility: 95,
  seo: 95,
  lcp: 3000,
  cls: 0.1,
};

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
  '.wasm': 'application/wasm',
  '.txt': 'text/plain',
};

function fileFor(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const rel = clean.replace(/^\/+/, '');
  for (const candidate of [
    path.join(dist, rel),
    path.join(dist, rel, 'index.html'),
    path.join(dist, `${rel.replace(/\/$/, '')}.html`),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function findChromium() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(
    (r) => r && r !== '0',
  );
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root)) {
      if (!/^chromium-\d+$/.test(dir)) continue;
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
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// chrome-launcher picks a FREE debugging port. A hard-coded 9222 looked
// fine until two runs happened back to back and the second attached to a
// dying instance from the first — which surfaces as pages "missing from the
// build" and scores of zero, i.e. as a fake regression. Point it at
// Playwright's Chromium so CI needs no system Chrome.
const chromePath = chromium.executablePath?.() ?? findChromium();
if (!chromePath || !existsSync(chromePath)) {
  server.close();
  throw new Error('No chromium available (run: npx playwright install chromium).');
}
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});

const results = {};
const missing = [];

try {
  for (const [name, url] of Object.entries(TEMPLATES)) {
    if (!fileFor(url)) {
      missing.push(`${name} (${url})`);
      continue;
    }
    const run = await lighthouse(
      `${base}${url}`,
      { port: chrome.port, output: 'json', logLevel: 'error' },
      // Mobile, throttled — the default preset, stated explicitly so a
      // Lighthouse upgrade cannot quietly change what the baseline means.
      { extends: 'lighthouse:default', settings: { formFactor: 'mobile', screenEmulation: {
        mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false,
      } } },
    );
    const lhr = run?.lhr;
    if (!lhr || lhr.runtimeError) {
      missing.push(
        `${name} (${url}) — Lighthouse could not measure it${lhr?.runtimeError ? `: ${lhr.runtimeError.message}` : ''}`,
      );
      continue;
    }
    const a = lhr.audits;
    results[name] = {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      'best-practices': Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
      lcp: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
      cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
      tbt: Math.round(a['total-blocking-time']?.numericValue ?? 0),
      transferKb: Math.round((a['total-byte-weight']?.numericValue ?? 0) / 1024),
    };
  }
} finally {
  await chrome.kill();
  server.close();
}

const HIGHER_IS_BETTER = new Set(['performance', 'accessibility', 'best-practices', 'seo']);

function report(rows) {
  const keys = Object.keys(TOLERANCE);
  const head = ['template', ...keys].join('\t');
  const lines = Object.entries(rows).map(([n, r]) => [n, ...keys.map((k) => r[k])].join('\t'));
  return [head, ...lines].join('\n');
}

console.log(report(results));

if (UPDATE) {
  writeFileSync(
    BASELINE,
    JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), templates: results }, null, 2) + '\n',
  );
  console.log(`\nBaseline written to ${path.relative(process.cwd(), BASELINE)}.`);
  process.exit(missing.length ? 1 : 0);
}

const failures = [...missing.map((m) => `template missing from the build: ${m}`)];

// Floors first — they apply whether or not a baseline exists.
for (const [name, r] of Object.entries(results)) {
  for (const [metric, floor] of Object.entries(FLOOR)) {
    const value = r[metric];
    const bad = HIGHER_IS_BETTER.has(metric) ? value < floor : value > floor;
    if (bad) failures.push(`${name}: ${metric} is ${value}, floor is ${floor}`);
  }
}

if (!existsSync(BASELINE)) {
  console.warn('\nWARN: no perf-baseline.json — run with --update to record one.');
} else {
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
  console.log(`\nCompared against the baseline recorded ${baseline.recorded}.`);
  for (const [name, r] of Object.entries(results)) {
    const b = baseline.templates?.[name];
    if (!b) {
      console.warn(`WARN: ${name} has no baseline entry — run with --update.`);
      continue;
    }
    for (const [metric, tol] of Object.entries(TOLERANCE)) {
      const drift = HIGHER_IS_BETTER.has(metric) ? b[metric] - r[metric] : r[metric] - b[metric];
      if (drift > tol) {
        failures.push(
          `${name}: ${metric} regressed ${Number(drift.toFixed(3))} (baseline ${b[metric]} → now ${r[metric]}, tolerance ${tol})`,
        );
      }
    }
  }
}

if (failures.length) {
  for (const f of failures) console.error(`ERROR: ${f}`);
  console.error(`\nFAIL: performance budget — ${failures.length} problem(s) (launch-checklist row 24).`);
  process.exit(1);
}
console.log(
  `\nPASS: performance budget — ${Object.keys(results).length} template(s) within tolerance of the baseline and above every floor.`,
);
