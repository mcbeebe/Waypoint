/**
 * Embedding service — generates vector embeddings via OpenAI API
 * Used for both KB article ingestion and query-time embedding
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Generate an embedding vector for a single text string
 * @param text - The text to embed
 * @param apiKey - OpenAI API key
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const result: EmbeddingResponse = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate embeddings for multiple texts in a single batch
 * @param texts - Array of texts to embed
 * @param apiKey - OpenAI API key
 * @returns Array of 1536-dimensional embedding vectors
 */
export async function generateBatchEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const result: EmbeddingResponse = await response.json();
    return result.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  } catch (error) {
    throw new Error(
      `Failed to generate batch embeddings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
