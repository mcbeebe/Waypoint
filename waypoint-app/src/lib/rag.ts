/**
 * RAG (Retrieval-Augmented Generation) service
 * Retrieves relevant KB articles from Supabase and formats them as
 * context for the AI Navigator.
 *
 * Retrieval uses Postgres full-text search (match_knowledge_fts RPC) —
 * no embedding provider required, so the whole AI stack stays on
 * Anthropic. The pgvector path (match_knowledge + embeddings) remains in
 * the schema for a future semantic-search upgrade.
 */

import { supabase } from './supabase';
import type { KnowledgeMatch } from '@/types/database';

const DEFAULT_MATCH_COUNT = 5;

export type RAGConfidence = 'high' | 'low' | 'none';

export interface RAGResult {
  context: string;
  sources: KnowledgeMatch[];
  queryTimeMs: number;
  confidence: RAGConfidence;
}

/** Run the full-text search RPC for one source filter (or all sources). */
async function ftsSearch(
  query: string,
  matchCount: number,
  filterSource: string | null
): Promise<KnowledgeMatch[]> {
  const { data, error } = await supabase.rpc('match_knowledge_fts', {
    query_text: query,
    match_count: matchCount,
    filter_source: filterSource,
  });

  if (error) {
    throw new Error(`Supabase RPC error: ${error.message}`);
  }
  return (data ?? []) as KnowledgeMatch[];
}

/**
 * FTS rank scores are much smaller than cosine similarities, so
 * confidence is based on having matches at all: the rank ordering is
 * meaningful, the absolute magnitude is not.
 */
function ftsConfidence(matches: KnowledgeMatch[]): RAGConfidence {
  return matches.length === 0 ? 'none' : 'high';
}

/**
 * Retrieve relevant KB articles for a user query using full-text search.
 * @param query - The user's question
 * @param options - Search configuration
 * @returns Formatted context string + source metadata
 */
export async function retrieveContext(
  query: string,
  options: {
    matchCount?: number;
    matchThreshold?: number; // retained for signature compatibility; unused by FTS
    filterSource?: string | null;
  } = {}
): Promise<RAGResult> {
  const startTime = Date.now();
  const { matchCount = DEFAULT_MATCH_COUNT, filterSource = null } = options;

  try {
    let matches = await ftsSearch(query, matchCount, filterSource);

    // Safety net: a bad/unseeded source filter shouldn't blank retrieval
    if (matches.length === 0 && filterSource) {
      matches = await ftsSearch(query, matchCount, null);
    }

    return {
      context: formatContext(matches),
      sources: matches,
      queryTimeMs: Date.now() - startTime,
      confidence: ftsConfidence(matches),
    };
  } catch (error) {
    throw new Error(
      `RAG retrieval failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Hybrid search — with FTS-based retrieval, keyword matching is the
 * primary signal, so this delegates to retrieveContext. Kept for
 * signature compatibility with existing callers.
 */
export async function hybridRetrieveContext(
  query: string,
  options: {
    matchCount?: number;
    semanticWeight?: number; // unused by FTS
    keywordWeight?: number; // unused by FTS
    filterSource?: string | null;
  } = {}
): Promise<RAGResult> {
  return retrieveContext(query, {
    matchCount: options.matchCount,
    filterSource: options.filterSource,
  });
}

/**
 * Retrieve context from multiple KB sources in parallel.
 * For cross-topic queries, queries each source independently, then
 * merges and deduplicates results.
 *
 * Falls back to single-source retrieveContext() when 0 or 1 source.
 */
export async function retrieveMultiSourceContext(
  query: string,
  sources: string[],
  options: {
    matchCount?: number;
    matchThreshold?: number; // retained for signature compatibility; unused by FTS
  } = {}
): Promise<RAGResult> {
  const { matchCount = DEFAULT_MATCH_COUNT } = options;

  // Single source or no sources: delegate to standard retrieval
  if (sources.length <= 1) {
    return retrieveContext(query, {
      matchCount,
      filterSource: sources[0] ?? null,
    });
  }

  const startTime = Date.now();

  try {
    // Query each source in parallel
    const perSourceCount = Math.max(2, Math.ceil(matchCount / sources.length));
    const sourceResults = await Promise.all(
      sources.map(async (source) => {
        try {
          return await ftsSearch(query, perSourceCount, source);
        } catch (err) {
          console.warn(
            `RAG multi-source error for ${source}:`,
            err instanceof Error ? err.message : String(err)
          );
          return [] as KnowledgeMatch[];
        }
      })
    );

    // Merge and deduplicate by article ID, keeping highest score
    const seen = new Map<string, KnowledgeMatch>();
    for (const results of sourceResults) {
      for (const match of results) {
        const existing = seen.get(match.id);
        if (!existing || match.similarity > existing.similarity) {
          seen.set(match.id, match);
        }
      }
    }

    // Sort by score descending, take top N
    let merged = Array.from(seen.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);

    // Safety net: if every filtered source came back empty, search unfiltered
    if (merged.length === 0) {
      merged = await ftsSearch(query, matchCount, null);
    }

    return {
      context: formatContext(merged),
      sources: merged,
      queryTimeMs: Date.now() - startTime,
      confidence: ftsConfidence(merged),
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

    return [
      `--- Knowledge Article ${i + 1} [${sourceLabel}${sectionLabel}] ---`,
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
