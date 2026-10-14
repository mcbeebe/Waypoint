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
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '..', 'dist');

/** Required top-level fields per @type we emit. */
const REQUIRED = {
  // url is optional on a Regional Center Organization (only when the content
  // carries an official URL); the site's own Organization is checked below.
  Organization: ['name'],
  WebApplication: ['name', 'url', 'description', 'applicationCategory', 'offers', 'publisher'],
  AdministrativeArea: ['name'],
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

/**
 * BreadcrumbList-specific rule: "item" (a URL) is required on every
 * ListItem except the one at the highest position — that one stands for
 * the current page and may omit it (Google's own example does). A middle
 * item missing "item" is exactly the GSC "Missing field item" class that
 * shipped silently on /letters/iep-evaluation-request/ (2026-09-08): the
 * REQUIRED table above can't express a conditional field, so it's checked
 * here instead.
 */
function checkBreadcrumbItems(node, file, errors) {
  const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
  const positions = items
    .map((it) => (it && typeof it === 'object' ? it.position : undefined))
    .filter((p) => typeof p === 'number');
  const maxPosition = positions.length ? Math.max(...positions) : undefined;
  for (const it of items) {
    if (!it || typeof it !== 'object') continue;
    const isLast = it.position === maxPosition;
    const v = it.item;
    const missing = v === undefined || v === null || v === '';
    if (missing && !isLast) {
      errors.push(
        `${file}: BreadcrumbList ListItem at position ${it.position} is missing required field ` +
          `"item" (only the last item in a breadcrumb trail may omit it)`,
      );
    }
  }
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
    if (type === 'Organization' && node.name === 'Waypoint' && !node.url) {
      errors.push(`${file}: Organization "Waypoint" is missing required field "url"`);
    }
    if (type === 'BreadcrumbList') checkBreadcrumbItems(node, file, errors);
  }
  for (const value of Object.values(node)) checkNode(value, file, errors, seen);
}

/** Flatten a page's ld+json blocks into a list of top-level nodes. */
function pageNodes(file) {
  const html = readFileSync(file, 'utf8');
  const nodes = [];
  for (const [, raw] of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(raw);
      nodes.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      /* reported by the main pass */
    }
  }
  return nodes;
}

/** Tool pages: every one is a free, ungated WebApplication. */
const TOOL_PAGES = ['iep-goal-check', 'regional-center-finder', 'ssi-deeming-calculator'];

function checkToolPage(slug, errors) {
  const file = path.join(DIST, 'tools', slug, 'index.html');
  const rel = path.relative(process.cwd(), file);
  if (!existsSync(file)) {
    errors.push(`${rel}: tool page missing from the build`);
    return;
  }
  const app = pageNodes(file).find((n) => n['@type'] === 'WebApplication');
  if (!app) {
    errors.push(`${rel}: no WebApplication JSON-LD`);
    return;
  }
  const html = readFileSync(file, 'utf8');
  const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const decode = (t) => t.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  if (app.url !== `https://waypointchild.com/tools/${slug}/`) errors.push(`${rel}: WebApplication url is ${app.url}`);
  if (metaDesc !== undefined && decode(metaDesc) !== app.description) {
    errors.push(`${rel}: WebApplication description does not match the page's meta description`);
  }
  if (app.operatingSystem !== 'Any') errors.push(`${rel}: WebApplication operatingSystem must be "Any"`);
  if (app.isAccessibleForFree !== true) errors.push(`${rel}: WebApplication isAccessibleForFree must be true`);
  if (app.offers?.price !== '0' || app.offers?.priceCurrency !== 'USD') {
    errors.push(`${rel}: WebApplication offers must be price "0" USD`);
  }
  if (app.publisher?.name !== 'Waypoint') errors.push(`${rel}: WebApplication publisher must be the Waypoint Organization`);
  if ('aggregateRating' in app || 'review' in app) errors.push(`${rel}: WebApplication must not carry ratings or reviews`);
}

/** Regional Center pages: Article.about is the center, with a non-empty areaServed. */
function checkRegionalCenterPages(errors) {
  const dir = path.join(DIST, 'regional-centers');
  if (!existsSync(dir)) return;
  let checked = 0;
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name, 'index.html');
    if (!existsSync(file)) continue;
    const rel = path.relative(process.cwd(), file);
    const article = pageNodes(file).find((n) => n['@type'] === 'Article');
    if (!article) continue; // draft pages (drafts build) carry no Article by design
    checked += 1;
    const org = article.about;
    if (!org || org['@type'] !== 'Organization') {
      errors.push(`${rel}: Article.about must be an Organization (the Regional Center)`);
      continue;
    }
    if (!org.name) errors.push(`${rel}: Regional Center Organization has no name`);
    const areas = Array.isArray(org.areaServed) ? org.areaServed : [];
    if (areas.length === 0) errors.push(`${rel}: Regional Center Organization has empty areaServed`);
    for (const a of areas) {
      if (a?.['@type'] !== 'AdministrativeArea' || !/ County, California$/.test(a?.name ?? '')) {
        errors.push(`${rel}: areaServed entry is not an AdministrativeArea named "<County> County, California"`);
      }
    }
  }
  return checked;
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

for (const slug of TOOL_PAGES) checkToolPage(slug, errors);
const toolsIndex = pageNodes(path.join(DIST, 'tools', 'index.html')).find((n) => n['@type'] === 'ItemList');
if (!toolsIndex || !Array.isArray(toolsIndex.itemListElement) || toolsIndex.itemListElement.length === 0) {
  errors.push('dist/tools/index.html: no ItemList JSON-LD listing the tools');
}
const rcChecked = checkRegionalCenterPages(errors) ?? 0;
if (rcChecked === 0) errors.push('dist/regional-centers: no published Regional Center page with Article JSON-LD to validate');

if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`FAIL: ${errors.length} JSON-LD problem(s) (launch-checklist row 7).`);
  process.exit(1);
}

console.log(
  `PASS: JSON-LD — ${blocks} block(s) across ${files} page(s); types: ${[...seen].sort().join(', ') || 'none'}.`,
);
