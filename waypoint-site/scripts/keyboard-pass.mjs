#!/usr/bin/env node
/**
 * Keyboard-only gate (launch checklist row 8, second half).
 *
 * axe-core checks the markup a screen reader reads. It does not press Tab,
 * so it cannot tell you that a control is unreachable, that focus is
 * trapped, that the focus ring is invisible, or that a tool cannot actually
 * be COMPLETED without a mouse. Those are the failures a parent using a
 * switch or a keyboard hits first, and they are exactly the ones an
 * automated a11y scan certifies as clean.
 *
 * So this drives the real browser with real Tab presses:
 *   1. the skip link is the first stop and becomes visible when focused
 *   2. every enabled control is reachable by Tab
 *   3. focus never gets stuck (no trap) and the cycle terminates
 *   4. every focused control paints a visible indicator — checked while
 *      focused via keyboard, so :focus-visible genuinely applies
 *   5. each tool can be driven to a real answer with the keyboard alone
 *
 * Runs against the DRAFTS build so every template exists. Usage:
 *   node scripts/keyboard-pass.mjs [dist-dir]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dist = path.resolve(positional[0] ?? path.join(ROOT, 'dist'));

// One page per interaction pattern, not every page: the header, footer, and
// skip link are shared, so walking 40 content pages would re-prove the same
// chrome 40 times. The tools are here because they are the only pages where
// the keyboard has to accomplish something, not just travel.
const PAGES = [
  '/',
  '/tools/ssi-deeming-calculator/',
  '/tools/regional-center-finder/',
  '/guides/benefits/ihss-protective-supervision/',
  '/start/',
  '/search/',
];

// Pages that exist no matter what is published. In the production build the
// content-backed pages above may legitimately be absent, so --production
// relaxes to these plus whatever else actually built. Without the relaxation,
// running this against a production dist reports a missing page as a
// keyboard failure, which is a lie about the thing being measured.
const ALWAYS_BUILT = new Set([
  '/',
  '/tools/ssi-deeming-calculator/',
  '/tools/regional-center-finder/',
  '/search/',
]);
const PRODUCTION = process.argv.includes('--production');

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

/** Replay the deployed CSP so a policy that breaks a control fails here too. */
function productionCsp() {
  try {
    const vercel = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    for (const entry of vercel.headers ?? []) {
      if (entry.has) continue;
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
    res.writeHead(404, { ...headers, 'Content-Type': 'text/html' });
    res.end('not found');
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

const failures = [];
let pagesWalked = 0;

/**
 * Stamp every focusable with a unique id before walking.
 *
 * Identity cannot come from tag + id + text: a checklist's toggle buttons
 * are all `<button>` with empty text until checked, so a text-derived key
 * makes eight distinct controls look like one element focused eight times
 * — which reads as a focus trap that isn't there. The stamp is the only
 * honest identity.
 */
const STAMP = `() => {
  const sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const out = [];
  let n = 0;
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    // Off-screen-until-focused controls (the skip link) still count.
    if (!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)) continue;
    const key = 'k' + n++;
    el.dataset.kbKey = key;
    out.push({
      key,
      label:
        (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '')
          .trim()
          .slice(0, 40) || el.tagName.toLowerCase(),
    });
  }
  return out;
}`;

/** Describe whatever currently has focus, plus whether it looks focused. */
const DESCRIBE = `() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  if (!el.dataset.kbKey) {
    // Focusable that appeared after the stamp (a widget mounted late).
    window.__kbDyn = (window.__kbDyn || 0) + 1;
    el.dataset.kbKey = 'dyn' + window.__kbDyn;
  }
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth || '0') > 0;
  const shadow = cs.boxShadow && cs.boxShadow !== 'none';
  const label =
    (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '')
      .trim()
      .slice(0, 40) || el.tagName.toLowerCase();
  return {
    key: el.dataset.kbKey,
    tag: el.tagName.toLowerCase(),
    label,
    visibleIndicator: outline || shadow,
    onScreen:
      rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 &&
      rect.left < innerWidth && rect.top < innerHeight,
  };
}`;

let browser;
try {
  browser = await chromium.launch();
} catch {
  const bin = findChromium();
  if (!bin) {
    server.close();
    throw new Error('No chromium available (run: npx playwright install chromium).');
  }
  browser = await chromium.launch({ executablePath: bin });
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();

  const pages = PRODUCTION ? PAGES.filter((u) => ALWAYS_BUILT.has(u) || fileFor(u)) : PAGES;
  pagesWalked = pages.length;
  for (const url of pages) {
    if (!fileFor(url)) {
      failures.push(`${url}: page missing from the build — cannot run the keyboard pass`);
      continue;
    }
    await page.goto(`${base}${url}`, { waitUntil: 'load' });
    await page.evaluate(() => document.body.focus());

    const expected = await page.evaluate(`(${STAMP})()`);

    // 1. First stop must be the skip link, and focusing it must bring it
    //    on-screen — a skip link parked off-screen while focused is worse
    //    than none, because it swallows the first Tab silently.
    await page.keyboard.press('Tab');
    const first = await page.evaluate(`(${DESCRIBE})()`);
    if (!first || !/skip/i.test(first.label)) {
      failures.push(`${url}: first Tab stop is "${first?.label ?? '(nothing)'}", expected the skip link`);
    } else if (!first.onScreen) {
      failures.push(`${url}: the skip link stays off-screen while focused — invisible first Tab stop`);
    }

    // 2-4. Walk the cycle.
    const seen = new Map();
    const order = [];
    let previousKey = first?.key ?? null;
    let repeats = 0;
    const cap = expected.length * 2 + 30;
    let steps = 0;
    let cycled = false;

    if (first) {
      seen.set(first.key, first);
      order.push(first.key);
      if (!first.visibleIndicator) {
        failures.push(`${url}: focused "${first.label}" paints no visible focus indicator`);
      }
    }

    while (steps < cap) {
      steps += 1;
      await page.keyboard.press('Tab');
      const cur = await page.evaluate(`(${DESCRIBE})()`);
      if (!cur) break; // focus left the document — the cycle ended cleanly
      if (cur.key === previousKey) {
        repeats += 1;
        // Two Tabs in a row landing on the same element is a trap; one can
        // legitimately happen where a composite widget eats a press.
        if (repeats >= 2) {
          failures.push(`${url}: focus appears trapped on "${cur.label || cur.tag}"`);
          break;
        }
      } else {
        repeats = 0;
      }
      previousKey = cur.key;
      if (order.length && cur.key === order[0]) {
        cycled = true;
        break;
      }
      if (!seen.has(cur.key)) {
        seen.set(cur.key, cur);
        order.push(cur.key);
        if (!cur.visibleIndicator) {
          failures.push(`${url}: focused "${cur.label || cur.tag}" paints no visible focus indicator`);
        }
      }
    }
    if (steps >= cap && !cycled) {
      failures.push(`${url}: Tab never completed a cycle in ${cap} presses — likely a focus trap`);
    }

    const missed = expected.filter((c) => !seen.has(c.key));
    if (missed.length) {
      failures.push(
        `${url}: ${missed.length} control(s) unreachable by Tab — ${missed
          .slice(0, 4)
          .map((c) => `"${c.label}"`)
          .join(' · ')}`,
      );
    }
  }

  // 5. The tools have to be COMPLETABLE by keyboard, not merely traversable.
  //    A calculator you can Tab across but never run is still a mouse tool.
  await page.goto(`${base}/tools/ssi-deeming-calculator/`, { waitUntil: 'load' });
  const runnable = await page.$('#c-run:not([disabled])');
  if (!runnable) {
    failures.push('/tools/ssi-deeming-calculator/: the estimate button is disabled in this build');
  } else {
    await page.focus('#c-run');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const result = (await page.textContent('#c-result'))?.trim() ?? '';
    if (!result || result === '$—') {
      failures.push('/tools/ssi-deeming-calculator/: Enter on the focused button produced no estimate');
    }
  }

  await page.goto(`${base}/tools/regional-center-finder/`, { waitUntil: 'load' });
  const select = await page.$('#f-county');
  if (!select) {
    failures.push('/tools/regional-center-finder/: the county select is missing');
  } else {
    // Keyboard-only county choice: focus the select and type the name, the
    // way someone without a mouse actually picks one.
    await page.focus('#f-county');
    await page.keyboard.type('Alameda');
    await page.focus('#f-run');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const result = (await page.textContent('#f-result'))?.trim() ?? '';
    if (!result || /^—?$/.test(result)) {
      failures.push('/tools/regional-center-finder/: Enter on the focused button produced no match');
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  for (const f of failures) console.error(`ERROR: ${f}`);
  console.error(`FAIL: keyboard pass — ${failures.length} issue(s) (launch-checklist row 8).`);
  process.exit(1);
}
console.log(
  `PASS: keyboard pass — ${pagesWalked} pages walked with real Tab presses; skip link first, no traps, every control reachable with a visible focus ring, both tools completable without a mouse.`,
);
