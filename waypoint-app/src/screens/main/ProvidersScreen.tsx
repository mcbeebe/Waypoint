/**
 * Providers screen — Care team management with list, detail, and add/edit modal.
 * Phase 3: Sprints S26–S27, S30 (linking)
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Linking,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useProviders } from '@/hooks/useProviders';
import { useToast } from '@/components/Toast';
import type { Provider, ProviderType } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Config ─────────────────────────────────────────────────────────────────

const PROVIDER_TYPE_CONFIG: Record<ProviderType, { label: string; emoji: string; color: string }> = {
  therapist: { label: 'Therapist', emoji: '🧠', color: '#7C3AED' },
  doctor: { label: 'Doctor', emoji: '⚕️', color: '#DC2626' },
  attorney: { label: 'Attorney', emoji: '⚖️', color: '#2563EB' },
  coordinator: { label: 'Coordinator', emoji: '📋', color: '#0891B2' },
  school: { label: 'School', emoji: '🏫', color: '#EA580C' },
  regional_center: { label: 'Regional Center', emoji: '🏛️', color: '#059669' },
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ProvidersScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';
  const { showToast } = useToast();

  const [typeFilter, setTypeFilter] = useState<ProviderType | undefined>(undefined);
  const [showInactive, setShowInactive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    providers,
    loading,
    createProvider,
    updateProvider,
    deactivateProvider,
    searchProviders,
    refetch,
  } = useProviders({ familyId, typeFilter, showInactive });

  const displayProviders = useMemo(
    () => (searchQuery ? searchProviders(searchQuery) : providers),
    [searchQuery, searchProviders, providers]
  );

  /** Group by type */
  const groupedProviders = useMemo(() => {
    const groups: Record<string, Provider[]> = {};
    for (const p of displayProviders) {
      if (!groups[p.provider_type]) groups[p.provider_type] = [];
      groups[p.provider_type].push(p);
    }
    return Object.entries(groups).map(([type, items]) => ({
      type: type as ProviderType,
      config: PROVIDER_TYPE_CONFIG[type as ProviderType],
      items,
    }));
  }, [displayProviders]);

  const handleSave = useCallback(async (
    data: Parameters<typeof createProvider>[0],
    existingId?: string
  ) => {
    if (existingId) {
      await updateProvider(existingId, data);
      showToast('Provider updated', 'success');
    } else {
      const result = await createProvider(data);
      showToast(result ? 'Provider added' : 'Failed to add provider', result ? 'success' : 'error');
    }
    setShowAddModal(false);
    setEditingProvider(null);
  }, [createProvider, updateProvider, showToast]);

  const handleDeactivate = useCallback(async (id: string) => {
    await deactivateProvider(id);
    setSelectedProvider(null);
    showToast('Provider deactivated', 'success');
  }, [deactivateProvider, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Care Team</Text>
          <Text style={styles.headerSubtitle}>{providers.length} providers</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setEditingProvider(null); setShowAddModal(true); }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search providers..."
          placeholderTextColor={colors.mid}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterPill, !typeFilter && styles.filterPillActive]}
          onPress={() => setTypeFilter(undefined)}
        >
          <Text style={[styles.filterText, !typeFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {(Object.keys(PROVIDER_TYPE_CONFIG) as ProviderType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterPill, typeFilter === type && styles.filterPillActive]}
            onPress={() => setTypeFilter(typeFilter === type ? undefined : type)}
          >
            <Text style={[styles.filterText, typeFilter === type && styles.filterTextActive]}>
              {PROVIDER_TYPE_CONFIG[type].emoji} {PROVIDER_TYPE_CONFIG[type].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Provider List */}
      <FlatList
        data={groupedProviders}
        keyExtractor={(item) => item.type}
        renderItem={({ item: group }) => (
          <View style={styles.typeGroup}>
            <Text style={styles.typeGroupLabel}>
              {group.config.emoji} {group.config.label} ({group.items.length})
            </Text>
            {group.items.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onPress={() => setSelectedProvider(provider)}
                onEdit={() => { setEditingProvider(provider); setShowAddModal(true); }}
              />
            ))}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No providers yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your child's therapists, doctors, and coordinators
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <ProviderDetailModal
        provider={selectedProvider}
        onClose={() => setSelectedProvider(null)}
        onEdit={() => { setEditingProvider(selectedProvider); setSelectedProvider(null); setShowAddModal(true); }}
        onDeactivate={handleDeactivate}
      />

      {/* Add/Edit Modal */}
      <ProviderFormModal
        visible={showAddModal}
        provider={editingProvider}
        onSave={handleSave}
        onClose={() => { setShowAddModal(false); setEditingProvider(null); }}
      />
    </SafeAreaView>
  );
}

// ─── Provider Card ──────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onPress,
  onEdit,
}: {
  provider: Provider;
  onPress: () => void;
  onEdit: () => void;
}) {
  const config = PROVIDER_TYPE_CONFIG[provider.provider_type] ?? PROVIDER_TYPE_CONFIG.therapist;

  return (
    <TouchableOpacity style={styles.providerCard} onPress={onPress} onLongPress={onEdit}>
      <View style={[styles.typeDot, { backgroundColor: config.color }]}>
        <Text style={styles.typeEmoji}>{config.emoji}</Text>
      </View>
      <View style={styles.providerInfo}>
        <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
        {provider.organization && (
          <Text style={styles.providerOrg} numberOfLines={1}>{provider.organization}</Text>
        )}
        {provider.specialty && (
          <Text style={styles.providerSpecialty}>{provider.specialty}</Text>
        )}
      </View>
      {!provider.is_active && (
        <View style={styles.inactiveBadge}>
          <Text style={styles.inactiveBadgeText}>Inactive</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────────

function ProviderDetailModal({
  provider,
  onClose,
  onEdit,
  onDeactivate,
}: {
  provider: Provider | null;
  onClose: () => void;
  onEdit: () => void;
  onDeactivate: (id: string) => void;
}) {
  if (!provider) return null;
  const config = PROVIDER_TYPE_CONFIG[provider.provider_type];

  return (
    <Modal visible={!!provider} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.detailHeader}>
            <View style={[styles.detailDot, { backgroundColor: config.color }]}>
              <Text style={{ fontSize: 24 }}>{config.emoji}</Text>
            </View>
            <View style={styles.detailHeaderInfo}>
              <Text style={styles.detailName}>{provider.name}</Text>
              <Text style={styles.detailType}>{config.label}</Text>
            </View>
          </View>

          <ScrollView style={styles.detailBody}>
            {provider.organization && <DetailRow label="Organization" value={provider.organization} />}
            {provider.specialty && <DetailRow label="Specialty" value={provider.specialty} />}
            {provider.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${provider.phone}`)}>
                <DetailRow label="Phone" value={provider.phone} actionColor={colors.teal} />
              </TouchableOpacity>
            )}
            {provider.email && (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${provider.email}`)}>
                <DetailRow label="Email" value={provider.email} actionColor={colors.teal} />
              </TouchableOpacity>
            )}
            {provider.address && <DetailRow label="Address" value={provider.address} />}
            {provider.notes && <DetailRow label="Notes" value={provider.notes} />}
          </ScrollView>

          <View style={styles.detailActions}>
            <TouchableOpacity style={styles.detailActionBtn} onPress={onEdit}>
              <Text style={styles.detailActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.detailActionBtn, styles.deactivateBtn]}
              onPress={() => onDeactivate(provider.id)}
            >
              <Text style={styles.deactivateText}>Deactivate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Text style={styles.detailCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, actionColor }: { label: string; value: string; actionColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, actionColor ? { color: actionColor } : undefined]}>{value}</Text>
    </View>
  );
}

// ─── Add/Edit Form Modal ────────────────────────────────────────────────────

function ProviderFormModal({
  visible,
  provider,
  onSave,
  onClose,
}: {
  visible: boolean;
  provider: Provider | null;
  onSave: (data: { name: string; provider_type: ProviderType; specialty?: string; organization?: string; phone?: string; email?: string; address?: string; notes?: string }, existingId?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('therapist');
  const [specialty, setSpecialty] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (provider) {
      setName(provider.name);
      setProviderType(provider.provider_type);
      setSpecialty(provider.specialty ?? '');
      setOrganization(provider.organization ?? '');
      setPhone(provider.phone ?? '');
      setEmail(provider.email ?? '');
      setAddress(provider.address ?? '');
      setNotes(provider.notes ?? '');
    } else {
      setName(''); setProviderType('therapist'); setSpecialty('');
      setOrganization(''); setPhone(''); setEmail('');
      setAddress(''); setNotes('');
    }
  }, [provider, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await onSave(
      {
        name: name.trim(),
        provider_type: providerType,
        specialty: specialty || undefined,
        organization: organization || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      },
      provider?.id
    );
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{provider ? 'Edit Provider' : 'Add Provider'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.formInput} placeholder="Provider name" placeholderTextColor={colors.mid} value={name} onChangeText={setName} />

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeGrid}>
              {(Object.keys(PROVIDER_TYPE_CONFIG) as ProviderType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, providerType === type && { backgroundColor: PROVIDER_TYPE_CONFIG[type].color + '20', borderColor: PROVIDER_TYPE_CONFIG[type].color }]}
                  onPress={() => setProviderType(type)}
                >
                  <Text style={styles.typeOptionText}>{PROVIDER_TYPE_CONFIG[type].emoji} {PROVIDER_TYPE_CONFIG[type].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Specialty</Text>
            <TextInput style={styles.formInput} placeholder="e.g., ABA, Speech-Language" placeholderTextColor={colors.mid} value={specialty} onChangeText={setSpecialty} />

            <Text style={styles.fieldLabel}>Organization</Text>
            <TextInput style={styles.formInput} placeholder="e.g., ELARC, Kaiser" placeholderTextColor={colors.mid} value={organization} onChangeText={setOrganization} />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.formInput} placeholder="(555) 123-4567" placeholderTextColor={colors.mid} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.formInput} placeholder="provider@example.com" placeholderTextColor={colors.mid} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput style={styles.formInput} placeholder="Street address" placeholderTextColor={colors.mid} value={address} onChangeText={setAddress} />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput style={[styles.formInput, { height: 80 }]} placeholder="Additional notes..." placeholderTextColor={colors.mid} value={notes} onChangeText={setNotes} multiline />
          </ScrollView>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (isSaving || !name.trim()) && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>{provider ? 'Update' : 'Add'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  searchBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fonts.sizes.sm, color: colors.dark },
  filterRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 11, color: colors.dark },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  typeGroup: { marginBottom: spacing.lg },
  typeGroupLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radii.md, padding: spacing.md, marginBottom: 6, gap: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  typeDot: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  typeEmoji: { fontSize: 18 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.dark },
  providerOrg: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 1 },
  providerSpecialty: { fontSize: fonts.sizes.xs, color: colors.teal, marginTop: 1 },
  inactiveBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  inactiveBadgeText: { fontSize: 9, color: '#DC2626' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', marginTop: spacing.sm },
  // Modal shared
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%' },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.md },
  // Detail modal
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  detailDot: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  detailHeaderInfo: { flex: 1 },
  detailName: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  detailType: { fontSize: fonts.sizes.sm, color: colors.mid },
  detailBody: { maxHeight: 300 },
  detailRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { fontSize: fonts.sizes.xs, color: colors.mid },
  detailValue: { fontSize: fonts.sizes.sm, color: colors.dark, marginTop: 2 },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  detailActionBtn: { flex: 1, paddingVertical: spacing.base, borderRadius: radii.md, borderWidth: 1, borderColor: colors.teal, alignItems: 'center' },
  detailActionText: { fontSize: fonts.sizes.sm, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  deactivateBtn: { borderColor: '#DC2626' },
  deactivateText: { fontSize: fonts.sizes.sm, color: '#DC2626', fontWeight: fonts.weights.medium as '500' },
  detailCloseBtn: { flex: 1, paddingVertical: spacing.base, borderRadius: radii.md, backgroundColor: colors.light, alignItems: 'center' },
  detailCloseText: { fontSize: fonts.sizes.sm, color: colors.mid },
  // Form modal
  fieldLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500', marginBottom: 4, marginTop: spacing.sm },
  formInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.light },
  typeOptionText: { fontSize: 11, color: colors.dark },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.mid },
  saveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, backgroundColor: colors.teal },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.medium as '500' },
});
