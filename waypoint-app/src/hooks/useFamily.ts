/**
 * Data hooks for families, children, and diagnoses tables
 * Provides CRUD operations with Supabase and proper TypeScript types
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { retryQuery, friendlyErrorMessage } from '@/lib/netRetry';
import type { Family, Child, Diagnosis } from '@/types/database';

// ─── useFamily ───────────────────────────────────────────────────────────────

interface UseFamilyReturn {
  family: Family | null;
  loading: boolean;
  error: string | null;
  createFamily: (data: Partial<Family>) => Promise<Family | null>;
  updateFamily: (data: Partial<Family>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useFamily(): UseFamilyReturn {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamily = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFamily(null);
        return;
      }

      // Owner path: the family this account created.
      //
      // Every read in this function is retried. `family.id` gates Home's whole
      // fan-out — useActions, useRequests, useTriage, useCommunications,
      // useDeadlines and useAppointments all key off it — so a single dropped
      // packet here does not degrade one card, it blanks the screen a parent
      // opens first.
      const { data: owned, error: fetchError } = await retryQuery<Family | null>(() =>
        supabase.from('families').select('*').eq('user_id', user.id).maybeSingle()
      );

      if (fetchError) {
        // Never the raw PostgREST string: "TypeError: Load failed" is not a
        // sentence a parent can act on, and netRetry exists to say so.
        setError(friendlyErrorMessage(fetchError, "Couldn't load your family."));
        return;
      }

      if (owned) {
        setFamily(owned);
        return;
      }

      // Co-parent path (Family Sharing, initiative 007): this account was
      // invited into someone else's family and owns none of its own. Resolve
      // the family it's a member of. RLS grants a member SELECT on that families
      // row (migration 053); without this a joined co-parent would land on an
      // empty account, since every downstream hook keys off `family.id`. v1
      // takes the earliest-joined membership — one shared family per co-parent;
      // switching between several is a later feature.
      //
      // This read's error was previously destructured away entirely. That is
      // not a cosmetic omission: a co-parent whose membership lookup blipped
      // fell through to `setFamily(null)` — indistinguishable from "you belong
      // to no family" — and App.tsx's onboarding check reads the same way, so
      // a transient failure could route a joined co-parent into "create your
      // own family". Retried, and a real failure is now reported as a failure
      // rather than silently reinterpreted as absence.
      const { data: membership, error: memberError } = await retryQuery<
        { family_id: string } | null
      >(() =>
        supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true })
          .limit(1)
          .maybeSingle()
      );

      if (memberError) {
        setError(friendlyErrorMessage(memberError, "Couldn't load your family."));
        return;
      }

      if (membership?.family_id) {
        const { data: shared, error: sharedError } = await retryQuery<Family | null>(() =>
          supabase.from('families').select('*').eq('id', membership.family_id).maybeSingle()
        );
        if (sharedError) {
          setError(friendlyErrorMessage(sharedError, "Couldn't load your family."));
          return;
        }
        setFamily(shared ?? null);
        return;
      }

      setFamily(null);
    } catch (err: unknown) {
      setError(friendlyErrorMessage(err, "Couldn't load your family."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamily();
  }, [fetchFamily]);

  const createFamily = useCallback(async (data: Partial<Family>): Promise<Family | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newFamily, error: insertError } = await supabase
        .from('families')
        .insert({ ...data, user_id: user.id })
        .select()
        .single();

      if (insertError) throw insertError;
      setFamily(newFamily);
      return newFamily;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to create family');
      return null;
    }
  }, []);

  const updateFamily = useCallback(async (data: Partial<Family>): Promise<boolean> => {
    try {
      if (!family?.id) throw new Error('No family record');

      const { error: updateError } = await supabase
        .from('families')
        .update(data)
        .eq('id', family.id);

      if (updateError) throw updateError;

      setFamily(prev => prev ? { ...prev, ...data } : null);
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update family');
      return false;
    }
  }, [family?.id]);

  return { family, loading, error, createFamily, updateFamily, refetch: fetchFamily };
}

// ─── useChildren ─────────────────────────────────────────────────────────────

interface UseChildrenReturn {
  children: Child[];
  loading: boolean;
  error: string | null;
  addChild: (data: Partial<Child>) => Promise<Child | null>;
  updateChild: (childId: string, data: Partial<Child>) => Promise<boolean>;
  deleteChild: (childId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useChildren(familyId: string | undefined): UseChildrenReturn {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!familyId) {
      setChildren([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', familyId)
        .order('is_primary', { ascending: false });

      if (fetchError) throw fetchError;
      setChildren(data || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to fetch children');
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const addChild = useCallback(async (data: Partial<Child>): Promise<Child | null> => {
    try {
      if (!familyId) throw new Error('No family record');

      const { data: newChild, error: insertError } = await supabase
        .from('children')
        .insert({ ...data, family_id: familyId })
        .select()
        .single();

      if (insertError) throw insertError;
      setChildren(prev => [...prev, newChild]);
      return newChild;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to add child');
      return null;
    }
  }, [familyId]);

  const updateChild = useCallback(async (childId: string, data: Partial<Child>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('children')
        .update(data)
        .eq('id', childId);

      if (updateError) throw updateError;
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, ...data } : c));
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update child');
      return false;
    }
  }, []);

  const deleteChild = useCallback(async (childId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      if (deleteError) throw deleteError;
      setChildren(prev => prev.filter(c => c.id !== childId));
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to delete child');
      return false;
    }
  }, []);

  return { children, loading, error, addChild, updateChild, deleteChild, refetch: fetchChildren };
}

// ─── useDiagnoses ────────────────────────────────────────────────────────────

interface UseDiagnosesReturn {
  diagnoses: Diagnosis[];
  loading: boolean;
  error: string | null;
  setDiagnoses: (childId: string, names: string[]) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useDiagnoses(childId: string | undefined): UseDiagnosesReturn {
  const [diagnoses, setDiagnosesState] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnoses = useCallback(async () => {
    if (!childId) {
      setDiagnosesState([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('child_id', childId);

      if (fetchError) throw fetchError;
      setDiagnosesState(data || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to fetch diagnoses');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  /**
   * Replace all diagnoses for a child with a new set.
   * Deletes existing and inserts new rows.
   */
  const setDiagnosesForChild = useCallback(async (
    targetChildId: string,
    names: string[]
  ): Promise<boolean> => {
    try {
      // Delete existing
      const { error: deleteError } = await supabase
        .from('diagnoses')
        .delete()
        .eq('child_id', targetChildId);

      if (deleteError) throw deleteError;

      if (names.length === 0) {
        setDiagnosesState([]);
        return true;
      }

      // Insert new
      const rows = names.map(name => ({ child_id: targetChildId, name }));
      const { data, error: insertError } = await supabase
        .from('diagnoses')
        .insert(rows)
        .select();

      if (insertError) throw insertError;
      setDiagnosesState(data || []);
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to update diagnoses');
      return false;
    }
  }, []);

  return {
    diagnoses,
    loading,
    error,
    setDiagnoses: setDiagnosesForChild,
    refetch: fetchDiagnoses,
  };
}
