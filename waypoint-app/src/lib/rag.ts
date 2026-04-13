/**
 * RAG (Retrieval-Augmented Generation) service
 * Retrieves relevant KB articles from Supabase pgvector
 * and formats them as context for the AI Navigator
 */

import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';
import type { KnowledgeMatch, HybridSearchMatch } from '@/types/database';

const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MATCH_THRESHOLD = 0.6;
const LOW_CONFIDENCE_THRESHOLD = 0.5;

export type RAGConfidence = 'high' | 'low' | 'none';

export interface RAGResult {
  context: string;
  sources: KnowledgeMatch[];
  queryTimeMs: number;
  confidence: RAGConfidence;
}

/**
 * Retrieve relevant KB articles for a user query using semantic search.
 * Embeddings generated via Edge Function — no API key needed client-side.
 * @param query - The user's question
 * @param options - Search configuration
 * @returns Formatted context string + source metadata
 */
export async function retrieveContext(
  query: string,
  options: {
    matchCount?: number;
    matchThreshold?: number;
    filterSource?: string | null;
  } = {}
): Promise<RAGResult> {
  const startTime = Date.now();
  const {
    matchCount = DEFAULT_MATCH_COUNT,
    matchThreshold = DEFAULT_MATCH_THRESHOLD,
    filterSource = null,
  } = options;

  try {
    // Step 1: Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Step 2: Call the similarity search RPC function
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_source: filterSource,
    });

    if (error) {
      throw new Error(`Supabase RPC error: ${error.message}`);
    }

    const matches: KnowledgeMatch[] = data ?? [];

    // Step 3: Compute confidence level
    const confidence: RAGConfidence =
      matches.length === 0
        ? 'none'
        : matches.every((m) => m.similarity < LOW_CONFIDENCE_THRESHOLD)
          ? 'low'
          : 'high';

    // Step 4: Format context for the AI prompt
    const context = formatContext(matches);

    return {
      context,
      sources: matches,
      queryTimeMs: Date.now() - startTime,
      confidence,
    };
  } catch (error) {
    throw new Error(
      `RAG retrieval failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Hybrid search — combines semantic similarity with keyword matching
 * Better for queries with specific legal terms or codes
 */
export async function hybridRetrieveContext(
  query: string,
  options: {
    matchCount?: number;
    semanticWeight?: number;
    keywordWeight?: number;
    filterSource?: string | null;
  } = {}
): Promise<RAGResult> {
  const startTime = Date.now();
  const {
    matchCount = DEFAULT_MATCH_COUNT,
    semanticWeight = 0.7,
    keywordWeight = 0.3,
    filterSource = null,
  } = options;

  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('hybrid_search_knowledge', {
      query_embedding: queryEmbedding,
      query_text: query,
      match_count: matchCount,
      semantic_weight: semanticWeight,
      keyword_weight: keywordWeight,
      filter_source: filterSource,
    });

    if (error) {
      throw new Error(`Supabase RPC error: ${error.message}`);
    }

    const matches: HybridSearchMatch[] = data ?? [];

    const confidence: RAGConfidence =
      matches.length === 0
        ? 'none'
        : matches.every((m) => m.similarity < LOW_CONFIDENCE_THRESHOLD)
          ? 'low'
          : 'high';

    const context = formatContext(matches);

    return {
      context,
      sources: matches,
      queryTimeMs: Date.now() - startTime,
      confidence,
    };
  } catch (error) {
    throw new Error(
      `Hybrid RAG retrieval failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Retrieve context from multiple KB sources in parallel.
 * For cross-topic queries, generates the embedding once and queries
 * each source independently, then merges and deduplicates results.
 *
 * Falls back to single-source retrieveContext() when 0 or 1 source.
 */
export async function retrieveMultiSourceContext(
  query: string,
  sources: string[],
  options: {
    matchCount?: number;
    matchThreshold?: number;
  } = {}
): Promise<RAGResult> {
  const {
    matchCount = DEFAULT_MATCH_COUNT,
    matchThreshold = DEFAULT_MATCH_THRESHOLD,
  } = options;

  // Single source or no sources: delegate to standard retrieval
  if (sources.length <= 1) {
    return retrieveContext(query, {
      matchCount,
      matchThreshold,
      filterSource: sources[0] ?? null,
    });
  }

  const startTime = Date.now();

  try {
    // Generate embedding once for all source queries
    const queryEmbedding = await generateEmbedding(query);

    // Query each source in parallel
    const perSourceCount = Math.max(2, Math.ceil(matchCount / sources.length));
    const sourceResults = await Promise.all(
      sources.map(async (source) => {
        const { data, error } = await supabase.rpc('match_knowledge', {
          query_embedding: queryEmbedding,
          match_threshold: matchThreshold,
          match_count: perSourceCount,
          filter_source: source,
        });

        if (error) {
          console.warn(`RAG multi-source error for ${source}:`, error.message);
          return [] as KnowledgeMatch[];
        }
        return (data ?? []) as KnowledgeMatch[];
      })
    );

    // Merge and deduplicate by article ID, keeping highest similarity
    const seen = new Map<string, KnowledgeMatch>();
    for (const results of sourceResults) {
      for (const match of results) {
        const existing = seen.get(match.id);
        if (!existing || match.similarity > existing.similarity) {
          seen.set(match.id, match);
        }
      }
    }

    // Sort by similarity descending, take top N
    const merged = Array.from(seen.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);

    const confidence: RAGConfidence =
      merged.length === 0
        ? 'none'
        : merged.every((m) => m.similarity < LOW_CONFIDENCE_THRESHOLD)
          ? 'low'
          : 'high';

    const context = formatContext(merged);

    return {
      context,
      sources: merged,
      queryTimeMs: Date.now() - startTime,
      confidence,
    };
  } catch (error) {
    throw new Error(
      `Multi-source RAG retrieval failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Format retrieved KB articles into a context string for the AI prompt
 */
function formatContext(matches: KnowledgeMatch[]): string {
  if (matches.length === 0) {
    return 'No relevant knowledge base articles found for this query.';
  }

  const sections = matches.map((match, i) => {
    const sourceLabel = match.source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const sectionLabel = match.section ? ` > ${match.section}` : '';
    const confidence = Math.round(match.similarity * 100);

    return [
      `--- Knowledge Article ${i + 1} [${sourceLabel}${sectionLabel}] (${confidence}% relevance) ---`,
      match.content,
    ].join('\n');
  });

  return [
    '=== RELEVANT KNOWLEDGE BASE ARTICLES ===',
    '',
    ...sections,
    '',
    '=== END KNOWLEDGE BASE ===',
  ].join('\n');
}
