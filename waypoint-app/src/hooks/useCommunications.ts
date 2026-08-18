/**
 * Communication log hook (roadmap 3.3) — the family's paper trail.
 * Letters auto-log on copy/open; calls, meetings, and notes are manual.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type CommunicationKind = 'letter' | 'email' | 'call' | 'meeting' | 'note';
export type CommunicationOrg = 'regional_center' | 'school' | 'insurance' | 'medical' | 'other';

export interface Communication {
  id: string;
  family_id: string;
  child_id: string | null;
  kind: CommunicationKind;
  direction: 'outgoing' | 'incoming';
  contact: string | null;
  organization: CommunicationOrg | null;
  subject: string;
  body: string | null;
  template_key: string | null;
  occurred_at: string;
  created_at: string;
}

export interface NewCommunication {
  kind: CommunicationKind;
  subject: string;
  direction?: 'outgoing' | 'incoming';
  contact?: string;
  organization?: CommunicationOrg;
  body?: string;
  template_key?: string;
  occurred_at?: string;
  child_id?: string | null;
}

/**
 * Fire-and-forget auto-log used by Letters and the Navigator email handoff.
 * Never throws — a failed log must not break sending the actual letter.
 */
export async function logCommunication(familyId: string, entry: NewCommunication): Promise<void> {
  try {
    if (!familyId) return;
    await supabase.from('communications').insert({
      family_id: familyId,
      kind: entry.kind,
      direction: entry.direction ?? 'outgoing',
      contact: entry.contact ?? null,
      organization: entry.organization ?? null,
      subject: entry.subject,
      body: entry.body ?? null,
      template_key: entry.template_key ?? null,
      occurred_at: entry.occurred_at ?? new Date().toISOString(),
      child_id: entry.child_id ?? null,
    });
  } catch {
    // best-effort
  }
}

export function useCommunications(familyId: string) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!familyId) {
      setCommunications([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: dbError } = await supabase
        .from('communications')
        .select('*')
        .eq('family_id', familyId)
        .order('occurred_at', { ascending: false })
        .limit(200);
      if (dbError) throw new Error(dbError.message);
      setCommunications((data as Communication[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addCommunication = useCallback(async (entry: NewCommunication): Promise<boolean> => {
    try {
      const { data, error: dbError } = await supabase
        .from('communications')
        .insert({
          family_id: familyId,
          kind: entry.kind,
          direction: entry.direction ?? 'outgoing',
          contact: entry.contact ?? null,
          organization: entry.organization ?? null,
          subject: entry.subject,
          body: entry.body ?? null,
          template_key: entry.template_key ?? null,
          occurred_at: entry.occurred_at ?? new Date().toISOString(),
          child_id: entry.child_id ?? null,
        })
        .select()
        .single();
      if (dbError) throw new Error(dbError.message);
      setCommunications((prev) => [data as Communication, ...prev].sort(
        (a, b) => b.occurred_at.localeCompare(a.occurred_at)
      ));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [familyId]);

  const deleteCommunication = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase.from('communications').delete().eq('id', id);
      if (dbError) throw new Error(dbError.message);
      setCommunications((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { communications, loading, error, refetch, addCommunication, deleteCommunication };
}
