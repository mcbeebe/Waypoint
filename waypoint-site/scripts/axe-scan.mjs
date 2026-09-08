#!/usr/bin/env node
/**
 * axe-core accessibility gate (launch checklist row 8): scan EVERY page of
 * the built dist/ and FAIL on any serious/critical violation. Run against
 * the DRAFTS build so content templates have pages to scan — a required
 * exemplar list guards against silently losing a template from the build.
 *
 * The static server replays the production CSP from vercel.json, so a CSP
 * change that breaks client behavior (the class of bug that killed inline
 * scripts and would have killed Pagefind's WASM) surfaces here: the scan
 * exercises the search page with a real query and fails if search gives no
 * response.
 *
 * Usage: node scripts/axe-scan.mjs [dist-dir]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dist = path.resolve(positional[0] ?? path.join(ROOT, 'dist'));

// The scan runs twice in `npm run gates`, against two different builds:
//
//   drafts build  — every template has an exemplar, so REQUIRED is enforced.
//   production build (--production) — only PUBLISHED content is built, so the
//     draft-only exemplars are legitimately absent and REQUIRED is relaxed to
//     REQUIRED_PUBLISHED.
//
// The production pass exists because components can render DIFFERENTLY in the
// two builds. GatedLink renders a real <a> under the drafts flag and a
// placeholder span in production; the production rendering therefore appeared
// in no build any gate had ever scanned, and shipped a card of dead grey text
// to a live page. Anything that branches on publish state must be scanned in
// the build real families get.
const PRODUCTION = process.argv.includes('--production');

// One required exemplar per template: their absence means the drafts build
// (or a template) broke, and absence must fail loudly, not skip silently.
const REQUIRED = [
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

// Routes that exist in EVERY build regardless of publish state — these must be
// present in the production scan too, or the relaxation above would hide a
// genuinely broken template.
const ALWAYS_BUILT = new Set([
  '/',
  '/guides/',
  '/tools/ssi-deeming-calculator/',
  '/tools/regional-center-finder/',
  '/pricing/',
  '/about/',
  '/privacy/',
  '/404.html',
]);

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
  '.pagefind': 'application/octet-stream',
};

// Replay the deployed CSP (vercel.json, catch-all headers entry) so the scan
// runs under the same policy as production.
function productionCsp() {
  try {
    const vercel = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    for (const entry of vercel.headers ?? []) {
      if (entry.has) continue; // host-conditioned entries don't apply here
      for (const h of entry.headers ?? []) {
        if (h.key.toLowerCase() === 'content-security-policy') return h.value;
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}
const csp = productionCsp();

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

/** All page URLs in the dist (every index.html + root-level .html). */
function allPages() {
  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) {
        const rel = path.relative(dist, p);
        pages.push(rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`);
      }
    }
  };
  walk(dist);
  return pages.sort();
}

/** Locate a chromium executable when the default resolution fails. */
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
  const headers = {};
  if (csp) headers['Content-Security-Policy'] = csp;
  if (!file) {
    const notFound = path.join(dist, '404.html');
    res.writeHead(404, { ...headers, 'Content-Type': 'text/html' });
    res.end(existsSync(notFound) ? readFileSync(notFound) : 'not found');
    return;
  }
  res.writeHead(200, {
    ...headers,
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
  });
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
  if (!bin) {
    server.close();
    throw new Error('No chromium available for the axe scan (run: npx playwright install chromium).');
  }
  browser = await chromium.launch({ executablePath: bin });
}

const failures = [];
let warnings = 0;
try {
  // In production only published content exists; still demand the always-on
  // routes plus every page that IS published, so a broken published template
  // fails loudly here too.
  const required = PRODUCTION
    ? REQUIRED.filter((url) => ALWAYS_BUILT.has(url) || fileFor(url))
    : REQUIRED;
  for (const url of required) {
    if (!fileFor(url)) {
      failures.push(
        `${url}: required template page missing from the ${PRODUCTION ? 'production' : 'drafts'} build`
      );
    }
  }
  if (PRODUCTION) {
    for (const url of ALWAYS_BUILT) {
      if (!fileFor(url)) failures.push(`${url}: always-on route missing from the production build`);
    }
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  const pages = allPages();

  for (const url of pages) {
    await page.goto(`${base}${url}`, { waitUntil: 'load' });

    // Exercise the one complex dynamic widget: type a query on /search/ and
    // require a response (results or a message). Under a broken CSP the
    // Pagefind WASM never answers — this is the mechanical tripwire.
    if (url === '/search/') {
      const input = await page
        .waitForSelector('#search input, #search p', { timeout: 8000 })
        .catch(() => null);
      if (!input) {
        failures.push('/search/: search UI never mounted (import failed?)');
      } else if (await page.$('#search input')) {
        await page.fill('#search input', 'regional center');
        const responded = await page
          .waitForSelector('.pagefind-ui__result, .pagefind-ui__message', { timeout: 8000 })
          .catch(() => null);
        if (!responded) {
          failures.push('/search/: query produced no response — index missing or CSP blocks the search WASM');
        }
      }
    }

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

  if (failures.length) {
    for (const f of failures) console.error(`ERROR: ${f}`);
    console.error(`FAIL: axe — ${failures.length} blocking issue(s) across ${pages.length} pages.`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS: axe — 0 serious/critical across ${pages.length} pages, search exercised under the production CSP (${warnings} lesser warning${warnings === 1 ? '' : 's'}).`,
    );
  }
} finally {
  await browser.close();
  server.close();
}
