/**
 * Communication log hook (roadmap 3.3) — the family's paper trail.
 * Letters auto-log on copy/open; calls, meetings, and notes are manual.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';
import { forgetSessionRead, hasSessionRead, noteSessionRead, withSessionReads } from '@/lib/sessionReads';

export { resetSessionReads } from '@/lib/sessionReads';

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
  /**
   * When the family opened this incoming reply (062); null = unread. ABSENT
   * (not null) on a database where 062 has not been applied — see
   * `isUnreadReply` in lib/replyInbox.ts.
   */
  read_at?: string | null;
  /**
   * Who else was on the email, as plain addresses (064): the chosen Cc on an
   * outgoing row; everyone but the family and the sender on a synced reply.
   * Null = none recorded. ABSENT on a database where 064 is not applied.
   */
  cc?: string[] | null;
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

/** What happened to an in-place revision — see updateCommunicationDraft. */
export type DraftUpdateResult =
  /** The draft row now holds the revision. */
  | 'updated'
  /** No draft row to revise: it was sent, belongs to a Gmail draft, or is gone. */
  | 'not_draft'
  /** The request failed — nothing is known about the row. */
  | 'error';

/**
 * Revise a letter that is still a DRAFT in place — one letter, one row.
 * Logging each revision as a new row left the pre-edit text behind as an
 * unsent draft, which Home then surfaced as "Finish the letter you started"
 * for a letter the parent had already sent.
 *
 * Only a plain draft is rewritten: never a sent row, and never one tied to a
 * Gmail thread (a draft saved to the parent's Gmail Drafts has its own life
 * there — rewriting the row would orphan it). `error` is kept apart from
 * `not_draft` so a network blip is treated as a failed save, not as licence
 * to log a second row beside the first.
 */
export async function updateCommunicationDraft(
  id: string,
  fields: Pick<NewCommunication, 'subject' | 'body' | 'contact' | 'organization'>
): Promise<DraftUpdateResult> {
  try {
    const { data, error } = await supabase
      .from('communications')
      .update({
        subject: fields.subject,
        body: fields.body ?? null,
        contact: fields.contact ?? null,
        organization: fields.organization ?? null,
      })
      .eq('id', id)
      .eq('status', 'draft')
      .is('gmail_thread_id', null)
      .select('id');
    if (error) return 'error';
    return (data?.length ?? 0) > 0 ? 'updated' : 'not_draft';
  } catch {
    return 'error';
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

/**
 * Record who a letter copied (064) on its paper-trail row. The Gmail path
 * stores it server-side; this covers the mail-app hand-off, where the row is
 * marked sent from the app. Best-effort and never throws: a database without
 * 064 returns false and the letter's row is untouched.
 */
export async function recordCommunicationCc(id: string, cc: readonly string[]): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('communications')
      // Lowercased, the convention the gmail function and the sync store in.
      .update({ cc: cc.length > 0 ? cc.map((e) => e.trim().toLowerCase()) : null })
      .eq('id', id)
      .select('id');
    if (error) return false;
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Stamp a synced reply as opened (062). Only the first open counts, so a
 * re-open never moves the time. Returns true only when a row was actually
 * stamped — false for a failed request, a row already read, a row RLS hides,
 * or a database where 062 is not applied yet (where the app keeps read state
 * off entirely: see `isUnreadReply` in lib/replyInbox.ts).
 */
export async function markReplyRead(id: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('communications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('direction', 'incoming')
      .is('read_at', null)
      .select('id');
    return !error && (data?.length ?? 0) > 0;
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
      setCommunications(withSessionReads((data as Communication[]) ?? []));
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

  /**
   * Record that the family opened a reply — optimistic, so the unread dot and
   * the Home strip clear at once; a failed write leaves it unread on the
   * next load (lib/sessionReads.ts). A no-op for anything already read, and on a pre-062
   * database (no `read_at` key), where there is no read state to change.
   */
  const markRead = useCallback(async (id: string): Promise<boolean> => {
    const target = communications.find((c) => c.id === id);
    // The session record also catches a second call before React re-renders
    // (a tap and the hand-off effect in the same tick).
    if (
      !target || target.direction !== 'incoming' || !('read_at' in target) ||
      target.read_at || hasSessionRead(id)
    ) {
      return false;
    }
    const now = new Date().toISOString();
    noteSessionRead(id, now);
    setCommunications((prev) => prev.map((c) => (c.id === id ? { ...c, read_at: now } : c)));
    const ok = await markReplyRead(id);
    // A write that did not land is not remembered: the next load shows the
    // reply as new again rather than hiding it for the rest of the session.
    if (!ok) forgetSessionRead(id);
    return ok;
  }, [communications]);

  return {
    communications,
    loading,
    error,
    refetch,
    addCommunication,
    deleteCommunication,
    markSent,
    markRead,
  };
}
