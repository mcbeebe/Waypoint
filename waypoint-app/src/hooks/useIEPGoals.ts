/**
 * IEP goal tracker hook (roadmap 2.3) — CRUD for tracked goals and
 * parent progress logs, stored in iep_goals / iep_goal_logs (migration 013).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';
import type { IEPGoalRecord, IEPGoalLog } from '@/types/database';

export interface CreateGoalInput {
  domain: string;
  goal_text: string;
  baseline?: string;
  target?: string;
  measurement?: string;
  child_id?: string;
  document_id?: string;
  /** What the IEP analysis found (033) — the part worth bringing to the meeting */
  strength?: string;
  suggested_rewrite?: string;
  issues?: unknown;
  legal_citation?: string;
}

/** How a bulk goal import went, including what the database couldn't keep. */
export interface CreateGoalsResult {
  created: number;
  /** True when 033 is missing: goals saved, rewrites and citations did not. */
  analysisFieldsDropped: boolean;
}

export function useIEPGoals(familyId: string, childId?: string) {
  const [goals, setGoals] = useState<IEPGoalRecord[]>([]);
  const [logsByGoal, setLogsByGoal] = useState<Record<string, IEPGoalLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!familyId) return;
    try {
      let query = supabase
        .from('iep_goals')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });
      if (childId) query = query.eq('child_id', childId);

      const { data: goalRows, error: goalError } = await query;
      if (goalError) throw goalError;
      setGoals((goalRows as IEPGoalRecord[]) ?? []);

      const { data: logRows, error: logError } = await supabase
        .from('iep_goal_logs')
        .select('*')
        .eq('family_id', familyId)
        .order('logged_at', { ascending: true });
      if (logError) throw logError;

      const grouped: Record<string, IEPGoalLog[]> = {};
      for (const log of (logRows as IEPGoalLog[]) ?? []) {
        (grouped[log.goal_id] ??= []).push(log);
      }
      setLogsByGoal(grouped);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your IEP goals."));
    }
  }, [familyId, childId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const createGoal = useCallback(async (input: CreateGoalInput): Promise<IEPGoalRecord | null> => {
    try {
      const { data, error: dbError } = await supabase
        .from('iep_goals')
        .insert({ ...input, family_id: familyId })
        .select()
        .single();
      if (dbError) throw dbError;
      const goal = data as IEPGoalRecord;
      setGoals(prev => [...prev, goal]);
      return goal;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your IEP goals."));
      return null;
    }
  }, [familyId]);

  /**
   * Bulk-import goals (e.g. from an AI IEP analysis).
   *
   * Reports whether the analysis fields survived: pre-033 the goals still
   * save, but without the suggested rewrite and the citation behind it —
   * which are most of the reason to save a goal at all. The caller says so
   * rather than letting the parent discover it at the IEP meeting.
   */
  const createGoals = useCallback(async (inputs: CreateGoalInput[]): Promise<CreateGoalsResult> => {
    if (inputs.length === 0) return { created: 0, analysisFieldsDropped: false };
    try {
      const rows = inputs.map(g => ({ ...g, family_id: familyId }));
      let { data, error: dbError } = await supabase.from('iep_goals').insert(rows).select();
      let analysisFieldsDropped = false;

      // Pre-033 database: save the goals without the analysis fields rather
      // than losing them entirely
      if (dbError && /strength|suggested_rewrite|issues|legal_citation/i.test(dbError.message)) {
        const stripped = rows.map(({ strength, suggested_rewrite, issues, legal_citation, ...rest }) => rest);
        ({ data, error: dbError } = await supabase.from('iep_goals').insert(stripped).select());
        analysisFieldsDropped = !dbError;
      }
      if (dbError) throw dbError;
      const created = (data as IEPGoalRecord[]) ?? [];
      setGoals(prev => [...prev, ...created]);
      return { created: created.length, analysisFieldsDropped };
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your IEP goals."));
      return { created: 0, analysisFieldsDropped: false };
    }
  }, [familyId]);

  const updateGoalStatus = useCallback(async (goalId: string, status: IEPGoalRecord['status']) => {
    setGoals(prev => prev.map(g => (g.id === goalId ? { ...g, status } : g)));
    const { error: dbError } = await supabase.from('iep_goals').update({ status }).eq('id', goalId);
    if (dbError) {
      setError(dbError.message);
      fetchAll();
    }
  }, [fetchAll]);

  const addLog = useCallback(async (
    goalId: string,
    note: string,
    progressPct?: number
  ): Promise<boolean> => {
    try {
      const { data, error: dbError } = await supabase
        .from('iep_goal_logs')
        .insert({
          goal_id: goalId,
          family_id: familyId,
          note,
          progress_pct: progressPct ?? null,
        })
        .select()
        .single();
      if (dbError) throw dbError;
      const log = data as IEPGoalLog;
      setLogsByGoal(prev => ({ ...prev, [goalId]: [...(prev[goalId] ?? []), log] }));
      return true;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your IEP goals."));
      return false;
    }
  }, [familyId]);

  /** Latest logged progress percentage for a goal (null if never logged) */
  const latestProgress = useCallback((goalId: string): number | null => {
    const logs = logsByGoal[goalId] ?? [];
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].progress_pct != null) return logs[i].progress_pct;
    }
    return null;
  }, [logsByGoal]);

  return {
    goals,
    logsByGoal,
    loading,
    error,
    createGoal,
    createGoals,
    updateGoalStatus,
    addLog,
    latestProgress,
    refetch: fetchAll,
  };
}
