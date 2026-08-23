import { describe, it, expect } from 'vitest';
import { ftsConfidence } from './rag';
import type { KnowledgeMatch } from '@/types/database';

function match(similarity: number): KnowledgeMatch {
  return {
    id: 'test',
    content: 'article body',
    source: 'kb',
    section: null,
    metadata: null,
    similarity,
  };
}

describe('ftsConfidence (REQ-1206 — gate on rank, not existence)', () => {
  it('returns none with no matches', () => {
    expect(ftsConfidence([])).toBe('none');
  });

  it('returns low when the best match is a weak one-word overlap', () => {
    // OR-of-lexemes matching means sharing a single common word produces
    // a match with a tiny rank — before the gate this reported high.
    expect(ftsConfidence([match(0.01), match(0.005)])).toBe('low');
  });

  it('returns high when at least one match ranks strongly', () => {
    expect(ftsConfidence([match(0.01), match(0.4)])).toBe('high');
  });

  it('treats a missing similarity defensively as weak', () => {
    const m = match(0);
    // @ts-expect-error — simulate an RPC row missing the field
    m.similarity = undefined;
    expect(ftsConfidence([m])).toBe('low');
  });
});
