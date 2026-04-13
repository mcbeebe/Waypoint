/**
 * Resources hook — fetch, filter, and search guides/articles
 * Phase 10: Sprint S71
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Resource, ResourceCategory, DifficultyLevel } from '@/types/database';

interface UseResourcesOptions {
  category?: ResourceCategory;
  difficulty?: DifficultyLevel;
  searchQuery?: string;
  pageSize?: number;
}

export function useResources(options: UseResourcesOptions = {}) {
  const { category, difficulty, searchQuery, pageSize = 20 } = options;

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchResources = useCallback(async (offset = 0) => {
    try {
      let query = supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (category) query = query.eq('category', category);
      if (difficulty) query = query.eq('difficulty_level', difficulty);

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);

      let results = (data as Resource[]) ?? [];
      if (searchQuery) {
        const lower = searchQuery.toLowerCase();
        results = results.filter(
          (r) => r.title.toLowerCase().includes(lower) || r.body.toLowerCase().includes(lower)
        );
      }

      if (offset === 0) {
        setResources(results);
      } else {
        setResources((prev) => [...prev, ...results]);
      }
      setHasMore(results.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [category, difficulty, searchQuery, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchResources(0).finally(() => setLoading(false));
  }, [fetchResources]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchResources(resources.length);
  }, [hasMore, loading, resources.length, fetchResources]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchResources(0);
    setLoading(false);
  }, [fetchResources]);

  return { resources, loading, error, hasMore, loadMore, refetch };
}
