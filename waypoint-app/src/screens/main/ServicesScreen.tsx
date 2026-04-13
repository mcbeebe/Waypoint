/**
 * Services screen — Authorization tracker with provider linking
 * Phase 3: Sprints S29–S30
 *
 * Shows active services with authorization status, hours tracking,
 * expiring service alerts, and navigation to linked providers.
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
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useServices, type ServiceWithMeta } from '@/hooks/useServices';
import { useProviders } from '@/hooks/useProviders';
import { useToast } from '@/components/Toast';
import type { Service, ServiceType, ServiceStatus, FundingSource } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Config ─────────────────────────────────────────────────────────────────

const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; emoji: string; color: string }> = {
  OT: { label: 'Occupational Therapy', emoji: '🤲', color: '#7C3AED' },
  ABA: { label: 'ABA Therapy', emoji: '🧩', color: '#2563EB' },
  speech: { label: 'Speech Therapy', emoji: '🗣️', color: '#0891B2' },
  PT: { label: 'Physical Therapy', emoji: '🏃', color: '#DC2626' },
  behavioral: { label: 'Behavioral Support', emoji: '🧠', color: '#EA580C' },
  respite: { label: 'Respite Care', emoji: '🏠', color: '#059669' },
  other: { label: 'Other', emoji: '📋', color: '#64748B' },
};

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#10B981' },
  pending: { label: 'Pending', color: '#F59E0B' },
  denied: { label: 'Denied', color: '#EF4444' },
  ended: { label: 'Ended', color: '#94A3B8' },
};

const FUNDING_LABELS: Record<FundingSource, string> = {
  insurance: 'Insurance',
  regional_center: 'Regional Center',
  'medi-cal': 'Medi-Cal',
  ccs: 'CCS',
  private_pay: 'Private Pay',
  school: 'School District',
};

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const familyId = family?.id ?? '';
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<ServiceStatus | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    services,
    loading,
    expiringCount,
    createService,
    updateService,
    deleteService,
    refetch,
  } = useServices({ familyId, statusFilter });

  const { providers } = useProviders({ familyId });

  /** Group by child */
  const groupedServices = useMemo(() => {
    const groups: Record<string, { childName: string; items: ServiceWithMeta[] }> = {};
    for (const svc of services) {
      const child = children.find((c) => c.id === svc.child_id);
      const childName = child?.first_name ?? 'Unknown';
      if (!groups[svc.child_id]) groups[svc.child_id] = { childName, items: [] };
      groups[svc.child_id].items.push(svc);
    }
    return Object.entries(groups).map(([childId, data]) => ({
      childId,
      ...data,
    }));
  }, [services, children]);

  const handleSave = useCallback(async (data: Parameters<typeof createService>[0]) => {
    const result = await createService(data);
    showToast(result ? 'Service added' : 'Failed to add service', result ? 'success' : 'error');
    setShowAddModal(false);
  }, [createService, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Services</Text>
          <Text style={styles.headerSubtitle}>
            {services.length} services{expiringCount > 0 ? ` · ${expiringCount} expiring soon` : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Expiring Alert */}
      {expiringCount > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            {expiringCount} service{expiringCount > 1 ? 's' : ''} expiring within 30 days
          </Text>
        </View>
      )}

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterPill, !statusFilter && styles.filterPillActive]}
          onPress={() => setStatusFilter(undefined)}
        >
          <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {(Object.keys(STATUS_CONFIG) as ServiceStatus[]).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterPill, statusFilter === status && styles.filterPillActive]}
            onPress={() => setStatusFilter(statusFilter === status ? undefined : status)}
          >
            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
              {STATUS_CONFIG[status].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Service List */}
      <FlatList
        data={groupedServices}
        keyExtractor={(item) => item.childId}
        renderItem={({ item: group }) => (
          <View style={styles.childGroup}>
            <Text style={styles.childGroupLabel}>{group.childName}</Text>
            {group.items.map((svc) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                providerName={providers.find((p) => p.id === svc.provider_id)?.name ?? null}
                onDelete={() => { deleteService(svc.id); showToast('Service removed', 'success'); }}
              />
            ))}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No services yet</Text>
            <Text style={styles.emptySubtitle}>
              Track therapy authorizations, hours, and service status
            </Text>
          </View>
        }
      />

      {/* Add Service Modal */}
      <ServiceFormModal
        visible={showAddModal}
        children={children}
        providers={providers}
        onSave={handleSave}
        onClose={() => setShowAddModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Service Card ───────────────────────────────────────────────────────────

function ServiceCard({
  service,
  providerName,
  onDelete,
}: {
  service: ServiceWithMeta;
  providerName: string | null;
  onDelete: () => void;
}) {
  const typeConfig = SERVICE_TYPE_CONFIG[service.service_type] ?? SERVICE_TYPE_CONFIG.other;
  const statusConfig = STATUS_CONFIG[service.status];
  const fundingLabel = service.funding_source ? FUNDING_LABELS[service.funding_source] ?? service.funding_source : null;

  return (
    <TouchableOpacity style={styles.serviceCard} onLongPress={onDelete}>
      <View style={styles.serviceHeader}>
        <View style={[styles.typeDot, { backgroundColor: typeConfig.color }]}>
          <Text style={styles.typeEmoji}>{typeConfig.emoji}</Text>
        </View>
        <View style={styles.serviceHeaderInfo}>
          <Text style={styles.serviceType}>{typeConfig.label}</Text>
          {providerName && <Text style={styles.providerLink}>{providerName}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <View style={styles.serviceDetails}>
        {service.authorized_hours != null && (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{service.authorized_hours} hrs authorized</Text>
          </View>
        )}
        {service.frequency && (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{service.frequency}</Text>
          </View>
        )}
        {fundingLabel && (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>{fundingLabel}</Text>
          </View>
        )}
        {service.authorization_number && (
          <View style={styles.detailChip}>
            <Text style={styles.detailChipText}>Auth #{service.authorization_number}</Text>
          </View>
        )}
      </View>

      {/* Expiry Warning */}
      {service.isExpiringSoon && service.daysUntilExpiry != null && (
        <View style={styles.expiryBanner}>
          <Text style={styles.expiryText}>
            Expires in {service.daysUntilExpiry} day{service.daysUntilExpiry !== 1 ? 's' : ''}
            {service.end_date ? ` (${service.end_date})` : ''}
          </Text>
        </View>
      )}

      {/* Date Range */}
      {(service.start_date || service.end_date) && !service.isExpiringSoon && (
        <Text style={styles.dateRange}>
          {service.start_date ?? '?'} — {service.end_date ?? 'Ongoing'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Add Service Modal ──────────────────────────────────────────────────────

function ServiceFormModal({
  visible,
  children: childList,
  providers,
  onSave,
  onClose,
}: {
  visible: boolean;
  children: Array<{ id: string; first_name: string }>;
  providers: Array<{ id: string; name: string }>;
  onSave: (data: Parameters<ReturnType<typeof useServices>['createService']>[0]) => void;
  onClose: () => void;
}) {
  const [childId, setChildId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('OT');
  const [providerId, setProviderId] = useState('');
  const [fundingSource, setFundingSource] = useState<FundingSource | ''>('');
  const [authorizedHours, setAuthorizedHours] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [authNumber, setAuthNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setChildId(childList[0]?.id ?? '');
      setServiceType('OT'); setProviderId(''); setFundingSource('');
      setAuthorizedHours(''); setFrequency(''); setStartDate('');
      setEndDate(''); setAuthNumber('');
    }
  }, [visible, childList]);

  const handleSubmit = async () => {
    if (!childId) return;
    setIsSaving(true);
    await onSave({
      child_id: childId,
      service_type: serviceType,
      provider_id: providerId || undefined,
      funding_source: (fundingSource as FundingSource) || undefined,
      authorized_hours: authorizedHours ? parseFloat(authorizedHours) : undefined,
      frequency: frequency || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      authorization_number: authNumber || undefined,
    });
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Service</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Child Selector */}
            {childList.length > 1 && (
              <>
                <Text style={styles.fieldLabel}>Child *</Text>
                <View style={styles.optionGrid}>
                  {childList.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.optionChip, childId === c.id && styles.optionChipActive]}
                      onPress={() => setChildId(c.id)}
                    >
                      <Text style={[styles.optionChipText, childId === c.id && styles.optionChipTextActive]}>{c.first_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Service Type */}
            <Text style={styles.fieldLabel}>Service Type</Text>
            <View style={styles.optionGrid}>
              {(Object.keys(SERVICE_TYPE_CONFIG) as ServiceType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionChip, serviceType === type && { backgroundColor: SERVICE_TYPE_CONFIG[type].color + '20', borderColor: SERVICE_TYPE_CONFIG[type].color }]}
                  onPress={() => setServiceType(type)}
                >
                  <Text style={styles.optionChipText}>{SERVICE_TYPE_CONFIG[type].emoji} {SERVICE_TYPE_CONFIG[type].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Provider */}
            {providers.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Provider</Text>
                <View style={styles.optionGrid}>
                  <TouchableOpacity
                    style={[styles.optionChip, !providerId && styles.optionChipActive]}
                    onPress={() => setProviderId('')}
                  >
                    <Text style={[styles.optionChipText, !providerId && styles.optionChipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {providers.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.optionChip, providerId === p.id && styles.optionChipActive]}
                      onPress={() => setProviderId(p.id)}
                    >
                      <Text style={[styles.optionChipText, providerId === p.id && styles.optionChipTextActive]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Funding Source */}
            <Text style={styles.fieldLabel}>Funding Source</Text>
            <View style={styles.optionGrid}>
              {(Object.keys(FUNDING_LABELS) as FundingSource[]).map((src) => (
                <TouchableOpacity
                  key={src}
                  style={[styles.optionChip, fundingSource === src && styles.optionChipActive]}
                  onPress={() => setFundingSource(fundingSource === src ? '' : src)}
                >
                  <Text style={[styles.optionChipText, fundingSource === src && styles.optionChipTextActive]}>{FUNDING_LABELS[src]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Authorized Hours</Text>
            <TextInput style={styles.formInput} placeholder="e.g., 20" placeholderTextColor={colors.mid} value={authorizedHours} onChangeText={setAuthorizedHours} keyboardType="decimal-pad" />

            <Text style={styles.fieldLabel}>Frequency</Text>
            <TextInput style={styles.formInput} placeholder="e.g., 2x/week" placeholderTextColor={colors.mid} value={frequency} onChangeText={setFrequency} />

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mid} value={startDate} onChangeText={setStartDate} />

            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mid} value={endDate} onChangeText={setEndDate} />

            <Text style={styles.fieldLabel}>Authorization #</Text>
            <TextInput style={styles.formInput} placeholder="Auth number" placeholderTextColor={colors.mid} value={authNumber} onChangeText={setAuthNumber} />
          </ScrollView>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (isSaving || !childId) && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving || !childId}
            >
              {isSaving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>Add</Text>}
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
  alertBanner: { backgroundColor: '#FEF3C7', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  alertText: { fontSize: fonts.sizes.xs, color: '#92400E', fontWeight: fonts.weights.medium as '500' },
  filterRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 11, color: colors.dark },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  childGroup: { marginBottom: spacing.lg },
  childGroupLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  serviceCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typeDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  typeEmoji: { fontSize: 16 },
  serviceHeaderInfo: { flex: 1 },
  serviceType: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.dark },
  providerLink: { fontSize: fonts.sizes.xs, color: colors.teal, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  statusText: { fontSize: 10, fontWeight: fonts.weights.medium as '500' },
  serviceDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  detailChip: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  detailChipText: { fontSize: fonts.sizes.xs, color: colors.mid },
  expiryBanner: { backgroundColor: '#FEF3C7', borderRadius: radii.sm, padding: spacing.sm, marginTop: spacing.sm },
  expiryText: { fontSize: fonts.sizes.xs, color: '#92400E', fontWeight: fonts.weights.medium as '500' },
  dateRange: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: spacing.sm },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', marginTop: spacing.sm },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%' },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.md },
  fieldLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500', marginBottom: 4, marginTop: spacing.sm },
  formInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.light },
  optionChipActive: { backgroundColor: colors.teal + '20', borderColor: colors.teal },
  optionChipText: { fontSize: 11, color: colors.dark },
  optionChipTextActive: { color: colors.teal },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.mid },
  saveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, backgroundColor: colors.teal },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.medium as '500' },
});
