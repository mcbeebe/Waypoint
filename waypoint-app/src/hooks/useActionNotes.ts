/**
 * Action notes hook — the running log a parent keeps on one action.
 *
 * Notes are the "what actually happened" layer: left a voicemail, SC asked
 * for it by email instead, packet mailed. Kept separate from the action's
 * description (which the AI wrote) so a parent's own record is never
 * overwritten when an action is regenerated or edited.
 *
 * Degrades quietly when migration 034 hasn't been applied yet: the table
 * simply reads as empty and `supported` goes false so the UI can explain
 * itself instead of showing a broken input.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';

export interface ActionNote {
  id: string;
  action_id: string;
  family_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** True when the failure is "migration 034 hasn't run", not a real error. */
function isMissingTable(err: unknown): boolean {
  const message =
    typeof err === 'string' ? err : ((err as any)?.message ?? '') + ' ' + ((err as any)?.code ?? '');
  return /action_notes|42P01|does not exist|schema cache|could not find/i.test(message);
}

interface UseActionNotesReturn {
  notes: ActionNote[];
  loading: boolean;
  error: string | null;
  /** False when the notes table isn't there yet (migration 034 pending). */
  supported: boolean;
  addNote: (body: string) => Promise<boolean>;
  updateNote: (noteId: string, body: string) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useActionNotes(
  actionId: string | undefined,
  familyId: string | undefined
): UseActionNotesReturn {
  const [notes, setNotes] = useState<ActionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const refetch = useCallback(async () => {
    if (!actionId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: dbError } = await supabase
        .from('action_notes')
        .select('*')
        .eq('action_id', actionId)
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      setNotes((data as ActionNote[]) ?? []);
      setSupported(true);
      setError(null);
    } catch (err) {
      if (isMissingTable(err)) {
        setSupported(false);
        setNotes([]);
        setError(null);
      } else {
        setError(friendlyErrorMessage(err, "Couldn't load your notes."));
      }
    } finally {
      setLoading(false);
    }
  }, [actionId]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  const addNote = useCallback(
    async (body: string): Promise<boolean> => {
      const trimmed = body.trim();
      if (!trimmed || !actionId || !familyId) return false;
      try {
        const { data, error: dbError } = await supabase
          .from('action_notes')
          .insert({ action_id: actionId, family_id: familyId, body: trimmed })
          .select()
          .single();

        if (dbError) throw dbError;
        setNotes((prev) => [...prev, data as ActionNote]);
        setError(null);
        return true;
      } catch (err) {
        if (isMissingTable(err)) {
          setSupported(false);
          setError(null);
        } else {
          setError(friendlyErrorMessage(err, "Couldn't save that note."));
        }
        return false;
      }
    },
    [actionId, familyId]
  );

  const updateNote = useCallback(
    async (noteId: string, body: string): Promise<boolean> => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      const previous = notes;
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, body: trimmed } : n)));
      try {
        const { error: dbError } = await supabase
          .from('action_notes')
          .update({ body: trimmed })
          .eq('id', noteId);
        if (dbError) throw dbError;
        setError(null);
        return true;
      } catch (err) {
        setNotes(previous);
        setError(friendlyErrorMessage(err, "Couldn't update that note."));
        return false;
      }
    },
    [notes]
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      const previous = notes;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      try {
        const { error: dbError } = await supabase.from('action_notes').delete().eq('id', noteId);
        if (dbError) throw dbError;
        setError(null);
        return true;
      } catch (err) {
        setNotes(previous);
        setError(friendlyErrorMessage(err, "Couldn't delete that note."));
        return false;
      }
    },
    [notes]
  );

  return { notes, loading, error, supported, addNote, updateNote, deleteNote, refetch };
}
