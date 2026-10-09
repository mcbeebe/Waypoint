/**
 * The Navigator's chat model picks which letter template a "Draft this
 * letter" button opens, from the [[DRAFT: key | offer]] trailer the ai-proxy
 * prompt teaches it. On 2026-10-07 it routed a note to a provider through
 * ipp_review_request — a template that starts a 30-day Regional Center clock —
 * because the prompt listed the keys with no word on when each applies.
 *
 * The prompt lives in an Edge Function no CI runs, so this reads its source:
 * every key it teaches must be a real Letters template (an unknown key silently
 * falls back to "general" in Letters), and the "when unsure" fallback must be
 * the one key that never starts a clock.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LETTER_TEMPLATES } from './lettersCatalog';

const SRC = readFileSync(join(__dirname, '../../supabase/functions/ai-proxy/index.ts'), 'utf8');

/** The DRAFT trailer's instruction block, up to the next trailer line. */
function draftInstruction(): string {
  const start = SRC.indexOf('[[DRAFT: template_key | offer text]]');
  const end = SRC.indexOf('[[FOLLOWUPS:', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
}

describe('the draft-key instructions the chat model gets', () => {
  it('teaches only keys that exist in the Letters catalog', () => {
    const taught = [...draftInstruction().matchAll(/\b([a-z]+(?:_[a-z0-9]+)+)\b(?= —|[.,])/g)].map(
      (m) => m[1]
    );
    const known = new Set(LETTER_TEMPLATES.map((t) => t.key));
    expect(taught.length).toBeGreaterThan(10);
    for (const key of taught) expect(known.has(key), key).toBe(true);
  });

  it('sends a note to a provider, and anything uncertain, to "general"', () => {
    const block = draftInstruction();
    expect(block).toMatch(/general — everything else, including any message to a provider/);
    expect(block).toMatch(/When unsure, use general\./);
    // ...and says why the other keys need care.
    expect(block).toMatch(/start a legal clock/);
  });
});
