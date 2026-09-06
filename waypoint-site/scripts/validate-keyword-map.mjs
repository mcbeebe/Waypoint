#!/usr/bin/env node
/**
 * Validates content-ops/keyword-map.yaml (the maintained keyword-to-URL map).
 *
 * Checks:
 *   - file parses and has a non-empty `entries` list
 *   - every entry carries all required fields
 *   - primary_kw is unique across the file (case-insensitive)
 *   - url is unique across the file and starts with "/"
 *   - pillar / priority / intent / status values come from their enums
 *     (pillar enum mirrors PILLARS in src/content.config.ts)
 *   - secondary_kws is an array of strings; piece_no is an integer or null
 *
 * Usage:
 *   node scripts/validate-keyword-map.mjs [path/to/keyword-map.yaml]
 *
 * Exits 1 with one line per problem on failure; prints a one-line summary on pass.
 * Only dependency: js-yaml.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as yamlLoad, YAMLException } from 'js-yaml';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MAP = path.resolve(HERE, '..', 'content-ops', 'keyword-map.yaml');
const mapPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_MAP;
const relPath = path.relative(process.cwd(), mapPath) || mapPath;

// Keep the pillar list in sync with PILLARS in src/content.config.ts.
const PILLARS = ['regional-centers', 'iep', 'benefits', 'insurance', 'first-steps', 'start'];
const PRIORITIES = ['P0', 'P1', 'P2'];
const INTENTS = ['info', 'tool', 'letter', 'local', 'comparison'];
const STATUSES = ['planned', 'drafting', 'published'];

// piece_no and serp_notes must be PRESENT but may be null / empty string.
const REQUIRED_KEYS = [
  'primary_kw',
  'secondary_kws',
  'intent',
  'url',
  'pillar',
  'priority',
  'status',
  'piece_no',
  'serp_notes',
];

const errors = [];

let raw;
try {
  raw = readFileSync(mapPath, 'utf8');
} catch (err) {
  console.error(`ERROR: cannot read ${relPath}: ${err.message}`);
  process.exit(1);
}

let doc;
try {
  doc = yamlLoad(raw);
} catch (err) {
  const kind = err instanceof YAMLException ? 'is not valid YAML' : 'could not be parsed';
  console.error(`ERROR: ${relPath} ${kind}: ${err.message}`);
  process.exit(1);
}

if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
  console.error(`ERROR: ${relPath} must be a mapping with a top-level 'entries' list.`);
  process.exit(1);
}
if (!Array.isArray(doc.entries)) {
  console.error(`ERROR: ${relPath} is missing the top-level 'entries' list.`);
  process.exit(1);
}
if (doc.entries.length === 0) {
  console.error(`ERROR: ${relPath} has an empty 'entries' list.`);
  process.exit(1);
}

/** Human-readable handle for an entry in error messages. */
const label = (entry, i) => {
  const kw = entry && typeof entry.primary_kw === 'string' && entry.primary_kw.trim()
    ? ` ("${entry.primary_kw.trim()}")`
    : '';
  return `entries[${i}]${kw}`;
};

const seenPrimaryKw = new Map(); // normalized kw -> first index
const seenUrl = new Map(); //       url            -> first index

doc.entries.forEach((entry, i) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`entries[${i}]: not a mapping (expected an object with the required fields).`);
    return;
  }

  // Presence of every required key.
  for (const key of REQUIRED_KEYS) {
    if (!(key in entry)) {
      errors.push(`${label(entry, i)}: missing required field '${key}'.`);
    }
  }

  // primary_kw: non-empty string, unique (case-insensitive).
  if ('primary_kw' in entry) {
    if (typeof entry.primary_kw !== 'string' || !entry.primary_kw.trim()) {
      errors.push(`${label(entry, i)}: 'primary_kw' must be a non-empty string.`);
    } else {
      const norm = entry.primary_kw.trim().toLowerCase();
      if (seenPrimaryKw.has(norm)) {
        errors.push(
          `${label(entry, i)}: duplicate primary_kw "${entry.primary_kw.trim()}" (first used at entries[${seenPrimaryKw.get(norm)}]).`
        );
      } else {
        seenPrimaryKw.set(norm, i);
      }
    }
  }

  // secondary_kws: array of non-empty strings (may be empty).
  if ('secondary_kws' in entry) {
    if (!Array.isArray(entry.secondary_kws)) {
      errors.push(`${label(entry, i)}: 'secondary_kws' must be a list.`);
    } else {
      entry.secondary_kws.forEach((kw, j) => {
        if (typeof kw !== 'string' || !kw.trim()) {
          errors.push(`${label(entry, i)}: secondary_kws[${j}] must be a non-empty string.`);
        }
      });
    }
  }

  // url: non-empty string, starts with '/', unique.
  if ('url' in entry) {
    if (typeof entry.url !== 'string' || !entry.url.trim()) {
      errors.push(`${label(entry, i)}: 'url' must be a non-empty string.`);
    } else {
      const url = entry.url.trim();
      if (!url.startsWith('/')) {
        errors.push(`${label(entry, i)}: url "${url}" must start with '/'.`);
      }
      if (seenUrl.has(url)) {
        errors.push(
          `${label(entry, i)}: duplicate url "${url}" (first used at entries[${seenUrl.get(url)}]).`
        );
      } else {
        seenUrl.set(url, i);
      }
    }
  }

  // Enums.
  if ('intent' in entry && !INTENTS.includes(entry.intent)) {
    errors.push(
      `${label(entry, i)}: invalid intent '${entry.intent}' (expected one of: ${INTENTS.join(', ')}).`
    );
  }
  if ('pillar' in entry && !PILLARS.includes(entry.pillar)) {
    errors.push(
      `${label(entry, i)}: invalid pillar '${entry.pillar}' (expected one of: ${PILLARS.join(', ')}).`
    );
  }
  if ('priority' in entry && !PRIORITIES.includes(entry.priority)) {
    errors.push(
      `${label(entry, i)}: invalid priority '${entry.priority}' (expected one of: ${PRIORITIES.join(', ')}).`
    );
  }
  if ('status' in entry && !STATUSES.includes(entry.status)) {
    errors.push(
      `${label(entry, i)}: invalid status '${entry.status}' (expected one of: ${STATUSES.join(', ')}).`
    );
  }

  // piece_no: integer or null.
  if ('piece_no' in entry && entry.piece_no !== null && !Number.isInteger(entry.piece_no)) {
    errors.push(`${label(entry, i)}: 'piece_no' must be an integer or null.`);
  }

  // serp_notes: string (empty allowed).
  if ('serp_notes' in entry && typeof entry.serp_notes !== 'string') {
    errors.push(`${label(entry, i)}: 'serp_notes' must be a string (use '' when empty).`);
  }
});

if (errors.length > 0) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  console.error(`FAIL: ${relPath} — ${errors.length} problem(s) found.`);
  process.exit(1);
}

const total = doc.entries.length;
const p0 = doc.entries.filter((e) => e.priority === 'P0').length;
const pieces = doc.entries.filter((e) => Number.isInteger(e.piece_no)).length;
console.log(
  `PASS: ${relPath} — ${total} entries valid (${p0} P0, ${pieces} tied to launch pieces; primary_kw and url unique, enums OK).`
);
