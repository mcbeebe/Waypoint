-- 003: Add similarity search RPC function for RAG retrieval
-- Requires pgvector extension (enabled in 001_schema_v1.sql)

-- Similarity search function using cosine distance
-- Returns top-k most similar KB articles given a query embedding
create or replace function public.match_knowledge(
  query_embedding extensions.vector(1536),
  match_threshold float default 0.5,
  match_count int default 5,
  filter_source text default null
)
returns table (
  id uuid,
  content text,
  source text,
  section text,
  metadata jsonb,
  similarity float
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    ke.id,
    ke.content,
    ke.source,
    ke.section,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) as similarity
  from public.knowledge_embeddings ke
  where
    (filter_source is null or ke.source = filter_source)
    and 1 - (ke.embedding <=> query_embedding) > match_threshold
  order by ke.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant execute to authenticated users (RLS already protects read access)
grant execute on function public.match_knowledge to authenticated;

-- Add a text search index for hybrid search (keyword + semantic)
create index if not exists idx_knowledge_content_trgm
  on public.knowledge_embeddings
  using gin (content gin_trgm_ops);

-- Enable trigram extension for fuzzy text search
create extension if not exists pg_trgm;

-- Hybrid search: combines semantic similarity with keyword matching
create or replace function public.hybrid_search_knowledge(
  query_embedding extensions.vector(1536),
  query_text text,
  match_count int default 5,
  semantic_weight float default 0.7,
  keyword_weight float default 0.3,
  filter_source text default null
)
returns table (
  id uuid,
  content text,
  source text,
  section text,
  metadata jsonb,
  similarity float,
  keyword_rank float,
  combined_score float
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    ke.id,
    ke.content,
    ke.source,
    ke.section,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) as similarity,
    similarity(ke.content, query_text) as keyword_rank,
    (
      semantic_weight * (1 - (ke.embedding <=> query_embedding))
      + keyword_weight * similarity(ke.content, query_text)
    ) as combined_score
  from public.knowledge_embeddings ke
  where
    (filter_source is null or ke.source = filter_source)
  order by combined_score desc
  limit match_count;
end;
$$;

grant execute on function public.hybrid_search_knowledge to authenticated;
