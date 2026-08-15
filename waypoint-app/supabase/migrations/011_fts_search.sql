-- 011: Full-text search retrieval for the knowledge base
--
-- Replaces OpenAI-embedding similarity search with Postgres full-text
-- search so KB retrieval works with no embedding provider. The embedding
-- column and match_knowledge() RPC are left in place for a future
-- vector-search upgrade; nothing depends on them after this migration.

-- Generated tsvector column over article content (auto-maintained)
alter table public.knowledge_embeddings
  add column if not exists fts tsvector
  generated always as (to_tsvector('english', content)) stored;

create index if not exists idx_knowledge_fts
  on public.knowledge_embeddings using gin (fts);

-- Full-text search RPC. Returns the same shape as match_knowledge() so
-- client code is drop-in compatible; `similarity` is a normalized
-- ts_rank score in [0, 1).
--
-- The user's question is turned into an OR-of-lexemes query (rather than
-- websearch AND semantics) so natural-language questions match articles
-- that share any meaningful terms; ts_rank still puts articles matching
-- more terms first.
create or replace function public.match_knowledge_fts(
  query_text text,
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
declare
  q tsquery;
  or_terms text;
begin
  -- Build OR-of-lexemes from the normalized question terms
  -- (each lexeme quoted so punctuation can't break tsquery syntax)
  select string_agg(distinct '''' || replace(lexeme, '''', '''''') || '''', ' | ')
    into or_terms
  from unnest(to_tsvector('english', query_text));

  if or_terms is null or or_terms = '' then
    return; -- nothing searchable in the query (e.g. only stopwords)
  end if;

  q := to_tsquery('english', or_terms);

  return query
  select
    ke.id,
    ke.content,
    ke.source,
    ke.section,
    ke.metadata,
    -- ts_rank with normalization flag 32 → rank/(rank+1), bounded [0, 1)
    ts_rank(ke.fts, q, 32)::float as similarity
  from public.knowledge_embeddings ke
  where
    (filter_source is null or ke.source = filter_source)
    and ke.fts @@ q
  order by ts_rank(ke.fts, q, 32) desc
  limit match_count;
end;
$$;

grant execute on function public.match_knowledge_fts to authenticated;
