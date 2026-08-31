/**
 * Actions hook — full CRUD with optimistic updates and offline queue
 * Manages action plan items stored in Supabase `actions` table
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { retryQuery, friendlyErrorMessage } from '@/lib/netRetry';
import type {
  Action,
  ActionStatus,
  ActionCategory,
  ActionPriority,
  ActionStep,
  ActionStats,
} from '@/types/database';

// ─── Hook: useActions ───────────────────────────────────────────────────────

interface UseActionsOptions {
  familyId: string;
  statusFilter?: ActionStatus[];
  categoryFilter?: ActionCategory;
}

interface UseActionsReturn {
  actions: Action[];
  loading: boolean;
  error: string | null;
  stats: ActionStats | null;
  createAction: (data: CreateActionInput) => Promise<Action | null>;
  updateAction: (actionId: string, data: Partial<Action>) => Promise<void>;
  updateStatus: (actionId: string, status: ActionStatus, reason?: string) => Promise<void>;
  toggleStep: (actionId: string, stepIndex: number) => Promise<void>;
  refetch: () => Promise<void>;
}

interface CreateActionInput {
  title: string;
  description?: string;
  category?: ActionCategory;
  priority?: ActionPriority;
  child_id?: string;
  chat_session_id?: string;
  script?: string;
  steps?: ActionStep[];
  kb_article_ids?: string[];
  due_date?: string;
  follow_up_date?: string;
  follow_up_note?: string;
  source?: 'ai_navigator' | 'manual' | 'system';
  source_message_id?: string;
}

export function useActions(options: UseActionsOptions): UseActionsReturn {
  const { familyId, statusFilter, categoryFilter } = options;

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActionStats | null>(null);

  // ─── Fetch Actions ──────────────────────────────────────────────────────

  const fetchActions = useCallback(async () => {
    try {
      let query = supabase
        .from('actions')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      // A dropped connection is the common case on a phone — retry the
      // blip rather than showing the parent a raw "TypeError: Load failed"
      const { data, error: dbError } = await retryQuery(() => query);

      if (dbError) throw new Error(dbError.message);
      setError(null);
      setActions((data as Action[]) ?? []);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your action plan."));
    }
  }, [familyId, statusFilter, categoryFilter]);

  // ─── Fetch Stats ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('action_stats')
        .select('*')
        .eq('family_id', familyId)
        .single();

      if (dbError && dbError.code !== 'PGRST116') {
        // PGRST116 = no rows found (new user, no actions yet)
        throw new Error(dbError.message);
      }
      setStats(data as ActionStats | null);
    } catch (err) {
      // Stats are non-critical — don't surface errors
      console.warn('Failed to fetch action stats:', err);
    }
  }, [familyId]);

  // ─── Initial Load ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!familyId) return;

    setLoading(true);
    Promise.all([fetchActions(), fetchStats()])
      .finally(() => setLoading(false));
  }, [familyId, fetchActions, fetchStats]);

  // ─── Create Action ──────────────────────────────────────────────────────

  const createAction = useCallback(async (data: CreateActionInput): Promise<Action | null> => {
    setError(null);

    const newAction: Partial<Action> = {
      family_id: familyId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? 'general',
      priority: data.priority ?? 'medium',
      status: 'not_started',
      child_id: data.child_id ?? null,
      chat_session_id: data.chat_session_id ?? null,
      script: data.script ?? null,
      steps: data.steps ?? null,
      kb_article_ids: data.kb_article_ids ?? null,
      due_date: data.due_date ?? null,
      follow_up_date: data.follow_up_date ?? null,
      follow_up_note: data.follow_up_note ?? null,
      source: data.source ?? 'manual',
      source_message_id: data.source_message_id ?? null,
    };

    try {
      // Dedup (owner, Aug 31) — SYSTEM adds only. The journey "+" and "Add all"
      // re-fire on every visit (their local "added" state resets on remount)
      // and this insert was unconditional, so identical steps stacked up as
      // duplicate "To do" rows. Before inserting a `system` action, return an
      // existing OPEN one with the same child + title instead. Scoped to
      // `system` on purpose: a manual or AI-navigator add of the same title is
      // a distinct action the parent meant to create (its own description, due
      // date), so those paths are never deduped. A completed or dismissed one
      // does NOT block a fresh add (a yearly task can come back).
      if ((newAction.source ?? 'manual') === 'system') {
        let dupQuery = supabase
          .from('actions')
          .select('*')
          .eq('family_id', familyId)
          .eq('title', newAction.title as string)
          .eq('source', 'system')
          .in('status', ['not_started', 'in_progress'])
          .limit(1);
        dupQuery = data.child_id
          ? dupQuery.eq('child_id', data.child_id)
          : dupQuery.is('child_id', null);
        const { data: dupRows } = await retryQuery(() => dupQuery);
        const existing = (dupRows as Action[] | null)?.[0];
        if (existing) {
          // Make sure it's in local state, but never insert a duplicate.
          setActions((prev) => (prev.some((a) => a.id === existing.id) ? prev : [existing, ...prev]));
          return existing;
        }
      }

      const { data: created, error: dbError } = await retryQuery(() =>
        supabase.from('actions').insert(newAction).select().single()
      );

      if (dbError) throw new Error(dbError.message);

      const action = created as Action;

      // Optimistic UI update
      setActions((prev) => [action, ...prev]);
      fetchStats(); // Refresh stats in background

      return action;
    } catch (err) {
      // Honest failure (Wave 1.6): the old path faked an "offline save" for
      // ANY error (including permission/validation failures), showed success,
      // and the action then evaporated. Surface the real error instead; a
      // true offline queue with replay is roadmap 7.2.
      setError(friendlyErrorMessage(err, "Couldn't save this action."));
      return null;
    }
  }, [familyId, fetchStats]);

  // ─── Update Action ──────────────────────────────────────────────────────

  const updateAction = useCallback(async (actionId: string, data: Partial<Action>) => {
    setError(null);

    // Optimistic update
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, ...data } : a))
    );

    try {
      const { error: dbError } = await retryQuery(() =>
        supabase.from('actions').update(data).eq('id', actionId)
      );

      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't save that change."));
      fetchActions(); // roll back the optimistic update
    }
  }, [fetchActions]);

  // ─── Status Change ──────────────────────────────────────────────────────

  const updateStatus = useCallback(async (
    actionId: string,
    status: ActionStatus,
    reason?: string
  ) => {
    const updates: Partial<Action> = { status };

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'dismissed') {
      updates.dismissed_at = new Date().toISOString();
      updates.dismissed_reason = reason ?? null;
    }

    await updateAction(actionId, updates);
    fetchStats(); // Refresh completion rates
  }, [updateAction, fetchStats]);

  // ─── Toggle Step ────────────────────────────────────────────────────────

  const toggleStep = useCallback(async (actionId: string, stepIndex: number) => {
    const action = actions.find((a) => a.id === actionId);
    if (!action?.steps) return;

    const updatedSteps = action.steps.map((s, i) =>
      i === stepIndex ? { ...s, done: !s.done } : s
    );

    await updateAction(actionId, { steps: updatedSteps });
  }, [actions, updateAction]);

  // ─── Refetch ────────────────────────────────────────────────────────────

  const refetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchActions(), fetchStats()]);
    setLoading(false);
  }, [fetchActions, fetchStats]);

  return {
    actions,
    loading,
    error,
    stats,
    createAction,
    updateAction,
    updateStatus,
    toggleStep,
    refetch,
  };
}
