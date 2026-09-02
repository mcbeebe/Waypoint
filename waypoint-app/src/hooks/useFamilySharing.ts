/**
 * Family sharing hook — invite co-parents, manage members, activity feed
 * Phase 6: Sprints S48, S51, S52
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';
import { sendFamilyInvite } from '@/lib/familyInvite';
import { isValidInviteEmail } from '@/lib/inviteDelivery';
import type { SendResult } from '@/lib/familyInvite';
import type {
  FamilyMember,
  FamilyMemberRole,
  FamilyInvitation,
  ActivityLogEntry,
  ActivityActionType,
} from '@/types/database';

interface UseFamilySharingOptions {
  familyId: string;
}

interface UseFamilySharingReturn {
  members: FamilyMember[];
  invitations: FamilyInvitation[];
  activityLog: ActivityLogEntry[];
  loading: boolean;
  error: string | null;
  currentUserRole: FamilyMemberRole | null;
  /** Saves the invite, then emails the join link; the returned row's sent_at / send_error say whether the email went. */
  inviteMember: (email: string, role?: FamilyMemberRole) => Promise<FamilyInvitation | null>;
  /** Email the join link again. The result says exactly what happened (sent / already sent a moment ago / why not). */
  resendInvitation: (invitationId: string) => Promise<SendResult>;
  updateMemberRole: (memberId: string, role: FamilyMemberRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  /** Resolves true only when the row is actually gone — a revoked link is a security event. */
  revokeInvitation: (invitationId: string) => Promise<boolean>;
  logActivity: (action: ActivityActionType, description: string, entityType?: string, entityId?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useFamilySharing(options: UseFamilySharingOptions): UseFamilySharingReturn {
  const { familyId } = options;

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<FamilyMemberRole | null>(null);

  const fetchAll = useCallback(async () => {
    if (!familyId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [membersRes, invitesRes, activityRes] = await Promise.all([
        supabase.from('family_members').select('*').eq('family_id', familyId).order('joined_at'),
        supabase.from('family_invitations').select('*').eq('family_id', familyId).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('activity_log').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(50),
      ]);

      if (membersRes.error) throw new Error(membersRes.error.message);
      setMembers((membersRes.data as FamilyMember[]) ?? []);
      setInvitations((invitesRes.data as FamilyInvitation[]) ?? []);
      setActivityLog((activityRes.data as ActivityLogEntry[]) ?? []);

      if (user) {
        const myMembership = (membersRes.data as FamilyMember[])?.find((m) => m.user_id === user.id);
        if (myMembership) {
          setCurrentUserRole(myMembership.role);
        } else {
          // The family owner may predate membership rows (or the backfill) —
          // they are always an admin of their own family.
          const { data: fam } = await supabase
            .from('families')
            .select('user_id')
            .eq('id', familyId)
            .maybeSingle();
          setCurrentUserRole(fam?.user_id === user.id ? 'admin' : null);
        }
      }
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't update family sharing."));
    }
  }, [familyId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const inviteMember = useCallback(async (
    email: string,
    role: FamilyMemberRole = 'member'
  ): Promise<FamilyInvitation | null> => {
    setError(null);
    try {
      const address = email.trim().toLowerCase();
      // One plain address — the accept RPC compares it verbatim, so a list or
      // "Name <x@y>" could never be redeemed (057 also enforces this in the DB).
      if (!isValidInviteEmail(address)) throw new Error('Please enter one email address, like name@example.com.');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('family_invitations')
        .insert({
          family_id: familyId,
          inviter_id: user.id,
          invitee_email: address,
          role,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(
          /too_many_pending_invitations/.test(dbError.message)
            ? 'This family already has 20 invitations waiting — revoke some before adding more.'
            : dbError.message
        );
      }
      let invitation = created as FamilyInvitation;

      // The row is saved regardless; now try to deliver it. The outcome is
      // stored in the SAME shape the server writes (`code` or `code:reason`),
      // so the card reads identically after a refresh.
      const sent = await sendFamilyInvite(invitation.id);
      invitation = sent.ok
        ? { ...invitation, sent_at: sent.sentAt ?? invitation.sent_at ?? null, send_error: null }
        : { ...invitation, send_error: sent.reason ? `${sent.code}:${sent.reason}` : sent.code };

      setInvitations((prev) => [invitation, ...prev]);
      return invitation;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't update family sharing."));
      return null;
    }
  }, [familyId]);

  const resendInvitation = useCallback(async (invitationId: string): Promise<SendResult> => {
    setError(null);
    const sent = await sendFamilyInvite(invitationId);
    setInvitations((prev) =>
      prev.map((i) =>
        i.id === invitationId
          ? sent.ok
            ? { ...i, sent_at: sent.sentAt ?? i.sent_at, send_error: null }
            : { ...i, send_error: sent.reason ? `${sent.code}:${sent.reason}` : sent.code }
          : i
      )
    );
    return sent;
  }, []);

  const updateMemberRole = useCallback(async (memberId: string, role: FamilyMemberRole) => {
    setError(null);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    try {
      const { error: dbError } = await supabase
        .from('family_members')
        .update({ role })
        .eq('id', memberId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't update family sharing."));
      fetchAll();
    }
  }, [fetchAll]);

  const removeMember = useCallback(async (memberId: string) => {
    setError(null);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    try {
      const { error: dbError } = await supabase.from('family_members').delete().eq('id', memberId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't update family sharing."));
      fetchAll();
    }
  }, [fetchAll]);

  const revokeInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    setError(null);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    try {
      const { error: dbError } = await supabase.from('family_invitations').delete().eq('id', invitationId);
      if (dbError) throw new Error(dbError.message);
      return true;
    } catch (err) {
      // Once B3 makes a token redeemable, a revoke that silently failed is a
      // link that still works for 14 days — so the card comes back and the
      // caller is told.
      setError(friendlyErrorMessage(err, "Couldn't update family sharing."));
      fetchAll();
      return false;
    }
  }, [fetchAll]);

  const logActivity = useCallback(async (
    actionType: ActivityActionType,
    description: string,
    entityType?: string,
    entityId?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const member = members.find((m) => m.user_id === user.id);
      await supabase.from('activity_log').insert({
        family_id: familyId,
        user_id: user.id,
        user_display_name: member?.display_name ?? 'Unknown',
        action_type: actionType,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        description,
      });
    } catch {
      // Activity logging is best-effort
    }
  }, [familyId, members]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  return {
    members, invitations, activityLog, loading, error, currentUserRole,
    inviteMember, resendInvitation, updateMemberRole, removeMember, revokeInvitation, logActivity, refetch,
  };
}
