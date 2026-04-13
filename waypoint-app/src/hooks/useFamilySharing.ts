/**
 * Family sharing hook — invite co-parents, manage members, activity feed
 * Phase 6: Sprints S48, S51, S52
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
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
  inviteMember: (email: string, role?: FamilyMemberRole) => Promise<FamilyInvitation | null>;
  updateMemberRole: (memberId: string, role: FamilyMemberRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  revokeInvitation: (invitationId: string) => Promise<void>;
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
        setCurrentUserRole(myMembership?.role ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('family_invitations')
        .insert({
          family_id: familyId,
          inviter_id: user.id,
          invitee_email: email,
          role,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const invitation = created as FamilyInvitation;
      setInvitations((prev) => [invitation, ...prev]);
      return invitation;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [familyId]);

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
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
      fetchAll();
    }
  }, [fetchAll]);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    setError(null);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    try {
      const { error: dbError } = await supabase.from('family_invitations').delete().eq('id', invitationId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchAll();
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
    inviteMember, updateMemberRole, removeMember, revokeInvitation, logActivity, refetch,
  };
}
