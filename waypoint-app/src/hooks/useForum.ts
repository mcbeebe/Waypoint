/**
 * Forum hook — CRUD for categories, threads, posts, reactions, and reports
 * Phase 5: Sprint S40
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  ForumCategory,
  ForumThread,
  ForumPost,
  ReactionType,
} from '@/types/database';

// ─── useCategories ──────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (dbError) throw new Error(dbError.message);
      setCategories((data as ForumCategory[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCategories().finally(() => setLoading(false));
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}

// ─── useThreads ─────────────────────────────────────────────────────────────

interface UseThreadsOptions {
  categoryId?: string;
  pageSize?: number;
}

export function useThreads(options: UseThreadsOptions = {}) {
  const { categoryId, pageSize = 20 } = options;

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchThreads = useCallback(async (offset = 0) => {
    try {
      let query = supabase
        .from('forum_threads')
        .select('*')
        .eq('is_hidden', false)
        .order('is_pinned', { ascending: false })
        .order('last_post_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);

      const fetched = (data as ForumThread[]) ?? [];
      if (offset === 0) {
        setThreads(fetched);
      } else {
        setThreads((prev) => [...prev, ...fetched]);
      }
      setHasMore(fetched.length >= pageSize);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [categoryId, pageSize]);

  useEffect(() => {
    setLoading(true);
    fetchThreads(0).finally(() => setLoading(false));
  }, [fetchThreads]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchThreads(threads.length);
  }, [hasMore, loading, threads.length, fetchThreads]);

  const createThread = useCallback(async (data: {
    category_id: string;
    title: string;
    body: string;
    tags?: string[];
    author_display_name: string;
  }): Promise<ForumThread | null> => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('forum_threads')
        .insert({
          category_id: data.category_id,
          author_id: user.id,
          author_display_name: data.author_display_name,
          title: data.title,
          body: data.body,
          tags: data.tags ?? [],
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const thread = created as ForumThread;
      setThreads((prev) => [thread, ...prev]);
      return thread;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchThreads(0);
    setLoading(false);
  }, [fetchThreads]);

  return { threads, loading, error, hasMore, loadMore, createThread, refetch };
}

// ─── usePosts ───────────────────────────────────────────────────────────────

export function usePosts(threadId: string) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!threadId) return;
    try {
      const { data, error: dbError } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('thread_id', threadId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (dbError) throw new Error(dbError.message);
      setPosts((data as ForumPost[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [threadId]);

  useEffect(() => {
    setLoading(true);
    fetchPosts().finally(() => setLoading(false));
  }, [fetchPosts]);

  const createPost = useCallback(async (data: {
    body: string;
    parent_post_id?: string;
    author_display_name: string;
  }): Promise<ForumPost | null> => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: threadId,
          author_id: user.id,
          author_display_name: data.author_display_name,
          body: data.body,
          parent_post_id: data.parent_post_id ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const post = created as ForumPost;
      setPosts((prev) => [...prev, post]);
      return post;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [threadId]);

  const toggleReaction = useCallback(async (postId: string, reaction: ReactionType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('forum_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .eq('reaction', reaction)
        .maybeSingle();

      if (existing) {
        await supabase.from('forum_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('forum_reactions').insert({
          post_id: postId,
          user_id: user.id,
          reaction,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const reportPost = useCallback(async (postId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('forum_reports').insert({
        reporter_id: user.id,
        post_id: postId,
        reason,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPosts();
    setLoading(false);
  }, [fetchPosts]);

  return { posts, loading, error, createPost, toggleReaction, reportPost, refetch };
}
