/**
 * Family request tracker hook (PRD W-G: G4) — CRUD over family_requests
 * (migration 037). Honest failures: errors surface, nothing pretends to
 * save.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RequestType } from '@/lib/requestClocks';

export interface FamilyRequest {
  id: string;
  family_id: string;
  child_id: string | null;
  request_type: RequestType;
  title: string;
  requested_on: string;
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
      let { data, error: insertError } = await supabase
        .from('family_requests')
        .insert({ ...input, family_id: familyId })
        .select()
        .single();
      // Pre-migration-045 resilience: if the letter link column doesn't
      // exist yet, tracking the request still must succeed — retry bare.
      if (insertError && input.communication_id && /communication_id/.test(insertError.message)) {
        const { communication_id: _dropped, ...bare } = input;
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
        decided_on: decided ? new Date().toISOString().slice(0, 10) : null,
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

  return { requests, loading, error, createRequest, updateStatus, refetch: fetchRequests };
}
