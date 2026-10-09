/**
 * Text that reaches a model on EVERY family's behalf must not name a real
 * family. Models copy examples: a name in a shared prompt or knowledge-base
 * article can turn up in another family's saved memories or letters. Two did
 * — an example sentence in the memory-extraction prompt, and two example
 * notes in the knowledge base — and both named a real child.
 *
 * Scanned: the sources this repo builds model input from — the Edge Functions
 * (no CI of their own), the knowledge base (the seed, and the Lite KB JSON the
 * ingest script loads), app content and the app copy that is handed to the
 * draft prompt as guidance or as the parent's ask, the classifier prompt and
 * the scripts that mirror or evaluate it, and the regression set.
 *
 * Only names ALREADY public in this repo's own test fixtures are listed here:
 * a guard must never be the thing that publishes a name. Other real names
 * stay out of the repo entirely (fixtures and mockups use invented names).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
// "teddy bear" is an ordinary word in a parenting knowledge base.
const REAL_NAMES = /\bteddy\b(?!\s+bears?\b)|\bbeebe\b/i;

function filesUnder(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesUnder(path, exts);
    return exts.some((e) => path.endsWith(e)) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

/** Named one by one, so a rename fails here instead of silently dropping out. */
const SINGLE_FILES = [
  'kb_seed.sql',
  '../Waypoint-Lite-KB-Articles-ENHANCED-AI-SCHEMA-Feb2026.json',
  'src/lib/ai.ts',
  'src/hooks/useDocumentAnalysis.ts',
  'src/lib/homeTriage.ts',
  'src/lib/draftQuestions.ts',
  'scripts/prompt-regression.mjs',
  'scripts/eval-navigator.mjs',
].map((p) => join(ROOT, p));

const PROMPT_SOURCES = [
  ...filesUnder(join(ROOT, 'supabase/functions'), ['.ts']),
  ...filesUnder(join(ROOT, 'supabase/seed'), ['.sql']),
  ...filesUnder(join(ROOT, 'src/data'), ['.ts', '.json']),
  ...filesUnder(join(ROOT, 'qa'), ['.json']),
  ...SINGLE_FILES,
];

describe('text every family’s AI runs on', () => {
  it('covers the Edge Functions and the knowledge base', () => {
    for (const must of ['ai-proxy/index.ts', 'seed/kb_seed.sql']) {
      expect(PROMPT_SOURCES.some((p) => p.endsWith(must)), must).toBe(true);
    }
  });

  for (const path of PROMPT_SOURCES) {
    it(`${path.slice(ROOT.length + 1)} names no real family`, () => {
      // readFileSync throws on a missing file — a renamed source fails loudly.
      const hits = readFileSync(path, 'utf8')
        .split('\n')
        .flatMap((text, i) => (REAL_NAMES.test(text) ? [i + 1] : []));
      expect(hits, `lines ${hits.join(', ')}`).toEqual([]);
    });
  }

  it('does not trip on an ordinary teddy bear', () => {
    expect(REAL_NAMES.test('Bring a favorite teddy bear to the assessment.')).toBe(false);
    expect(REAL_NAMES.test('Example: Teddy asked for a break.')).toBe(true);
  });
});
