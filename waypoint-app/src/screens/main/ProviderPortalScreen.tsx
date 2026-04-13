/**
 * Provider Portal — Dashboard, onboarding, connections, and directory
 * Phase 7: Sprints S54-S58
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useProviderProfile,
  useProviderConnections,
  useProviderDirectory,
} from '@/hooks/useProviderPortal';
import { useToast } from '@/components/Toast';
import type { ProviderProfile, ProviderType } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const PROVIDER_TYPE_OPTIONS: Array<{ type: ProviderType; label: string; emoji: string }> = [
  { type: 'therapist', label: 'Therapist', emoji: '🧠' },
  { type: 'doctor', label: 'Doctor', emoji: '⚕️' },
  { type: 'attorney', label: 'Attorney', emoji: '⚖️' },
  { type: 'coordinator', label: 'Coordinator', emoji: '📋' },
  { type: 'school', label: 'School', emoji: '🏫' },
  { type: 'regional_center', label: 'Regional Center', emoji: '🏛️' },
];

type ViewMode = 'dashboard' | 'directory' | 'onboarding';

export default function ProviderPortalScreen() {
  const { showToast } = useToast();
  const { profile, loading: loadingProfile, createProfile, updateProfile } = useProviderProfile();
  const { connections, loading: loadingConns, updateConnectionStatus, refetch: refetchConns } = useProviderConnections(profile?.id);

  const [viewMode, setViewMode] = useState<ViewMode>(profile ? 'dashboard' : 'onboarding');

  // Update view when profile loads
  React.useEffect(() => {
    if (!loadingProfile) {
      setViewMode(profile ? 'dashboard' : 'onboarding');
    }
  }, [profile, loadingProfile]);

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {viewMode === 'onboarding' ? 'Provider Setup' : viewMode === 'directory' ? 'Provider Directory' : 'Provider Portal'}
        </Text>
        {profile && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.tabBtn, viewMode === 'dashboard' && styles.tabBtnActive]}
              onPress={() => setViewMode('dashboard')}
            >
              <Text style={[styles.tabText, viewMode === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, viewMode === 'directory' && styles.tabBtnActive]}
              onPress={() => setViewMode('directory')}
            >
              <Text style={[styles.tabText, viewMode === 'directory' && styles.tabTextActive]}>Directory</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {viewMode === 'onboarding' && (
        <ProviderOnboarding
          onComplete={async (data) => {
            const result = await createProfile(data);
            if (result) {
              showToast('Profile created!', 'success');
              setViewMode('dashboard');
            }
          }}
        />
      )}

      {viewMode === 'dashboard' && profile && (
        <ProviderDashboard
          profile={profile}
          connections={connections}
          loading={loadingConns}
          onApprove={(id) => { updateConnectionStatus(id, 'approved'); showToast('Connection approved', 'success'); }}
          onDecline={(id) => { updateConnectionStatus(id, 'declined'); showToast('Connection declined', 'success'); }}
          onRefresh={refetchConns}
        />
      )}

      {viewMode === 'directory' && <ProviderDirectoryView />}
    </SafeAreaView>
  );
}

// ─── Onboarding (S54) ──────────────────────────────────────────────────────

function ProviderOnboarding({ onComplete }: {
  onComplete: (data: Parameters<ReturnType<typeof useProviderProfile>['createProfile']>[0]) => void;
}) {
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('therapist');
  const [specialty, setSpecialty] = useState('');
  const [organization, setOrganization] = useState('');
  const [npi, setNpi] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await onComplete({
      name: name.trim(),
      provider_type: providerType,
      specialty: specialty || undefined,
      organization: organization || undefined,
      npi_number: npi || undefined,
      phone: phone || undefined,
      email: email || undefined,
      bio: bio || undefined,
    });
    setIsSaving(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.onboardingContent}>
      <Text style={styles.onboardingTitle}>Create Your Provider Profile</Text>
      <Text style={styles.onboardingSubtitle}>Connect with families and share documents securely</Text>

      <Text style={styles.fieldLabel}>Full Name *</Text>
      <TextInput style={styles.input} placeholder="Dr. Jane Smith" placeholderTextColor={colors.mid} value={name} onChangeText={setName} />

      <Text style={styles.fieldLabel}>Provider Type</Text>
      <View style={styles.typeGrid}>
        {PROVIDER_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={[styles.typeOption, providerType === opt.type && styles.typeOptionActive]}
            onPress={() => setProviderType(opt.type)}
          >
            <Text style={styles.typeOptionText}>{opt.emoji} {opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Specialty</Text>
      <TextInput style={styles.input} placeholder="e.g., ABA, Speech-Language Pathology" placeholderTextColor={colors.mid} value={specialty} onChangeText={setSpecialty} />

      <Text style={styles.fieldLabel}>Organization</Text>
      <TextInput style={styles.input} placeholder="Practice or agency name" placeholderTextColor={colors.mid} value={organization} onChangeText={setOrganization} />

      <Text style={styles.fieldLabel}>NPI Number</Text>
      <TextInput style={styles.input} placeholder="10-digit NPI" placeholderTextColor={colors.mid} value={npi} onChangeText={setNpi} keyboardType="number-pad" maxLength={10} />

      <Text style={styles.fieldLabel}>Phone</Text>
      <TextInput style={styles.input} placeholder="(555) 123-4567" placeholderTextColor={colors.mid} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput style={styles.input} placeholder="provider@example.com" placeholderTextColor={colors.mid} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.fieldLabel}>Bio</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Brief description of your practice..." placeholderTextColor={colors.mid} value={bio} onChangeText={setBio} multiline />

      <TouchableOpacity
        style={[styles.submitButton, (isSaving || !name.trim()) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSaving || !name.trim()}
      >
        {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Create Profile</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Dashboard (S55) ────────────────────────────────────────────────────────

function ProviderDashboard({ profile, connections, loading, onApprove, onDecline, onRefresh }: {
  profile: ProviderProfile;
  connections: ReturnType<typeof useProviderConnections>['connections'];
  loading: boolean;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onRefresh: () => void;
}) {
  const approved = connections.filter((c) => c.status === 'approved');
  const pending = connections.filter((c) => c.status === 'pending');

  return (
    <ScrollView contentContainerStyle={styles.dashboardContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{profile.name.charAt(0)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileType}>{profile.specialty ?? profile.provider_type}</Text>
            {profile.organization && <Text style={styles.profileOrg}>{profile.organization}</Text>}
          </View>
          {profile.is_verified && <Text style={styles.verifiedBadge}>Verified</Text>}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{approved.length}</Text>
          <Text style={styles.statLabel}>Families</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Requests</Text>
          {pending.map((conn) => (
            <View key={conn.id} style={styles.requestCard}>
              <Text style={styles.requestText}>
                {conn.requested_by === 'family' ? 'Family connection request' : 'Your request pending'}
              </Text>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(conn.id)}>
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(conn.id)}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Connected Families */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Families ({approved.length})</Text>
        {approved.length === 0 ? (
          <Text style={styles.emptyText}>No connected families yet</Text>
        ) : (
          approved.map((conn) => (
            <View key={conn.id} style={styles.familyCard}>
              <Text style={styles.familyCardText}>Family connected</Text>
              <Text style={styles.familyCardDate}>Since {new Date(conn.responded_at ?? conn.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Directory (S58) ────────────────────────────────────────────────────────

function ProviderDirectoryView() {
  const [typeFilter, setTypeFilter] = useState<ProviderType | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const { providers, loading, refetch } = useProviderDirectory({
    providerType: typeFilter,
    isAcceptingPatients: true,
  });

  const filtered = searchQuery
    ? providers.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : providers;

  return (
    <View style={styles.flex}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search providers..."
          placeholderTextColor={colors.mid}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterPill, !typeFilter && styles.filterPillActive]}
          onPress={() => setTypeFilter(undefined)}
        >
          <Text style={[styles.filterText, !typeFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {PROVIDER_TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.type}
            style={[styles.filterPill, typeFilter === opt.type && styles.filterPillActive]}
            onPress={() => setTypeFilter(typeFilter === opt.type ? undefined : opt.type)}
          >
            <Text style={[styles.filterText, typeFilter === opt.type && styles.filterTextActive]}>
              {opt.emoji} {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.directoryCard}>
            <View style={styles.directoryHeader}>
              <Text style={styles.directoryName}>{item.name}</Text>
              {item.is_verified && <Text style={styles.verifiedBadgeSmall}>Verified</Text>}
            </View>
            {item.specialty && <Text style={styles.directorySpecialty}>{item.specialty}</Text>}
            {item.organization && <Text style={styles.directoryOrg}>{item.organization}</Text>}
            {item.bio && <Text style={styles.directoryBio} numberOfLines={2}>{item.bio}</Text>}
            {item.insurance_accepted.length > 0 && (
              <View style={styles.insuranceRow}>
                {item.insurance_accepted.slice(0, 3).map((ins) => (
                  <View key={ins} style={styles.insuranceChip}>
                    <Text style={styles.insuranceText}>{ins}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCenter}>
            <Text style={styles.emptyText}>No providers found</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerActions: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.light },
  tabBtnActive: { backgroundColor: colors.teal },
  tabText: { fontSize: 12, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  tabTextActive: { color: colors.white },
  // Onboarding
  onboardingContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  onboardingTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  onboardingSubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, marginBottom: spacing.lg },
  fieldLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500', marginBottom: 4, marginTop: spacing.sm },
  input: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.light },
  typeOptionActive: { backgroundColor: colors.teal + '20', borderColor: colors.teal },
  typeOptionText: { fontSize: 11, color: colors.dark },
  submitButton: { backgroundColor: colors.teal, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xl },
  submitButtonDisabled: { backgroundColor: colors.border },
  submitText: { fontSize: fonts.sizes.md, color: colors.white, fontWeight: fonts.weights.bold as '700' },
  // Dashboard
  dashboardContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  profileCard: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  profileAvatarText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  profileType: { fontSize: fonts.sizes.sm, color: colors.teal, marginTop: 2 },
  profileOrg: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 1 },
  verifiedBadge: { fontSize: 10, color: '#059669', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  statLabel: { fontSize: 10, color: colors.mid, marginTop: 2 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  requestCard: { backgroundColor: '#FEF3C7', borderRadius: radii.md, padding: spacing.md, marginBottom: 6 },
  requestText: { fontSize: fonts.sizes.sm, color: colors.dark, marginBottom: spacing.sm },
  requestActions: { flexDirection: 'row', gap: spacing.sm },
  approveBtn: { flex: 1, paddingVertical: 6, borderRadius: radii.sm, backgroundColor: '#059669', alignItems: 'center' },
  approveBtnText: { fontSize: fonts.sizes.xs, color: colors.white, fontWeight: '600' },
  declineBtn: { flex: 1, paddingVertical: 6, borderRadius: radii.sm, backgroundColor: colors.light, alignItems: 'center' },
  declineBtnText: { fontSize: fonts.sizes.xs, color: colors.mid },
  familyCard: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 6 },
  familyCardText: { fontSize: fonts.sizes.sm, color: colors.dark },
  familyCardDate: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  emptyText: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', padding: spacing.lg },
  // Directory
  searchBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fonts.sizes.sm, color: colors.dark },
  filterRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 11, color: colors.dark },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  directoryCard: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  directoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  directoryName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, flex: 1 },
  verifiedBadgeSmall: { fontSize: 9, color: '#059669', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  directorySpecialty: { fontSize: fonts.sizes.xs, color: colors.teal, marginTop: 2 },
  directoryOrg: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 1 },
  directoryBio: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 16, marginTop: spacing.sm },
  insuranceRow: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  insuranceChip: { backgroundColor: colors.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  insuranceText: { fontSize: 9, color: colors.mid },
  emptyCenter: { alignItems: 'center', paddingTop: 80 },
});
