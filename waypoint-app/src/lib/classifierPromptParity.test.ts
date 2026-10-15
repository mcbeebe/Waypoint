/**
 * The intent-classifier prompt lives in two places: `classifyIntent` in
 * `src/lib/ai.ts` (what the app sends) and `classificationPrompt` in
 * `scripts/prompt-regression.mjs` (what the golden-set suite scores). They were
 * held together by a "must mirror" comment; this makes drift a failing test, so
 * the regression suite cannot silently grade a stale prompt.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
/** The literal `${query}` both templates interpolate (built to keep lint quiet). */
const PLACEHOLDER = '$' + '{query}';

/** Pulls the template literal that opens "You are a classifier" out of a file. */
function extractPrompt(relPath: string, placeholder: string): string {
  const src = readFileSync(join(ROOT, relPath), 'utf8');
  const start = src.indexOf('`You are a classifier');
  if (start === -1) throw new Error(`classifier prompt not found in ${relPath}`);
  const end = src.indexOf('`', start + 1);
  return src.slice(start + 1, end).replace(placeholder, '<QUERY>');
}

describe('classifier prompt parity', () => {
  const app = extractPrompt('src/lib/ai.ts', PLACEHOLDER);
  const suite = extractPrompt('scripts/prompt-regression.mjs', PLACEHOLDER);

  it('finds a real prompt in both files', () => {
    expect(app).toContain('<QUERY>');
    expect(suite).toContain('<QUERY>');
    expect(app.length).toBeGreaterThan(500);
  });

  it('prompt-regression.mjs tests exactly the prompt the app sends', () => {
    expect(suite).toBe(app);
  });
});
