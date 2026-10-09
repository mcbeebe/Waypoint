/**
 * Family request tracker hook (PRD W-G: G4) — CRUD over family_requests
 * (migration 037). Honest failures: errors surface, nothing pretends to
 * save.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RequestType } from '@/lib/requestClocks';
import { localDayISO } from '@/lib/dateOnly';

export interface FamilyRequest {
  id: string;
  family_id: string;
  child_id: string | null;
  request_type: RequestType;
  title: string;
  requested_on: string;
  /**
   * Day of Regional Center intake (066) — the RC assessment clock runs from
   * it (W&I §4643). Null until logged, or undefined before 066 is applied.
   */
  intake_on?: string | null;
  channel: string | null;
  status: 'requested' | 'in_progress' | 'granted' | 'denied' | 'withdrawn';
  decided_on: string | null;
  notes: string | null;
  /** Paper-trail entry this request was opened from (045); null if hand-tracked */
  communication_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateRequestInput {
  request_type: RequestType;
  title: string;
  requested_on: string;
  /** Only sent when the family entered one, so a pre-066 database still saves. */
  intake_on?: string | null;
  child_id?: string | null;
  channel?: string | null;
  notes?: string | null;
  communication_id?: string | null;
}

export function useRequests(familyId: string | undefined) {
  const [requests, setRequests] = useState<FamilyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!familyId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('family_requests')
      .select('*')
      .eq('family_id', familyId)
      .order('requested_on', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRequests((data ?? []) as FamilyRequest[]);
    }
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = useCallback(
    async (input: CreateRequestInput): Promise<FamilyRequest | null> => {
      if (!familyId) return null;
      setError(null);
      const { intake_on: intakeOn, ...rest } = input;
      const row = intakeOn ? { ...rest, intake_on: intakeOn } : rest;
      let { data, error: insertError } = await supabase
        .from('family_requests')
        .insert({ ...row, family_id: familyId })
        .select()
        .single();
      // Pre-migration-045 resilience: if the letter link column doesn't
      // exist yet, tracking the request still must succeed — retry bare.
      if (insertError && input.communication_id && /communication_id/.test(insertError.message)) {
        const { communication_id: _dropped, ...bare } = row;
        void _dropped;
        ({ data, error: insertError } = await supabase
          .from('family_requests')
          .insert({ ...bare, family_id: familyId })
          .select()
          .single());
      }
      if (insertError) {
        setError(insertError.message);
        return null;
      }
      const created = data as FamilyRequest;
      setRequests((prev) => [created, ...prev]);
      return created;
    },
    [familyId]
  );

  const updateStatus = useCallback(
    async (id: string, status: FamilyRequest['status']): Promise<boolean> => {
      setError(null);
      const decided = status === 'granted' || status === 'denied';
      const patch: Record<string, unknown> = {
        status,
        // Local day, like requested_on on the same row — an evening decision
        // must not be stamped with a day the family hasn't lived.
        decided_on: decided ? localDayISO(new Date()) : null,
        updated_at: new Date().toISOString(),
      };
      const { error: updateError } = await supabase
        .from('family_requests')
        .update(patch)
        .eq('id', id);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } as FamilyRequest : r))
      );
      return true;
    },
    []
  );

  /**
   * Log (or clear) the day of Regional Center intake. Fails honestly — before
   * migration 066 the column does not exist and nothing pretends to save.
   */
  const updateIntake = useCallback(
    async (id: string, intakeOn: string | null): Promise<boolean> => {
      setError(null);
      const patch = { intake_on: intakeOn, updated_at: new Date().toISOString() };
      const { error: updateError } = await supabase
        .from('family_requests')
        .update(patch)
        .eq('id', id);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return true;
    },
    []
  );

  return { requests, loading, error, createRequest, updateStatus, updateIntake, refetch: fetchRequests };
}
