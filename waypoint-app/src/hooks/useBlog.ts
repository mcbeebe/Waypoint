/**
 * Blog hook — fetch, filter, and paginate blog posts
 * Phase 10: Sprint S74
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { BlogPost, BlogCategory } from '@/types/database';

interface UseBlogOptions {
  category?: BlogCategory;
  pageSize?: number;
}

export function useBlog(options: UseBlogOptions = {}) {
  const { category, pageSize = 20 } = options;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (offset = 0) => {
    try {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (category) query = query.eq('category', category);

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);

      const fetched = (data as BlogPost[]) ?? [];

      if (offset === 0) {
        const featured = fetched.find((p) => p.is_featured) ?? null;
        setFeaturedPost(featured);
        setPosts(fetched.filter((p) => p.id !== featured?.id));
      } else {
        setPosts((prev) => [...prev, ...fetched]);
      }
      setHasMore(fetched.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [category, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchPosts(0).finally(() => setLoading(false));
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchPosts(posts.length);
  }, [hasMore, loading, posts.length, fetchPosts]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPosts(0);
    setLoading(false);
  }, [fetchPosts]);

  return { posts, featuredPost, loading, error, hasMore, loadMore, refetch };
}
