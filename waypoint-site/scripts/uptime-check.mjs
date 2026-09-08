#!/usr/bin/env node
/**
 * Live-site monitor (launch-checklist rows 4, 5, 12, 20).
 *
 * This is NOT a substitute for a real uptime pinger — it runs on a cron
 * measured in hours, so a 20-minute outage will slip past it. What it is
 * good at is the failure mode that actually threatens this site: a silent
 * CONFIGURATION regression that nobody notices for weeks.
 *
 * The app host losing its noindex header, the marketing robots.txt flipping
 * to Disallow, the sitemap 404ing, a bot filter starting to challenge
 * Googlebot, a certificate quietly running down — none of those page anyone,
 * none of them look like downtime, and every one of them costs the whole
 * organic channel. Those are the things checked here, on a schedule, against
 * the real hosts.
 *
 * Exit non-zero on any failure so CI can raise an issue.
 * Usage: node scripts/uptime-check.mjs
 */
import tls from 'node:tls';

const APEX = 'https://waypointchild.com';
const WWW = 'https://www.waypointchild.com';
const APP = 'https://app.waypointchild.com';

// A published page, so the check exercises real content routing and not just
// the home page a CDN would serve from cache forever.
const PUBLISHED_PAGE = `${APEX}/guides/regional-centers/`;

// Answer engines are a distribution channel, not a threat (launch-checklist
// row 5). If a bot filter ever starts challenging these, organic and AI
// referral traffic dies silently — no error, no alert, just a flat line.
const CRAWLERS = {
  Googlebot:
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  GPTBot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  ClaudeBot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  PerplexityBot: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
};

const CERT_FAIL_DAYS = 14;
const CERT_WARN_DAYS = 30;

const failures = [];
const warnings = [];
const notes = [];

async function fetchHead(url, { ua, redirect = 'manual' } = {}) {
  const headers = { 'User-Agent': ua ?? 'waypoint-uptime-check' };
  const res = await fetch(url, { redirect, headers });
  return res;
}

/** Days until the TLS certificate for `host` expires, or null if unreachable. */
function certDaysLeft(host) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, timeout: 15000 },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) return resolve(null);
        const ms = new Date(cert.valid_to).getTime() - Date.now();
        resolve(Math.floor(ms / 86_400_000));
      },
    );
    socket.on('error', () => resolve(null));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function check(label, fn) {
  try {
    await fn();
  } catch (err) {
    failures.push(`${label}: threw — ${err.message}`);
  }
}

// ---------------------------------------------------------------------------

await check('apex is up', async () => {
  const res = await fetchHead(APEX + '/', { redirect: 'follow' });
  if (res.status !== 200) failures.push(`apex: expected 200, got ${res.status}`);
  const robots = res.headers.get('x-robots-tag');
  if (robots && /noindex/i.test(robots)) {
    failures.push(`apex: serving "X-Robots-Tag: ${robots}" — the marketing site is deindexing itself`);
  }
  const html = await res.text();
  if (!/waypoint/i.test(html)) failures.push('apex: response body does not look like the Waypoint site');
});

await check('published page is up', async () => {
  const res = await fetchHead(PUBLISHED_PAGE, { redirect: 'follow' });
  if (res.status !== 200) failures.push(`${PUBLISHED_PAGE}: expected 200, got ${res.status}`);
});

await check('apex robots.txt invites crawlers', async () => {
  const res = await fetchHead(`${APEX}/robots.txt`, { redirect: 'follow' });
  if (res.status !== 200) {
    failures.push(`apex robots.txt: expected 200, got ${res.status}`);
    return;
  }
  const body = await res.text();
  if (/^\s*Disallow:\s*\/\s*$/m.test(body)) {
    failures.push('apex robots.txt: contains a blanket "Disallow: /" — the whole site is blocked');
  }
  if (!/Sitemap:/i.test(body)) failures.push('apex robots.txt: no Sitemap: line');
});

await check('sitemap is served', async () => {
  const res = await fetchHead(`${APEX}/sitemap-index.xml`, { redirect: 'follow' });
  if (res.status !== 200) failures.push(`sitemap-index.xml: expected 200, got ${res.status}`);
  else {
    const body = await res.text();
    if (!body.includes('<sitemapindex') && !body.includes('<urlset')) {
      failures.push('sitemap-index.xml: served, but the body is not a sitemap');
    }
  }
});

await check('www redirects to the apex', async () => {
  const res = await fetchHead(`${WWW}/`);
  if (![301, 302, 307, 308].includes(res.status)) {
    failures.push(`www: expected a redirect, got ${res.status}`);
    return;
  }
  const location = res.headers.get('location') ?? '';
  if (!location.startsWith(APEX)) {
    failures.push(`www: redirects to "${location}", expected the apex`);
  }
});

await check('app host stays out of the index', async () => {
  for (const path of ['/', '/home']) {
    const res = await fetchHead(APP + path, { redirect: 'follow' });
    const robots = res.headers.get('x-robots-tag') ?? '';
    if (!/noindex/i.test(robots)) {
      failures.push(
        `app${path}: X-Robots-Tag is "${robots || '(absent)'}" — the app is indexable (launch-checklist row 4)`,
      );
    }
  }
  const res = await fetchHead(`${APP}/robots.txt`, { redirect: 'follow' });
  const body = res.status === 200 ? await res.text() : '';
  if (!/^\s*Disallow:\s*\/\s*$/m.test(body)) {
    failures.push('app robots.txt: no blanket "Disallow: /" — this is the SPA shell, not a real robots.txt');
  }
});

await check('answer engines are not challenged', async () => {
  for (const [name, ua] of Object.entries(CRAWLERS)) {
    const res = await fetchHead(PUBLISHED_PAGE, { ua, redirect: 'follow' });
    if (res.status !== 200) {
      failures.push(
        `${name}: got ${res.status} on a published page — a bot filter is blocking an answer engine (launch-checklist row 5)`,
      );
    }
  }
});

await check('certificates are not running down', async () => {
  for (const host of ['waypointchild.com', 'app.waypointchild.com']) {
    const days = await certDaysLeft(host);
    if (days === null) {
      failures.push(`${host}: could not read the TLS certificate`);
    } else if (days < CERT_FAIL_DAYS) {
      failures.push(`${host}: TLS certificate expires in ${days} day(s)`);
    } else if (days < CERT_WARN_DAYS) {
      warnings.push(`${host}: TLS certificate expires in ${days} day(s)`);
    } else {
      notes.push(`${host}: certificate valid for ${days} more day(s)`);
    }
  }
});

// ---------------------------------------------------------------------------

for (const n of notes) console.log(`ok: ${n}`);
for (const w of warnings) console.warn(`WARN: ${w}`);
if (failures.length) {
  for (const f of failures) console.error(`ERROR: ${f}`);
  console.error(`FAIL: live-site monitor — ${failures.length} problem(s).`);
  process.exit(1);
}
console.log(
  `PASS: live-site monitor — apex and a published page serve 200, robots and sitemap intact, www redirects, the app stays noindexed, four answer engines get 200, certificates healthy${warnings.length ? ` (${warnings.length} warning)` : ''}.`,
);
