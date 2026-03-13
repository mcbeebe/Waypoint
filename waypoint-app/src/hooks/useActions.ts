/**
 * Actions hook — full CRUD with optimistic updates and offline queue
 * Manages action plan items stored in Supabase `actions` table
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type {
  Action,
  ActionStatus,
  ActionCategory,
  ActionPriority,
  ActionStep,
  ActionStats,
} from '@/types/database';

const OFFLINE_QUEUE_KEY = 'waypoint_action_queue';

// ─── Offline Queue Types ────────────────────────────────────────────────────

interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'status_change';
  payload: Partial<Action>;
  timestamp: number;
}

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
  syncOfflineQueue: () => Promise<number>;
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
  const queueRef = useRef<QueuedOperation[]>([]);

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

      const { data, error: dbError } = await query;

      if (dbError) throw new Error(dbError.message);
      setActions((data as Action[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      const { data: created, error: dbError } = await supabase
        .from('actions')
        .insert(newAction)
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);

      const action = created as Action;

      // Optimistic UI update
      setActions((prev) => [action, ...prev]);
      fetchStats(); // Refresh stats in background

      return action;
    } catch (err) {
      // Queue for offline sync
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const offlineAction: Action = {
        ...newAction,
        id: localId,
        local_id: localId,
        synced_at: null,
        version: 1,
        reminder_sent: false,
        completed_at: null,
        dismissed_at: null,
        dismissed_reason: null,
        deadline_warning_days: 7,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Action;

      setActions((prev) => [offlineAction, ...prev]);

      await enqueueOperation({
        id: localId,
        type: 'create',
        payload: newAction,
        timestamp: Date.now(),
      });

      setError(`Saved offline — will sync when connected`);
      return offlineAction;
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
      const { error: dbError } = await supabase
        .from('actions')
        .update(data)
        .eq('id', actionId);

      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      await enqueueOperation({
        id: actionId,
        type: 'update',
        payload: { id: actionId, ...data },
        timestamp: Date.now(),
      });
      setError('Update queued — will sync when connected');
    }
  }, []);

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

  // ─── Offline Queue ──────────────────────────────────────────────────────

  async function enqueueOperation(op: QueuedOperation) {
    queueRef.current.push(op);
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queueRef.current));
    } catch {
      console.warn('Failed to persist offline queue');
    }
  }

  const syncOfflineQueue = useCallback(async (): Promise<number> => {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!raw) return 0;

      const queue: QueuedOperation[] = JSON.parse(raw);
      if (queue.length === 0) return 0;

      let synced = 0;

      for (const op of queue) {
        try {
          if (op.type === 'create') {
            const { local_id, ...rest } = op.payload;
            await supabase.from('actions').insert({ ...rest, local_id: op.id });
            synced++;
          } else if (op.type === 'update' || op.type === 'status_change') {
            const { id, ...rest } = op.payload;
            if (id) {
              await supabase.from('actions').update(rest).eq('id', id);
              synced++;
            }
          }
        } catch {
          // Keep failed operations in queue for next attempt
          continue;
        }
      }

      // Clear synced operations
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
      queueRef.current = [];

      // Refresh data from server
      await fetchActions();
      await fetchStats();

      return synced;
    } catch {
      return 0;
    }
  }, [fetchActions, fetchStats]);

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
    syncOfflineQueue,
    refetch,
  };
}
