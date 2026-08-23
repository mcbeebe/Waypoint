/**
 * Pure retrieval-confidence scoring (REQ-1206) — no imports with side
 * effects, so it stays unit-testable (rag.ts pulls in the Supabase client,
 * which can't load under vitest).
 */

export type RAGConfidence = 'high' | 'low' | 'none';

/** The minimal shape scoring needs from a retrieval match. */
export interface RankedMatch {
  similarity: number;
}

/**
 * Rank threshold below which retrieval is treated as low-confidence.
 *
 * The FTS query is an OR-of-lexemes, so a question sharing ONE common word
 * with an article still "matches" — with a tiny normalized ts_rank. Before
 * this gate, any match at all reported 'high', so the low-confidence
 * warning in the system prompt could only ever fire on zero results, and a
 * weak one-word overlap produced a confident wrong answer.
 * match_knowledge_fts returns `similarity` as a normalized ts_rank in
 * [0, 1); glancing single-term overlaps score well under this threshold
 * while genuinely on-topic articles score above it.
 */
export const LOW_CONFIDENCE_RANK = 0.05;

/**
 * Confidence gate on retrieval quality, not mere existence:
 * no matches → 'none'; matches whose BEST normalized rank is still weak →
 * 'low' (the assistant hedges and refers out); otherwise 'high'.
 */
export function ftsConfidence(matches: RankedMatch[]): RAGConfidence {
  if (matches.length === 0) return 'none';
  const topRank = Math.max(...matches.map((m) => m.similarity ?? 0));
  return topRank < LOW_CONFIDENCE_RANK ? 'low' : 'high';
}
