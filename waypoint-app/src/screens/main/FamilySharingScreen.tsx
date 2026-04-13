/**
 * Family Sharing screen — Invite co-parents, manage members, activity feed
 * Phase 6: Sprints S49, S51, S52
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useFamilySharing } from '@/hooks/useFamilySharing';
import { useToast } from '@/components/Toast';
import type { FamilyMember, FamilyMemberRole, ActivityLogEntry } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const ROLE_CONFIG: Record<FamilyMemberRole, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#7C3AED' },
  member: { label: 'Member', color: colors.teal },
  viewer: { label: 'Viewer', color: '#64748B' },
};

type ViewMode = 'members' | 'activity';

export default function FamilySharingScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';
  const { showToast } = useToast();

  const {
    members, invitations, activityLog, loading, currentUserRole,
    inviteMember, updateMemberRole, removeMember, revokeInvitation, refetch,
  } = useFamilySharing({ familyId });

  const [viewMode, setViewMode] = useState<ViewMode>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<FamilyMemberRole>('member');
  const [isSending, setIsSending] = useState(false);

  const isAdmin = currentUserRole === 'admin';

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    const result = await inviteMember(inviteEmail.trim(), inviteRole);
    if (result) {
      showToast('Invitation sent!', 'success');
      setShowInviteModal(false);
      setInviteEmail('');
    } else {
      showToast('Failed to send invitation', 'error');
    }
    setIsSending(false);
  }, [inviteEmail, inviteRole, inviteMember, showToast]);

  const handleRemoveMember = useCallback((member: FamilyMember) => {
    Alert.alert('Remove Member', `Remove ${member.display_name} from your family?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeMember(member.id); showToast('Member removed', 'success'); } },
    ]);
  }, [removeMember, showToast]);

  const handleChangeRole = useCallback((member: FamilyMember) => {
    const roles: FamilyMemberRole[] = ['admin', 'member', 'viewer'];
    Alert.alert('Change Role', `Current: ${ROLE_CONFIG[member.role].label}`, [
      ...roles.filter((r) => r !== member.role).map((r) => ({
        text: ROLE_CONFIG[r].label,
        onPress: () => { updateMemberRole(member.id, r); showToast('Role updated', 'success'); },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [updateMemberRole, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Family Team</Text>
          <Text style={styles.headerSubtitle}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowInviteModal(true)}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'members' && styles.togglePillActive]}
          onPress={() => setViewMode('members')}
        >
          <Text style={[styles.toggleText, viewMode === 'members' && styles.toggleTextActive]}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'activity' && styles.togglePillActive]}
          onPress={() => setViewMode('activity')}
        >
          <Text style={[styles.toggleText, viewMode === 'activity' && styles.toggleTextActive]}>Activity</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'members' ? (
        <FlatList
          data={[...members]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.memberCard}
              onPress={isAdmin ? () => handleChangeRole(item) : undefined}
              onLongPress={isAdmin ? () => handleRemoveMember(item) : undefined}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{item.display_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.display_name}</Text>
                <Text style={styles.memberJoined}>Joined {new Date(item.joined_at).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_CONFIG[item.role].color + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_CONFIG[item.role].color }]}>{ROLE_CONFIG[item.role].label}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            invitations.length > 0 ? (
              <View style={styles.pendingSection}>
                <Text style={styles.pendingTitle}>Pending Invitations</Text>
                {invitations.map((inv) => (
                  <View key={inv.id} style={styles.pendingCard}>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingEmail}>{inv.invitee_email}</Text>
                      <Text style={styles.pendingRole}>{ROLE_CONFIG[inv.role].label}</Text>
                    </View>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => { revokeInvitation(inv.id); showToast('Invitation revoked', 'success'); }}>
                        <Text style={styles.revokeText}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>👨‍👩‍👧</Text>
              <Text style={styles.emptyTitle}>Just you so far</Text>
              <Text style={styles.emptySubtitle}>Invite a co-parent or caregiver to collaborate</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={activityLog}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityRow entry={item} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtitle}>Actions will appear here as family members collaborate</Text>
            </View>
          }
        />
      )}

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Co-Parent</Text>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.formInput}
              placeholder="coparent@example.com"
              placeholderTextColor={colors.mid}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleGrid}>
              {(['member', 'viewer'] as FamilyMemberRole[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleOption, inviteRole === r && { backgroundColor: ROLE_CONFIG[r].color + '20', borderColor: ROLE_CONFIG[r].color }]}
                  onPress={() => setInviteRole(r)}
                >
                  <Text style={styles.roleOptionLabel}>{ROLE_CONFIG[r].label}</Text>
                  <Text style={styles.roleOptionDesc}>
                    {r === 'member' ? 'Can view and edit everything' : 'Can view but not edit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowInviteModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (isSending || !inviteEmail.trim()) && styles.saveButtonDisabled]}
                onPress={handleInvite}
                disabled={isSending || !inviteEmail.trim()}
              >
                {isSending ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>Send Invite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const timeAgo = getTimeAgo(entry.created_at);
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityDot} />
      <View style={styles.activityInfo}>
        <Text style={styles.activityText}>
          <Text style={styles.activityAuthor}>{entry.user_display_name}</Text> {entry.description}
        </Text>
        <Text style={styles.activityTime}>{timeAgo}</Text>
      </View>
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerSubtitle: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 },
  togglePill: { flex: 1, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.light, alignItems: 'center' },
  togglePillActive: { backgroundColor: colors.teal },
  toggleText: { fontSize: 12, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  toggleTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.md,
    padding: spacing.md, marginBottom: 6, gap: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 16, color: colors.white, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.navy },
  memberJoined: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  roleText: { fontSize: 10, fontWeight: fonts.weights.medium as '500' },
  pendingSection: { marginBottom: spacing.lg },
  pendingTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: radii.md,
    padding: spacing.md, marginBottom: 6, justifyContent: 'space-between',
  },
  pendingInfo: { flex: 1 },
  pendingEmail: { fontSize: fonts.sizes.sm, color: colors.dark },
  pendingRole: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  revokeText: { fontSize: fonts.sizes.xs, color: '#DC2626', fontWeight: fonts.weights.medium as '500' },
  activityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal, marginTop: 6 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 20 },
  activityAuthor: { fontWeight: fonts.weights.bold as '700', color: colors.navy },
  activityTime: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, marginTop: spacing.sm, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xl },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.md },
  fieldLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500', marginBottom: 4, marginTop: spacing.sm },
  formInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark },
  roleGrid: { gap: 8 },
  roleOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.light },
  roleOptionLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  roleOptionDesc: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.mid },
  saveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, backgroundColor: colors.teal },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.medium as '500' },
});
