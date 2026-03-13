/**
 * Embedding service — generates vector embeddings via Supabase Edge Function
 * The Edge Function proxies to OpenAI, keeping API keys server-side.
 */

import { supabase } from './supabase';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/** Get current Supabase auth token */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Generate an embedding vector for a single text string.
 * Routes through Edge Function — no API key needed client-side.
 * @param text - The text to embed
 * @param _apiKey - Ignored (kept for backward compat — auth via JWT)
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(
  text: string,
  _apiKey: string
): Promise<number[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'embed', texts: [text] }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding proxy error (${response.status}): ${error}`);
    }

    const result = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in a single batch.
 * Routes through Edge Function — no API key needed client-side.
 * @param texts - Array of texts to embed
 * @param _apiKey - Ignored (kept for backward compat — auth via JWT)
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateBatchEmbeddings(
  texts: string[],
  _apiKey: string
): Promise<number[][]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'embed', texts }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding proxy error (${response.status}): ${error}`);
    }

    const result = await response.json();
    return result.data
      .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
      .map((d: { embedding: number[] }) => d.embedding);
  } catch (error) {
    throw new Error(
      `Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
