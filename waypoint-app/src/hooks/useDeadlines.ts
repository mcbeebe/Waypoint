/**
 * Deadlines hook — CRUD for deadline tracking
 * Uses existing `deadlines` table from migration 001
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Deadline, DeadlineType, DeadlineStatus } from '@/types/database';

interface UseDeadlinesOptions {
  familyId: string;
  statusFilter?: DeadlineStatus[];
}

interface CreateDeadlineInput {
  title: string;
  deadline_type: DeadlineType;
  due_date: string;
  child_id?: string;
  reminder_days?: number[];
  notes?: string;
}

export function useDeadlines(options: UseDeadlinesOptions) {
  const { familyId, statusFilter } = options;

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    try {
      let query = supabase
        .from('deadlines')
        .select('*')
        .eq('family_id', familyId)
        .order('due_date', { ascending: true });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setDeadlines((data as Deadline[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [familyId, statusFilter]);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    fetchDeadlines().finally(() => setLoading(false));
  }, [familyId, fetchDeadlines]);

  const createDeadline = useCallback(async (data: CreateDeadlineInput): Promise<Deadline | null> => {
    setError(null);
    try {
      const { data: created, error: dbError } = await supabase
        .from('deadlines')
        .insert({
          family_id: familyId,
          title: data.title,
          deadline_type: data.deadline_type,
          due_date: data.due_date,
          child_id: data.child_id ?? null,
          reminder_days: data.reminder_days ?? [30, 14, 7, 1],
          notes: data.notes ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const deadline = created as Deadline;
      setDeadlines((prev) => [...prev, deadline].sort(
        (a, b) => a.due_date.localeCompare(b.due_date)
      ));
      return deadline;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [familyId]);

  const updateDeadline = useCallback(async (id: string, data: Partial<Deadline>) => {
    setError(null);
    setDeadlines((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    try {
      const { error: dbError } = await supabase
        .from('deadlines')
        .update(data)
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchDeadlines();
    }
  }, [fetchDeadlines]);

  const markComplete = useCallback(async (id: string) => {
    await updateDeadline(id, { status: 'completed' as DeadlineStatus });
  }, [updateDeadline]);

  /** Auto-compute overdue statuses */
  const refreshStatuses = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const overdue = deadlines.filter(
      (d) => d.status !== 'completed' && d.due_date < today
    );
    for (const d of overdue) {
      if (d.status !== 'overdue') {
        await updateDeadline(d.id, { status: 'overdue' as DeadlineStatus });
      }
    }
  }, [deadlines, updateDeadline]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchDeadlines();
    setLoading(false);
  }, [fetchDeadlines]);

  return { deadlines, loading, error, createDeadline, updateDeadline, markComplete, refreshStatuses, refetch };
}
