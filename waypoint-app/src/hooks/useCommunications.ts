/**
 * Communication log hook (roadmap 3.3) — the family's paper trail.
 * Letters auto-log on copy/open; calls, meetings, and notes are manual.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';

export type CommunicationKind = 'letter' | 'email' | 'call' | 'meeting' | 'note';
/** Written but not confirmed sent, vs confirmed out the door (032) */
export type CommunicationStatus = 'draft' | 'sent';
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
  status: CommunicationStatus;
  sent_at: string | null;
  occurred_at: string;
  /** Gmail thread/message ids when sent or synced via the connected account (046) */
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
  /** The tracked family_request this entry serves (047); null = unattached */
  request_id: string | null;
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
  /** Defaults to 'sent' — calls and meetings already happened. Drafts pass 'draft'. */
  status?: CommunicationStatus;
  /** Attach this entry to a tracked request (047). */
  request_id?: string | null;
}

/** Strip request_id and retry when the 047 column isn't migrated yet. */
export function isMissingRequestIdColumn(message: string): boolean {
  return /request_id/.test(message) &&
    /does not exist|schema cache|could not find/i.test(message);
}

/**
 * Fire-and-forget auto-log used by Letters and the Navigator email handoff.
 * Never throws — a failed log must not break sending the actual letter.
 */
export async function logCommunication(
  familyId: string,
  entry: NewCommunication
): Promise<string | null> {
  try {
    if (!familyId) return null;
    const status = entry.status ?? 'sent';
    const row = {
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
    };
    const withRequest = entry.request_id ? { ...row, request_id: entry.request_id } : row;
    let { data, error } = await supabase
      .from('communications')
      .insert({ ...withRequest, status, sent_at: status === 'sent' ? new Date().toISOString() : null })
      .select('id')
      .single();

    // Pre-047 database: the request link is best-effort — log without it.
    if (error && entry.request_id && isMissingRequestIdColumn(error.message)) {
      ({ data, error } = await supabase
        .from('communications')
        .insert({ ...row, status, sent_at: status === 'sent' ? new Date().toISOString() : null })
        .select('id')
        .single());
    }

    // Pre-032 database: still record it, just without the draft/sent state
    if (error && /status|sent_at/i.test(error.message) &&
        /does not exist|schema cache|could not find/i.test(error.message)) {
      const { data: fallback } = await supabase
        .from('communications')
        .insert(row)
        .select('id')
        .single();
      return (fallback?.id as string) ?? null;
    }
    return (data?.id as string) ?? null;
  } catch {
    // best-effort
    return null;
  }
}

/**
 * Stamp a logged letter with the tracked request it founded (047), so the
 * case file and the paper trail describe one event. Best-effort: a pre-047
 * database just returns false and the legacy communication_id link carries.
 */
export async function attachCommunicationToRequest(
  communicationId: string,
  requestId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('communications')
      .update({ request_id: requestId })
      .eq('id', communicationId);
    return !error;
  } catch {
    return false;
  }
}

/** Mark a logged draft as actually sent. Returns false if it didn't stick. */
export async function markCommunicationSent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('communications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
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
      setError(friendlyErrorMessage(err, "Couldn't load your paper trail."));
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addCommunication = useCallback(async (entry: NewCommunication): Promise<boolean> => {
    try {
      const row = {
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
      };
      let { data, error: dbError } = await supabase
        .from('communications')
        .insert(entry.request_id ? { ...row, request_id: entry.request_id } : row)
        .select()
        .single();
      // Pre-047 database: keep the entry, drop the link.
      if (dbError && entry.request_id && isMissingRequestIdColumn(dbError.message)) {
        ({ data, error: dbError } = await supabase
          .from('communications')
          .insert(row)
          .select()
          .single());
      }
      if (dbError) throw new Error(dbError.message);
      setCommunications((prev) => [data as Communication, ...prev].sort(
        (a, b) => b.occurred_at.localeCompare(a.occurred_at)
      ));
      return true;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your paper trail."));
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

  /** Confirm a draft went out — optimistic, reverts if the write fails. */
  const markSent = useCallback(async (id: string): Promise<boolean> => {
    const now = new Date().toISOString();
    setCommunications((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'sent' as CommunicationStatus, sent_at: now } : c))
    );
    const ok = await markCommunicationSent(id);
    if (!ok) refetch();
    return ok;
  }, [refetch]);

  return {
    communications,
    loading,
    error,
    refetch,
    addCommunication,
    deleteCommunication,
    markSent,
  };
}
