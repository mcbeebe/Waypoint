/**
 * Insurance tracker hook (5.3 slim v1) — CRUD for authorization records.
 *
 * When an authorization has an end_date, a linked `authorization_expiry`
 * deadline is created/updated in the deadlines system (F9) so the family
 * gets renewal reminders (21/14/7/1 days out) without any extra setup.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { InsuranceAuthorization, AuthorizationStatus } from '@/types/database';

export interface AuthorizationInput {
  service: string;
  provider_name?: string;
  authorization_number?: string;
  status: AuthorizationStatus;
  start_date?: string;
  end_date?: string;
  denial_date?: string;
  denial_reason?: string;
  notes?: string;
  child_id?: string | null;
}

/** Days until a date (negative = past). */
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const RENEWAL_REMINDER_DAYS = [21, 14, 7, 1];

export function useInsurance(familyId: string | undefined) {
  const [authorizations, setAuthorizations] = useState<InsuranceAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!familyId) {
      setAuthorizations([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: dbError } = await supabase
        .from('insurance_authorizations')
        .select('*')
        .eq('family_id', familyId)
        .order('end_date', { ascending: true, nullsFirst: false });
      if (dbError) throw new Error(dbError.message);
      setAuthorizations((data as InsuranceAuthorization[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Create/update/complete the linked renewal-reminder deadline. Best-effort. */
  const syncDeadline = useCallback(async (
    auth: InsuranceAuthorization,
    input: AuthorizationInput
  ): Promise<string | null> => {
    if (!familyId) return auth.deadline_id;
    const wantsReminder =
      !!input.end_date && (input.status === 'active' || input.status === 'pending');
    try {
      if (wantsReminder) {
        const title = `${input.service} authorization expires`;
        if (auth.deadline_id) {
          await supabase
            .from('deadlines')
            .update({ title, due_date: input.end_date, status: 'upcoming' })
            .eq('id', auth.deadline_id);
          return auth.deadline_id;
        }
        const { data } = await supabase
          .from('deadlines')
          .insert({
            family_id: familyId,
            child_id: input.child_id ?? null,
            title,
            deadline_type: 'authorization_expiry',
            due_date: input.end_date,
            reminder_days: RENEWAL_REMINDER_DAYS,
            notes: input.provider_name ? `Provider: ${input.provider_name}` : null,
          })
          .select('id')
          .single();
        return (data?.id as string) ?? null;
      }
      // No reminder wanted (denied/expired/no end date) — retire an existing one
      if (auth.deadline_id) {
        await supabase.from('deadlines').update({ status: 'completed' }).eq('id', auth.deadline_id);
      }
      return auth.deadline_id;
    } catch {
      return auth.deadline_id;
    }
  }, [familyId]);

  const toRow = (input: AuthorizationInput) => ({
    service: input.service.trim(),
    provider_name: input.provider_name?.trim() || null,
    authorization_number: input.authorization_number?.trim() || null,
    status: input.status,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    denial_date: input.denial_date || null,
    denial_reason: input.denial_reason?.trim() || null,
    notes: input.notes?.trim() || null,
    child_id: input.child_id ?? null,
  });

  const addAuthorization = useCallback(async (input: AuthorizationInput): Promise<boolean> => {
    if (!familyId) return false;
    try {
      const { data, error: dbError } = await supabase
        .from('insurance_authorizations')
        .insert({ family_id: familyId, ...toRow(input) })
        .select()
        .single();
      if (dbError) throw new Error(dbError.message);
      let created = data as InsuranceAuthorization;
      const deadlineId = await syncDeadline(created, input);
      if (deadlineId && deadlineId !== created.deadline_id) {
        await supabase
          .from('insurance_authorizations')
          .update({ deadline_id: deadlineId })
          .eq('id', created.id);
        created = { ...created, deadline_id: deadlineId };
      }
      setAuthorizations((prev) => [...prev, created]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [familyId, syncDeadline]);

  const updateAuthorization = useCallback(async (
    id: string,
    input: AuthorizationInput
  ): Promise<boolean> => {
    const existing = authorizations.find((a) => a.id === id);
    if (!existing) return false;
    try {
      const deadlineId = await syncDeadline(existing, input);
      const patch = { ...toRow(input), deadline_id: deadlineId };
      const { error: dbError } = await supabase
        .from('insurance_authorizations')
        .update(patch)
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
      setAuthorizations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [authorizations, syncDeadline]);

  const deleteAuthorization = useCallback(async (id: string): Promise<boolean> => {
    const existing = authorizations.find((a) => a.id === id);
    try {
      if (existing?.deadline_id) {
        await supabase.from('deadlines').update({ status: 'completed' }).eq('id', existing.deadline_id);
      }
      const { error: dbError } = await supabase
        .from('insurance_authorizations')
        .delete()
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
      setAuthorizations((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [authorizations]);

  return { authorizations, loading, error, refetch, addAuthorization, updateAuthorization, deleteAuthorization };
}
