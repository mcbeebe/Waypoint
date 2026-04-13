/**
 * Moderation hook — report queue, hide/remove content, warn/ban users
 * Phase 5: Sprint S46
 *
 * Note: Moderation actions require service_role access.
 * In production, these should route through an Edge Function.
 * For now, uses direct Supabase calls with RLS.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ForumReport, ReportStatus } from '@/types/database';

/** Auto-flag keywords for content that may need review */
const FLAGGED_KEYWORDS = [
  'abuse', 'neglect', 'suicide', 'self-harm', 'illegal',
  'scam', 'fraud', 'spam', 'hate', 'threat',
];

interface UseModerationReturn {
  pendingReports: ForumReport[];
  loading: boolean;
  error: string | null;
  hidePost: (postId: string) => Promise<void>;
  hideThread: (threadId: string) => Promise<void>;
  lockThread: (threadId: string) => Promise<void>;
  resolveReport: (reportId: string, status: ReportStatus, notes?: string) => Promise<void>;
  checkContentFlags: (text: string) => string[];
  refetch: () => Promise<void>;
}

export function useModeration(): UseModerationReturn {
  const [pendingReports, setPendingReports] = useState<ForumReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('forum_reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (dbError) throw new Error(dbError.message);
      setPendingReports((data as ForumReport[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchReports().finally(() => setLoading(false));
  }, [fetchReports]);

  /** Hide a post (set is_hidden = true) */
  const hidePost = useCallback(async (postId: string) => {
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('forum_posts')
        .update({ is_hidden: true })
        .eq('id', postId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  /** Hide a thread (set is_hidden = true) */
  const hideThread = useCallback(async (threadId: string) => {
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('forum_threads')
        .update({ is_hidden: true })
        .eq('id', threadId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  /** Lock a thread (prevent new replies) */
  const lockThread = useCallback(async (threadId: string) => {
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('forum_threads')
        .update({ is_locked: true })
        .eq('id', threadId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  /** Resolve a report with status and optional notes */
  const resolveReport = useCallback(async (
    reportId: string,
    status: ReportStatus,
    notes?: string
  ) => {
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('forum_reports')
        .update({
          status,
          moderator_notes: notes ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      if (dbError) throw new Error(dbError.message);
      setPendingReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  /** Check text for auto-flag keywords (client-side pre-filter) */
  const checkContentFlags = useCallback((text: string): string[] => {
    const lower = text.toLowerCase();
    return FLAGGED_KEYWORDS.filter((keyword) => lower.includes(keyword));
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchReports();
    setLoading(false);
  }, [fetchReports]);

  return {
    pendingReports,
    loading,
    error,
    hidePost,
    hideThread,
    lockThread,
    resolveReport,
    checkContentFlags,
    refetch,
  };
}
