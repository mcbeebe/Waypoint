#!/usr/bin/env node
/**
 * CLAUDE.md accuracy guard.
 *
 * CLAUDE.md is the first file every session reads, and its numbers are load
 * bearing: a session that believes there are 59 migrations builds against
 * migration 60 as if it were unapplied. The file says of itself that it "had
 * drifted five months out of date before 2026-08-29 — naming two directories
 * that no longer existed, and twice telling sessions to delete a nested `.git`
 * that was removed in March." Re-stating the rule did not stop the drift: by
 * 2026-09-15 the migration count was 2 low, the screen count 1 low, and the
 * test suite had grown from 111 files to 131 without the file noticing.
 *
 * So the rule is mechanized. Every number checked here is derived from the
 * tree, never from a previous reading of the doc, and a mismatch names the
 * exact replacement so the fix is a one-line edit.
 *
 * Deliberately NOT checked: the total assertion count. It moves with every
 * added `it()`, and a guard that fails on honest test-writing teaches people
 * to distrust guards. The file counts carry the operational meaning — they
 * are what explains the four-project layout and the doubled tz runs.
 *
 *   node scripts/check-claude-md.mjs
 *
 * Runs from waypoint-app/ (CI's `check` job), reading ../CLAUDE.md.
 *
 * CLAUDE.md itself is deliberately NOT in ci.yml's `paths`, so a docs-only PR
 * does not pay for the full app suite. The drift this exists to catch is
 * caused by code growth — a new migration, a new screen, a new test file —
 * and every one of those PRs runs this.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = path.resolve(APP, '..', 'CLAUDE.md');

/** Entries directly inside `dir` that pass `keep`, given (name, fullPath). */
function count(dir, keep) {
  const base = path.resolve(APP, dir);
  try {
    return readdirSync(base).filter((f) => keep(f, path.join(base, f))).length;
  } catch {
    return -1; // a missing directory is itself a drift; reported below as a mismatch
  }
}

/** True for a real subdirectory — not a name that merely lacks a dot. */
const isDir = (_name, full) => statSync(full).isDirectory();

/** Test files anywhere under src/, by suffix. */
function testFiles(suffix, exclude) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = path.join(dir, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (e.endsWith(suffix) && !(exclude && e.endsWith(exclude))) out.push(p);
    }
  };
  walk(path.resolve(APP, 'src'));
  return out.length;
}

const migrations = count('supabase/migrations', (f) => f.endsWith('.sql'));
// Every deployed function is a directory; `_shared` is a helper, not a
// function, and deploy-edge-functions.yml does not ship it.
const edgeFunctions = count(
  'supabase/functions',
  (f, full) => f !== '_shared' && !f.startsWith('.') && isDir(f, full)
);
const mainScreens = count(
  'src/screens/main',
  (f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx')
);
const logicTests = testFiles('.test.ts', '.tz.test.ts');
const uiTests = testFiles('.test.tsx');
const tzTests = testFiles('.tz.test.ts');
const totalTestFiles = logicTests + uiTests + tzTests;
// tz files execute once per timezone project, so they count twice toward runs.
const testRuns = totalTestFiles + tzTests;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty'];

/**
 * Each claim pairs a regex whose FIRST capture group is the number CLAUDE.md
 * states with the value the tree actually has. `word: true` means the doc
 * spells it out ("eight Edge Functions").
 */
const claims = [
  { what: 'migrations (directory map)', re: /# (\d+) sequential SQL files/, actual: migrations },
  { what: 'migrations (current state)', re: /flagship product\. (\d+) migrations/, actual: migrations },
  { what: 'Edge Functions (directory map)', re: /# (\d+) Edge Functions:/, actual: edgeFunctions },
  { what: 'Edge Functions (current state)', re: /migrations, (\w+)\n  Edge Functions in production/, actual: edgeFunctions, word: true },
  { what: 'screens under main/', re: /(\d+) screens under `main\/`/, actual: mainScreens },
  { what: 'test files (current state)', re: /a (\d+)-file \/ [\d,]+-test vitest suite/, actual: totalTestFiles },
  { what: 'test files (npm test comment)', re: /FOUR projects, (\d+) files/, actual: totalTestFiles },
  { what: 'test runs (npm test comment)', re: /files \((\d+) runs\)/, actual: testRuns },
  { what: '.tz.test.ts files', re: /the (\w+) `\.tz\.test\.ts` files execute twice/, actual: tzTests, word: true },
];

let doc;
try {
  doc = readFileSync(DOC, 'utf8');
} catch {
  console.error(`✗ cannot read ${DOC}`);
  process.exit(1);
}

const wrong = [];
const unmatched = [];
for (const c of claims) {
  const m = c.re.exec(doc);
  if (!m) {
    // The doc was reworded out from under this guard. Failing loudly beats
    // silently checking nothing — a guard that stops matching is a guard that
    // stops guarding, which is how the site's orphan ratchet once reported
    // "0 chips (down from 24)" against an empty build.
    unmatched.push(c.what);
    continue;
  }
  const stated = c.word ? WORDS.indexOf(m[1].toLowerCase()) : Number(m[1]);
  if (stated !== c.actual) {
    const want = c.word ? (WORDS[c.actual] ?? String(c.actual)) : String(c.actual);
    wrong.push({ ...c, stated: m[1], want, line: doc.slice(0, m.index).split('\n').length });
  }
}

if (unmatched.length > 0) {
  console.error(`✗ CLAUDE.md no longer contains ${unmatched.length} phrase(s) this guard checks:`);
  for (const u of unmatched) console.error(`    ${u}`);
  console.error(
    `  Either restore the wording or update the matching regex in\n` +
      `  scripts/check-claude-md.mjs — do not leave it silently matching nothing.`
  );
  process.exit(1);
}

if (wrong.length > 0) {
  console.error(`✗ CLAUDE.md states ${wrong.length} number(s) the tree disagrees with:`);
  for (const w of wrong) {
    console.error(`    CLAUDE.md:${w.line}  ${w.what}: says "${w.stated}", actual is "${w.want}"`);
  }
  console.error(
    `\n  CLAUDE.md is the first file every session reads; a wrong count here\n` +
      `  misleads every future session. Update it in THIS PR.`
  );
  process.exit(1);
}

console.log(
  `✓ CLAUDE.md matches the tree — ${migrations} migrations, ${edgeFunctions} Edge Functions, ` +
    `${mainScreens} main/ screens, ${totalTestFiles} test files (${testRuns} runs)`
);
