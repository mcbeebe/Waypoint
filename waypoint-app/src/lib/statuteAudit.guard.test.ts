/**
 * The statute-audit ratchet (Build-Plan-Items1-4 phase A1b).
 *
 * `statuteAudit.ts` can find a statute asserted in prose that the provenance
 * registry does not cover. This is the thing that RUNS it — without a consumer
 * the module is a report nobody reads, which is precisely how
 * `sourceForCitation()` sat unused in this repo for months.
 *
 * It began as a ratchet over 23 known gaps. Phase A2 closed all of them on
 * 2026-09-15 — twelve authorities registered, two parent sections folded into
 * the entries that already covered their subsections, "Section 504" registered
 * as a named authority, and nine bare `§` references given their code in the
 * prose. `KNOWN_GAPS` is now empty, so this is a plain gate: the build fails on
 * the first statute asserted to a family with nothing behind it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditAll, summarise } from './statuteAudit';

/**
 * Statutes asserted in `src/` prose with no registry entry. Empty since
 * 2026-09-15 and intended to stay that way.
 *
 * If a build fails on a new id, fix the cause, not this list:
 * · `CODE:section` — register the authority in `contentSources.ts`.
 * · `UNKNOWN:…`    — a bare `§` with no code on its line; name the code in the
 *                    prose ("§4731" → "W&I §4731") so a parent can look it up.
 */
const KNOWN_GAPS: readonly string[] = [
  // Empty, and it must stay that way. The 23 gaps this list once held were
  // registered or attributed on 2026-09-15 (phase A2). A new entry here means
  // a new uncited legal claim shipped to a parent — register the authority in
  // contentSources.ts, or name the code in the prose. Adding a line is not a fix.
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
