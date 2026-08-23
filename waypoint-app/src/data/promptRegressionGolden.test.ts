/**
 * Integrity guard for the prompt-regression golden set (PRD W-F: F4). The
 * live suite (scripts/prompt-regression.mjs) costs API tokens and runs on a
 * schedule; THIS test runs in every CI pass and keeps the golden data
 * itself from rotting — ids unique, expectations well-formed, categories
 * and tones within the classifier's actual vocabulary.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const golden: Array<{
  id: string;
  question: string;
  expectedCategory: string;
  expectedTone: string;
  expectedBehavior: string;
}> = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'qa', 'promptRegression.golden.json'), 'utf8')
);

const CATEGORIES = new Set([
  'regional-center', 'iep', 'benefits', 'insurance', 'rights', 'navigation', 'transitions',
]);
const TONES = new Set(['collaborative', 'assertive', 'adversarial']);

describe('prompt-regression golden set', () => {
  it('carries the full ported QA suite', () => {
    expect(golden.length).toBeGreaterThanOrEqual(78);
  });

  it('ids are unique and every case is complete', () => {
    const ids = golden.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of golden) {
      expect(c.question.length, c.id).toBeGreaterThan(10);
      expect(CATEGORIES.has(c.expectedCategory), `${c.id}: ${c.expectedCategory}`).toBe(true);
      expect(TONES.has(c.expectedTone), `${c.id}: ${c.expectedTone}`).toBe(true);
    }
  });

  it('every expected category maps onto a classifier source id', () => {
    // The runner translates hyphen→underscore; this pins that contract.
    const sourceIds = new Set([
      'regional_center', 'iep', 'benefits', 'insurance', 'rights', 'navigation', 'transitions',
    ]);
    for (const c of golden) {
      expect(sourceIds.has(c.expectedCategory.replace(/-/g, '_')), c.expectedCategory).toBe(true);
    }
  });
});
