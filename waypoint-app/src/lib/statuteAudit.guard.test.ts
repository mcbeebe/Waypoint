/**
 * The statute-audit ratchet (Build-Plan-Items1-4 phase A1b).
 *
 * `statuteAudit.ts` can find a statute asserted in prose that the provenance
 * registry does not cover. This is the thing that RUNS it — without a consumer
 * the module is a report nobody reads, which is precisely how
 * `sourceForCitation()` sat unused in this repo for months.
 *
 * It is a ratchet, not a gate. The 23 gaps below are real debt, each one an
 * authority a family reads in prose with nothing behind it. Registering them
 * is phase A2 and needs a human: `verifiedOn` means "the date a human
 * confirmed the source says what we say it says," and no agent can honestly
 * stamp that. So the existing debt is enumerated here in the open, and the
 * test fails the moment a NEW one appears.
 *
 * When you fix one, delete its line. The list only ever shrinks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditAll, summarise } from './statuteAudit';

/**
 * Statutes asserted in `src/` prose with no registry entry, as of Sep 13 2026.
 *
 * · `CODE:section`   — an authority the registry has never covered.
 * · `UNKNOWN:…`      — a bare `§` with no code named on its line. Usually a
 *                      one-word prose fix ("§4731" → "W&I §4731") rather than
 *                      a new registry entry.
 *
 * DO NOT add to this list to make a build pass. A new entry here means a new
 * uncited legal claim shipped to a parent.
 */
const KNOWN_GAPS: readonly string[] = [
  // ── Unregistered authorities — need a registry entry (phase A2) ──────────
  'CFR34:300.301', // IDEA initial evaluation timeline — adaptiveEngine.ts
  'CFR34:300.502', // IEE at public expense — adaptiveEngine.ts
  'EDC:56302.1', // child find / referral — adaptiveEngine.ts
  'EDC:56341.1', // IEP team duties — agencies.ts, planGenerator.ts
  'HSC:1374.73', // autism behavioral health treatment mandate — agencies.ts, planGenerator.ts
  'INS:10144.51', // the Insurance Code twin of H&S §1374.73 — agencies.ts
  'USC42:1396d(r)', // EPSDT — agencies.ts
  'WIC:4500', // Lanterman Act, opening section — agencies.ts
  'WIC:4502', // rights of persons with developmental disabilities — agencies.ts
  'WIC:4620', // Regional Center responsibilities — agencies.ts
  'WIC:4642', // intake assessment within 120 days — agencies.ts, adaptiveEngine.ts
  'WIC:95014', // Early Start eligibility — planGenerator.ts

  // ── Subsections the registry never verified (it checked a sibling) ───────
  'EDC:56329', // registry covers §56329(b); prose cites the parent — planGenerator.ts
  'WIC:4648', // registry covers §4648(a); prose cites the parent — 3 files

  // ── Unattributed: a § with no code named on its line ─────────────────────
  'UNKNOWN:504', // Section 504 of the Rehabilitation Act — planGenerator.ts
  'UNKNOWN:4642', // actionEmail.ts, planGenerator.ts
  'UNKNOWN:4643', // processMap.ts
  'UNKNOWN:4646', // agencies.ts
  'UNKNOWN:4710', // learnLibrary.ts
  'UNKNOWN:4710.5', // agencies.ts, learnLibrary.ts, +1
  'UNKNOWN:4731', // agencies.ts, escalationLadder.ts, +3
  'UNKNOWN:56321', // iepDeadlines.ts
  'UNKNOWN:56344', // iepDeadlines.ts, planGenerator.ts
];

/** Source files to scan — everything under `src/` that ships, minus tests. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function currentGaps(): string[] {
  const blocks = sourceFiles(SRC)
    // The registry is the answer key, and the audit would find its own
    // examples in its own doc comment.
    .filter((p) => !p.endsWith('contentSources.ts') && !p.endsWith('statuteAudit.ts'))
    .map((path) => ({ where: path.replace(`${SRC}/`, ''), text: readFileSync(path, 'utf8') }));
  return summarise(auditAll(blocks)).map((row) => row.id);
}

describe('statute audit ratchet', () => {
  it('no NEW statute is asserted in prose without a registry entry', () => {
    const unexpected = currentGaps().filter((id) => !KNOWN_GAPS.includes(id));
    // A failure here means a legal claim shipped with nothing behind it.
    // Register the authority in contentSources.ts, or name the code in the
    // prose. Adding it to KNOWN_GAPS is not a fix.
    expect(unexpected).toEqual([]);
  });

  it('KNOWN_GAPS has no stale entries — fixed debt is deleted, not left behind', () => {
    const current = currentGaps();
    const fixed = KNOWN_GAPS.filter((id) => !current.includes(id));
    // A failure here is good news: that gap is closed. Delete its line.
    expect(fixed).toEqual([]);
  });

  it('the debt is visible as a number, so it can be watched going down', () => {
    expect(currentGaps()).toHaveLength(KNOWN_GAPS.length);
  });
});
