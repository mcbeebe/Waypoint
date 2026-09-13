#!/usr/bin/env node
/**
 * refresh-due.mjs — report which content pages are due for a refresh.
 *
 * Reads content-ops/refresh-calendar.yaml (the named refresh events) and
 * scans src/content ** / *.mdx frontmatter (nextReviewEvent, dateModified,
 * verifiedAsOf per the D2 schema in src/content.config.ts), then prints:
 *
 *   1. Pages DUE or OVERDUE per calendar event — a page is due when its
 *      event's most recent anchor date has passed since the page's
 *      dateModified; overdue when more than GRACE_DAYS have passed since
 *      that trigger without an update.
 *   2. Pages tagged nextReviewEvent: annual that are older than 365 days.
 *   3. Regional-center pages whose verifiedAsOf is older than 120 days
 *      (the schema's contact-data freshness window).
 *
 * This is a REPORTING tool: it always exits 0. Wire it into CI as
 * informational output, never as a gate.
 *
 * Usage: node scripts/refresh-due.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';
import matter from 'gray-matter';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CALENDAR_PATH = path.join(SITE_ROOT, 'content-ops', 'refresh-calendar.yaml');
const CONTENT_DIR = path.join(SITE_ROOT, 'src', 'content');
const RC_DIR = path.join(CONTENT_DIR, 'regional-centers');

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days past an event trigger before "due" escalates to "OVERDUE". */
const GRACE_DAYS = 30;
/** Pages tagged nextReviewEvent: annual are due after this many days. */
const ANNUAL_DAYS = 365;
/** Regional-center verifiedAsOf freshness window (matches schema comment). */
const RC_STALE_DAYS = 120;

/** Today at UTC midnight, so day math is stable regardless of local tz. */
const now = new Date();
const TODAY = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/** Coerce a frontmatter value (Date from js-yaml, or string) to a Date, else null. */
function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && value.trim() !== '') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function fmtDate(d) {
  return d ? d.toISOString().slice(0, 10) : '—';
}

function daysAgo(d) {
  return Math.floor((TODAY.getTime() - d.getTime()) / DAY_MS);
}

/** Most recent occurrence of an {month, day} anchor on or before today (UTC). */
function lastTrigger(anchor) {
  if (!anchor || !anchor.month || !anchor.day) return null;
  let d = new Date(Date.UTC(TODAY.getUTCFullYear(), anchor.month - 1, anchor.day));
  if (d.getTime() > TODAY.getTime()) {
    d = new Date(Date.UTC(TODAY.getUTCFullYear() - 1, anchor.month - 1, anchor.day));
  }
  return d;
}

/** Recursively collect .mdx files under a directory (empty list if absent). */
function walkMdx(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

function printTable(title, headers, rows) {
  console.log(`\n${title}`);
  if (rows.length === 0) {
    console.log('  (none)');
    return;
  }
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length)),
  );
  const line = (cells) => '  ' + cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  console.log(line(headers));
  console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of rows) console.log(line(row));
}

function main() {
  // --- Load calendar -------------------------------------------------------
  let events = [];
  if (fs.existsSync(CALENDAR_PATH)) {
    const calendar = loadYaml(fs.readFileSync(CALENDAR_PATH, 'utf8'));
    events = Array.isArray(calendar?.events) ? calendar.events : [];
  } else {
    console.warn(`warning: calendar not found at ${path.relative(SITE_ROOT, CALENDAR_PATH)}`);
  }
  const eventById = new Map(events.map((e) => [e.id, e]));

  // --- Load pages ----------------------------------------------------------
  const files = walkMdx(CONTENT_DIR);
  const pages = [];
  for (const file of files) {
    try {
      const { data } = matter(fs.readFileSync(file, 'utf8'));
      pages.push({ rel: path.relative(SITE_ROOT, file), fm: data });
    } catch (err) {
      console.warn(`warning: could not parse frontmatter in ${path.relative(SITE_ROOT, file)}: ${err.message}`);
    }
  }
  if (pages.length === 0) {
    console.log(`No .mdx content found under ${path.relative(SITE_ROOT, CONTENT_DIR)} — nothing to report.`);
    return;
  }

  console.log(`Refresh report — ${fmtDate(TODAY)} — ${pages.length} page(s) scanned, ${events.length} calendar event(s)`);

  // --- 1. Event-driven refreshes ------------------------------------------
  const eventRows = [];
  for (const page of pages) {
    const tag = page.fm.nextReviewEvent ?? 'annual'; // schema default
    if (tag === 'none') continue;
    const modified = toDate(page.fm.dateModified);

    if (tag === 'annual') {
      if (!modified) {
        eventRows.push(['annual', 'DUE', page.rel, '—', 'missing dateModified']);
      } else if (daysAgo(modified) > ANNUAL_DAYS + GRACE_DAYS) {
        eventRows.push(['annual', 'OVERDUE', page.rel, fmtDate(modified), `${daysAgo(modified)}d old`]);
      } else if (daysAgo(modified) > ANNUAL_DAYS) {
        eventRows.push(['annual', 'DUE', page.rel, fmtDate(modified), `${daysAgo(modified)}d old`]);
      }
      continue;
    }

    const event = eventById.get(tag);
    if (!event) {
      eventRows.push([String(tag), 'UNKNOWN', page.rel, fmtDate(modified), 'event not in refresh-calendar.yaml']);
      continue;
    }
    const trigger = lastTrigger(event.anchor);
    if (!trigger) {
      eventRows.push([event.id, 'NO-ANCHOR', page.rel, fmtDate(modified), 'event has no machine anchor']);
      continue;
    }
    if (!modified) {
      eventRows.push([event.id, 'DUE', page.rel, '—', 'missing dateModified']);
      continue;
    }
    if (modified.getTime() < trigger.getTime()) {
      const late = daysAgo(trigger);
      const status = late > GRACE_DAYS ? 'OVERDUE' : 'DUE';
      eventRows.push([event.id, status, page.rel, fmtDate(modified), `event fired ${fmtDate(trigger)} (${late}d ago)`]);
    }
  }
  // OVERDUE first, then DUE, then anomalies; stable by file within groups.
  const rank = { OVERDUE: 0, DUE: 1, UNKNOWN: 2, 'NO-ANCHOR': 3 };
  eventRows.sort((a, b) => (rank[a[1]] ?? 9) - (rank[b[1]] ?? 9) || a[2].localeCompare(b[2]));
  printTable(
    'Pages due or overdue per refresh event',
    ['event', 'status', 'page', 'dateModified', 'detail'],
    eventRows,
  );

  // --- 2. Regional-center contact-data staleness ---------------------------
  const rcRows = [];
  for (const page of pages) {
    if (!page.rel.startsWith(path.relative(SITE_ROOT, RC_DIR) + path.sep)) continue;
    const verified = toDate(page.fm.verifiedAsOf);
    if (!verified) {
      rcRows.push([page.rel, '—', 'missing verifiedAsOf']);
    } else if (daysAgo(verified) > RC_STALE_DAYS) {
      rcRows.push([page.rel, fmtDate(verified), `${daysAgo(verified)}d old (window: ${RC_STALE_DAYS}d)`]);
    }
  }
  rcRows.sort((a, b) => a[0].localeCompare(b[0]));
  printTable(
    `Regional-center pages with verifiedAsOf older than ${RC_STALE_DAYS} days`,
    ['page', 'verifiedAsOf', 'detail'],
    rcRows,
  );

  // --- Summary -------------------------------------------------------------
  const overdue = eventRows.filter((r) => r[1] === 'OVERDUE').length;
  const due = eventRows.filter((r) => r[1] === 'DUE').length;
  console.log(`\nSummary: ${overdue} overdue, ${due} due, ${rcRows.length} stale regional-center page(s).`);
}

try {
  main();
} catch (err) {
  console.error(`refresh-due: ${err.message}`);
}
process.exitCode = 0; // reporting tool — never fail the pipeline
