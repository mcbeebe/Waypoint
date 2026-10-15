/**
 * The Navigator's chat model picks which letter template a "Draft this
 * letter" button opens, from the [[DRAFT: key | offer]] trailer the ai-proxy
 * prompt teaches it. On 2026-10-07 it routed a note to a provider through
 * ipp_review_request — a template that starts a 30-day Regional Center clock —
 * because the prompt listed the keys with no word on when each applies.
 *
 * The prompt lives in an Edge Function no CI runs, so this reads its source.
 * It pins: every key taught is a real template AND every template is taught
 * (an untaught ipp_need_request pushed "write this need into the IPP" toward
 * the meeting request it exists to avoid); the clocks the guide names are the
 * clocks the app keeps; "general" starts none; and the trailer stays one line
 * (a wrapped trailer breaks followups.ts's trailer parsing).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { LETTER_TEMPLATES } from './lettersCatalog';
import { sentNextFor } from './sentNext';
import { statutoryDays } from './requestClocks';

const SRC = readFileSync(join(__dirname, '../../supabase/functions/ai-proxy/index.ts'), 'utf8');
const CATALOG = LETTER_TEMPLATES.map((t) => t.key);

/** The "Draft keys" section of the chat prompt. */
function guide(): string {
  const start = SRC.indexOf('## Draft keys (for the DRAFT trailer)');
  const end = SRC.indexOf('## Knowledge Base Context', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
}

/** Every key the guide teaches: "key — …" entries and "System: key." entries. */
function taughtKeys(): string[] {
  const g = guide();
  return [
    ...[...g.matchAll(/(?:^|[;:]\s|-\s)([a-z][a-z0-9_]*) —/gm)].map((m) => m[1]),
    ...[...g.matchAll(/: ([a-z][a-z0-9_]*)\./g)].map((m) => m[1]),
  ];
}

/** "key — description" for every entry. */
function entries(): Array<{ key: string; text: string }> {
  return [...guide().matchAll(/([a-z][a-z0-9_]*) — ([^;\n]*)/g)].map((m) => ({ key: m[1], text: m[2] }));
}

describe('the draft keys the chat model is taught', () => {
  it('teaches only real templates', () => {
    const known = new Set(CATALOG);
    for (const key of taughtKeys()) expect(known.has(key), key).toBe(true);
  });

  it('teaches every template — none is left for "general" or a wrong key to absorb', () => {
    const taught = new Set(taughtKeys());
    for (const key of CATALOG) expect(taught.has(key), key).toBe(true);
  });

  it('names exactly the clocks the app keeps, with the right number of days', () => {
    for (const key of CATALOG) {
      const track = sentNextFor(key)?.track;
      const days = track ? statutoryDays(track.requestType) : null;
      const entry = entries().find((e) => e.key === key);
      if (days) {
        expect(entry?.text, key).toContain(`${days}-day clock`);
      } else if (entry) {
        expect(entry.text, key).not.toMatch(/clock\)/);
      }
    }
  });

  it('sends a provider outside both systems, and anything uncertain, to "general" — which starts no clock', () => {
    const g = guide();
    expect(g).toMatch(/general — everything else, including any message to a provider or professional outside the Regional Center and the school district/);
    expect(g).toMatch(/When unsure, use general\./);
    expect(sentNextFor('general')).toBeNull();
  });

  it('keeps the DRAFT trailer one line, followed directly by the next trailer', () => {
    const lines = SRC.split('\n');
    const i = lines.findIndex((l) => l.startsWith('[[DRAFT: template_key | offer text]]'));
    expect(i).toBeGreaterThan(-1);
    expect(lines[i]).toContain('copied exactly from "Draft keys" below');
    expect(lines[i + 1].startsWith('[[FOLLOWUPS:')).toBe(true);
  });
});
