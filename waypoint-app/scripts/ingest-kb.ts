/**
 * KB Article Ingestion Script
 * Reads the Enhanced JSON KB articles, generates embeddings,
 * and upserts them into Supabase knowledge_embeddings table.
 *
 * Usage:
 *   npx tsx scripts/ingest-kb.ts
 *
 * Requires env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 */

import * as fs from 'fs';
import * as path from 'path';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// ─── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? '';

const KB_FILE = path.resolve(
  __dirname,
  '../../Waypoint-Lite-KB-Articles-ENHANCED-AI-SCHEMA-Feb2026.json'
);

// ─── Types ──────────────────────────────────────────────────────────────────

interface KBArticle {
  code_title: string;
  body: string;
  last_reviewed: string;
}

interface KBFile {
  project: string;
  jurisdiction: string;
  last_compiled: string;
  articles: KBArticle[];
}

interface ParsedArticle {
  code: string;
  title: string;
  category: string;
  subcategory: string;
  sourceRef: string;
  content: string;
  lastReviewed: string;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

function parseArticle(article: KBArticle): ParsedArticle {
  // Parse code_title: "RC-001: Lanterman Act Key Sections & Rights"
  const titleMatch = article.code_title.match(/^([A-Z]+-\d+):\s*(.+)$/);
  const code = titleMatch?.[1] ?? article.code_title;
  const title = titleMatch?.[2] ?? article.code_title;

  // Parse metadata from first line of body
  // "Category: regional-center  |  Subcategory: lanterman-act  |  Source: ..."
  const lines = article.body.split('\n');
  const metaLine = lines[0] ?? '';
  const metaMatch = metaLine.match(
    /Category:\s*([^\|]+)\|\s*Subcategory:\s*([^\|]+)\|\s*Source:\s*(.+)/
  );

  const category = metaMatch?.[1]?.trim() ?? 'unknown';
  const subcategory = metaMatch?.[2]?.trim() ?? 'unknown';
  const sourceRef = metaMatch?.[3]?.trim() ?? '';

  // Content is everything after the metadata line (skip blank line after meta)
  const contentStart = metaMatch ? 2 : 0;
  const content = lines.slice(contentStart).join('\n').trim();

  return {
    code,
    title,
    category,
    subcategory,
    sourceRef,
    content,
    lastReviewed: article.last_reviewed,
  };
}

// ─── Embedding ──────────────────────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${err}`);
  }

  const result = await response.json();
  return result.data[0].embedding;
}

// ─── Supabase Upsert ────────────────────────────────────────────────────────

async function upsertEmbedding(article: ParsedArticle, embedding: number[]) {
  // Use the REST API directly with service role key
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_embeddings`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      content: `${article.title}\n\n${article.content}`,
      source: article.category.replace(/-/g, '_'),
      section: article.code,
      metadata: {
        code: article.code,
        title: article.title,
        category: article.category,
        subcategory: article.subcategory,
        source_ref: article.sourceRef,
        last_reviewed: article.lastReviewed,
      },
      embedding: `[${embedding.join(',')}]`,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Supabase upsert error (${response.status}): ${err}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Waypoint KB Article Ingestion → pgvector       ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Validate env
  if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
    console.error('Missing required env vars:');
    if (!SUPABASE_URL) console.error('  - SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
    if (!SUPABASE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    if (!OPENAI_KEY) console.error('  - OPENAI_API_KEY');
    process.exit(1);
  }

  // Read KB file
  if (!fs.existsSync(KB_FILE)) {
    console.error(`KB file not found: ${KB_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(KB_FILE, 'utf-8');
  const kb: KBFile = JSON.parse(raw);

  console.log(`Project: ${kb.project}`);
  console.log(`Jurisdiction: ${kb.jurisdiction}`);
  console.log(`Last compiled: ${kb.last_compiled}`);
  console.log(`Articles: ${kb.articles.length}\n`);

  // Process each article
  let success = 0;
  let failed = 0;

  for (const article of kb.articles) {
    const parsed = parseArticle(article);
    console.log(`[${parsed.code}] ${parsed.title}`);

    try {
      // Generate embedding for title + content
      const textToEmbed = `${parsed.title}\n\n${parsed.content}`;
      console.log(`  → Generating embedding (${textToEmbed.length} chars)...`);
      const embedding = await generateEmbedding(textToEmbed);

      // Upsert to Supabase
      console.log(`  → Upserting to knowledge_embeddings...`);
      await upsertEmbedding(parsed, embedding);

      console.log(`  ✓ Done (${embedding.length} dimensions)\n`);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
      failed++;
    }

    // Rate limit: ~200ms between calls
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`Results: ${success} success, ${failed} failed, ${kb.articles.length} total`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
