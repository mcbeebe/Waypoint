/**
 * RAG (Retrieval-Augmented Generation) service
 * Retrieves relevant KB articles from Supabase pgvector
 * and formats them as context for the AI Navigator
 */

import { supabase } from './supabase';
import { generateEmbedding } from './embeddings';
import type { KnowledgeMatch, HybridSearchMatch } from '@/types/database';

const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MATCH_THRESHOLD = 0.4;

interface RAGResult {
  context: string;
  sources: KnowledgeMatch[];
  queryTimeMs: number;
}

/**
 * Retrieve relevant KB articles for a user query using semantic search
 * @param query - The user's question
 * @param openAiKey - OpenAI API key for embedding the query
 * @param options - Search configuration
 * @returns Formatted context string + source metadata
 */
export async function retrieveContext(
  query: string,
  openAiKey: string,
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
    const queryEmbedding = await generateEmbedding(query, openAiKey);

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

    // Step 3: Format context for the AI prompt
    const context = formatContext(matches);

    return {
      context,
      sources: matches,
      queryTimeMs: Date.now() - startTime,
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
  openAiKey: string,
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
    const queryEmbedding = await generateEmbedding(query, openAiKey);

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

    const context = formatContext(matches);

    return {
      context,
      sources: matches,
      queryTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    throw new Error(
      `Hybrid RAG retrieval failed: ${error instanceof Error ? error.message : String(error)}`
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
