/**
 * Insurance Tracker — slim v1 (roadmap 5.3, F12).
 *
 * Plan/card details up top (autofill for phone calls), authorization
 * records with expiration countdowns below. An end-dated authorization
 * gets a renewal reminder through the deadlines system automatically;
 * a denied one gets a one-tap appeal-letter handoff into Letters.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamily } from '@/hooks/useFamily';
import { useInsurance, daysUntil, type AuthorizationInput } from '@/hooks/useInsurance';
import { useToast } from '@/components/Toast';
import { showConfirm } from '@/lib/dialogs';
import EmptyState from '@/components/EmptyState';
import DateInput from '@/components/DateInput';
import { SkeletonCard } from '@/components/ui';
import type { InsuranceAuthorization, AuthorizationStatus } from '@/types/database';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const STATUS_CONFIG: Record<AuthorizationStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#B45309', bg: '#FEF3C7' },
  active: { label: 'Active', color: '#047857', bg: '#D1FAE5' },
  denied: { label: 'Denied', color: '#DC2626', bg: '#FEE2E2' },
  appealing: { label: 'Appealing', color: '#7C3AED', bg: '#EDE9FE' },
  expired: { label: 'Expired', color: '#64748B', bg: '#F1F5F9' },
};

const STATUS_ORDER: AuthorizationStatus[] = ['pending', 'active', 'denied', 'appealing', 'expired'];

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** Countdown chip content + urgency color for an authorization's end date */
function expirationInfo(auth: InsuranceAuthorization): { text: string; color: string; bg: string } | null {
  if (!auth.end_date || auth.status === 'denied') return null;
  const days = daysUntil(auth.end_date);
  if (days < 0) return { text: `Expired ${formatShortDate(auth.end_date)}`, color: '#DC2626', bg: '#FEE2E2' };
  if (days === 0) return { text: 'Expires today', color: '#DC2626', bg: '#FEE2E2' };
  if (days <= 7) return { text: `Expires in ${days} day${days === 1 ? '' : 's'}`, color: '#DC2626', bg: '#FEE2E2' };
  if (days <= 30) return { text: `Expires in ${days} days`, color: '#B45309', bg: '#FEF3C7' };
  return { text: `Expires ${formatShortDate(auth.end_date)}`, color: '#047857', bg: '#D1FAE5' };
}

export default function InsuranceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { family, updateFamily } = useFamily();
  const { showToast } = useToast();
  const {
    authorizations, loading, addAuthorization, updateAuthorization, deleteAuthorization,
  } = useInsurance(family?.id);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InsuranceAuthorization | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [insurancePhone, setInsurancePhone] = useState('');

  const sorted = useMemo(
    () =>
      [...authorizations].sort((a, b) => {
        const oa = STATUS_ORDER.indexOf(a.status);
        const ob = STATUS_ORDER.indexOf(b.status);
        if (oa !== ob) return oa - ob;
        return (a.end_date ?? '9999').localeCompare(b.end_date ?? '9999');
      }),
    [authorizations]
  );

  const openPlanEditor = useCallback(() => {
    setMemberId(family?.insurance_member_id ?? '');
    setGroupNumber(family?.insurance_group_number ?? '');
    setInsurancePhone(family?.insurance_phone ?? '');
    setEditingPlan(true);
  }, [family]);

  const handleSavePlan = useCallback(async () => {
    const ok = await updateFamily({
      insurance_member_id: memberId.trim() || null,
      insurance_group_number: groupNumber.trim() || null,
      insurance_phone: insurancePhone.trim() || null,
    });
    showToast(ok ? 'Plan details saved' : "Couldn't save — please try again", ok ? 'success' : 'error');
    if (ok) setEditingPlan(false);
  }, [memberId, groupNumber, insurancePhone, updateFamily, showToast]);

  /** Denial → appeal letter, with the record's context carried into Letters */
  const handleAppeal = useCallback((auth: InsuranceAuthorization) => {
    const carrier = family?.insurance_carrier || 'my insurance';
    const question =
      `${carrier} denied ${auth.service}` +
      (auth.provider_name ? ` (provider: ${auth.provider_name})` : '') +
      (auth.authorization_number ? `, authorization/reference #${auth.authorization_number}` : '') +
      (auth.denial_date ? `, denied on ${formatShortDate(auth.denial_date)}` : '') +
      (auth.denial_reason ? `. The stated reason was: ${auth.denial_reason}` : '') +
      '. I want to appeal this denial with a medical-necessity argument.';
    navigation.navigate('Letters', { template: 'appeal_letter', question });
  }, [family?.insurance_carrier, navigation]);

  const handleDelete = useCallback(async (auth: InsuranceAuthorization) => {
    const ok = await showConfirm(
      'Delete record',
      `Remove "${auth.service}"? Its renewal reminder will be retired too.`,
      'Delete',
      true
    );
    if (!ok) return;
    const done = await deleteAuthorization(auth.id);
    showToast(done ? 'Record deleted' : "Couldn't delete — please try again", done ? 'success' : 'error');
  }, [deleteAuthorization, showToast]);

  const renderAuth = ({ item }: { item: InsuranceAuthorization }) => {
    const status = STATUS_CONFIG[item.status];
    const expiry = expirationInfo(item);
    return (
      <View style={styles.authCard}>
        <TouchableOpacity
          onPress={() => { setEditing(item); setShowForm(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.service}`}
        >
          <View style={styles.authHeader}>
            <Text style={styles.authService}>{item.service}</Text>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          {(item.provider_name || item.authorization_number) && (
            <Text style={styles.authMeta}>
              {[item.provider_name, item.authorization_number ? `#${item.authorization_number}` : null]
                .filter(Boolean).join(' · ')}
            </Text>
          )}
          {expiry && (
            <View style={[styles.badge, styles.expiryBadge, { backgroundColor: expiry.bg }]}>
              <Text style={[styles.badgeText, { color: expiry.color }]}>⏳ {expiry.text}</Text>
            </View>
          )}
          {item.status === 'denied' && item.denial_reason ? (
            <Text style={styles.denialReason}>Denial reason: {item.denial_reason}</Text>
          ) : null}
        </TouchableOpacity>
        {(item.status === 'denied' || item.status === 'appealing') && (
          <TouchableOpacity
            style={styles.appealButton}
            onPress={() => handleAppeal(item)}
            accessibilityRole="button"
            accessibilityLabel={`Generate an appeal letter for ${item.service}`}
          >
            <Text style={styles.appealButtonText}>⚖️ Generate appeal letter</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={renderAuth}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Plan / card details */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>
                  🪪 {family?.insurance_carrier ? `${family.insurance_carrier} plan` : 'Your plan'}
                </Text>
                <TouchableOpacity onPress={openPlanEditor} accessibilityRole="button" accessibilityLabel="Edit plan details">
                  <Text style={styles.planEdit}>{editingPlan ? '' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
              {editingPlan ? (
                <View style={styles.planForm}>
                  <Text style={styles.fieldLabel}>Member ID</Text>
                  <TextInput style={styles.input} value={memberId} onChangeText={setMemberId} placeholder="e.g. XDP123456789" placeholderTextColor={colors.mid} autoCapitalize="characters" />
                  <Text style={styles.fieldLabel}>Group number</Text>
                  <TextInput style={styles.input} value={groupNumber} onChangeText={setGroupNumber} placeholder="e.g. 0071523" placeholderTextColor={colors.mid} />
                  <Text style={styles.fieldLabel}>Member services phone</Text>
                  <TextInput style={styles.input} value={insurancePhone} onChangeText={setInsurancePhone} placeholder="e.g. (800) 555-0134" placeholderTextColor={colors.mid} keyboardType="phone-pad" />
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSavePlan}>
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingPlan(false)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.planGrid}>
                    <PlanField label="Member ID" value={family?.insurance_member_id} />
                    <PlanField label="Group #" value={family?.insurance_group_number} />
                  </View>
                  {family?.insurance_phone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${family.insurance_phone}`)}
                      accessibilityRole="link"
                      accessibilityLabel={`Call member services at ${family.insurance_phone}`}
                    >
                      <Text style={styles.planPhone}>📞 {family.insurance_phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={() => navigation.navigate('Documents')} accessibilityRole="button">
                    <Text style={styles.planDocsHint}>📷 Keep card photos in Documents →</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Authorizations & denials</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => { setEditing(null); setShowForm(true); }}
                accessibilityRole="button"
                accessibilityLabel="Add an authorization or denial record"
              >
                <Text style={styles.addButtonText}>＋ Add</Text>
              </TouchableOpacity>
            </View>

            {loading && authorizations.length === 0 ? <SkeletonCard /> : null}
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              emoji="🏥"
              title="Track every authorization"
              subtitle="Add each service your insurance authorizes (or denies). Waypoint counts down to expirations, reminds you to renew 21 days out, and turns denials into appeal letters."
            />
          )
        }
      />

      <AuthorizationForm
        visible={showForm}
        existing={editing}
        onClose={() => setShowForm(false)}
        onSubmit={async (input) => {
          const ok = editing
            ? await updateAuthorization(editing.id, input)
            : await addAuthorization(input);
          showToast(
            ok
              ? input.end_date && (input.status === 'active' || input.status === 'pending')
                ? 'Saved — renewal reminder set'
                : 'Saved'
              : "Couldn't save — please try again",
            ok ? 'success' : 'error'
          );
          if (ok) setShowForm(false);
        }}
        onDelete={editing ? () => { setShowForm(false); handleDelete(editing); } : undefined}
      />
    </SafeAreaView>
  );
}

function PlanField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.planField}>
      <Text style={styles.planFieldLabel}>{label}</Text>
      <Text style={styles.planFieldValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Add / edit form ─────────────────────────────────────────────────────────

interface AuthorizationFormProps {
  visible: boolean;
  existing: InsuranceAuthorization | null;
  onClose: () => void;
  onSubmit: (input: AuthorizationInput) => Promise<void>;
  onDelete?: () => void;
}

function AuthorizationForm({ visible, existing, onClose, onSubmit, onDelete }: AuthorizationFormProps) {
  const [service, setService] = useState('');
  const [providerName, setProviderName] = useState('');
  const [authNumber, setAuthNumber] = useState('');
  const [status, setStatus] = useState<AuthorizationStatus>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [denialDate, setDenialDate] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  // Prefill whenever the sheet opens
  React.useEffect(() => {
    if (!visible) return;
    setService(existing?.service ?? '');
    setProviderName(existing?.provider_name ?? '');
    setAuthNumber(existing?.authorization_number ?? '');
    setStatus(existing?.status ?? 'active');
    setStartDate(existing?.start_date ?? '');
    setEndDate(existing?.end_date ?? '');
    setDenialDate(existing?.denial_date ?? '');
    setDenialReason(existing?.denial_reason ?? '');
    setNotes(existing?.notes ?? '');
    setValidation(null);
  }, [visible, existing]);

  const handleSave = async () => {
    if (saving) return;
    if (!service.trim()) {
      setValidation('Describe the service — e.g. "ABA — 20 hrs/wk".');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        service,
        provider_name: providerName,
        authorization_number: authNumber,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        denial_date: denialDate || undefined,
        denial_reason: denialReason || undefined,
        notes: notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const isDenial = status === 'denied' || status === 'appealing';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{existing ? 'Edit record' : 'New authorization'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Service *</Text>
            <TextInput style={styles.input} value={service} onChangeText={setService} placeholder='e.g. ABA — 20 hrs/wk' placeholderTextColor={colors.mid} />

            <Text style={styles.fieldLabel}>Provider</Text>
            <TextInput style={styles.input} value={providerName} onChangeText={setProviderName} placeholder="e.g. Bright Steps Therapy" placeholderTextColor={colors.mid} />

            <Text style={styles.fieldLabel}>Authorization / reference #</Text>
            <TextInput style={styles.input} value={authNumber} onChangeText={setAuthNumber} placeholder="From the approval or denial letter" placeholderTextColor={colors.mid} />

            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusRow}>
              {STATUS_ORDER.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusPill, status === s && { backgroundColor: STATUS_CONFIG[s].bg, borderColor: STATUS_CONFIG[s].color }]}
                  onPress={() => setStatus(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === s }}
                >
                  <Text style={[styles.statusPillText, status === s && { color: STATUS_CONFIG[s].color, fontWeight: '700' }]}>
                    {STATUS_CONFIG[s].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.fieldLabel}>Start date</Text>
                <DateInput value={startDate} onChange={setStartDate} />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.fieldLabel}>Expires</Text>
                <DateInput value={endDate} onChange={setEndDate} />
              </View>
            </View>
            {endDate && (status === 'active' || status === 'pending') ? (
              <Text style={styles.reminderHint}>
                ⏰ A renewal reminder will be set for 21, 14, 7, and 1 days before this date.
              </Text>
            ) : null}

            {isDenial && (
              <>
                <Text style={styles.fieldLabel}>Denial date</Text>
                <DateInput value={denialDate} onChange={setDenialDate} />
                <Text style={styles.fieldLabel}>Denial reason (from the letter)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={denialReason}
                  onChangeText={setDenialReason}
                  multiline
                  textAlignVertical="top"
                  placeholder='e.g. "Not medically necessary"'
                  placeholderTextColor={colors.mid}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              placeholder="Units approved, who you spoke to, next steps…"
              placeholderTextColor={colors.mid}
            />

            {validation && <Text style={styles.validationText}>{validation}</Text>}

            <TouchableOpacity
              style={[styles.saveButton, styles.saveButtonWide, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={existing ? 'Save changes' : 'Add record'}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Add record'}</Text>
            </TouchableOpacity>

            {onDelete && (
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete this record">
                <Text style={styles.deleteText}>Delete record</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  planCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  planTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  planEdit: { fontSize: fonts.sizes.sm, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  planGrid: { flexDirection: 'row', gap: spacing.lg },
  planField: { flex: 1 },
  planFieldLabel: { fontSize: 10, color: colors.mid, textTransform: 'uppercase', letterSpacing: 0.5 },
  planFieldValue: { fontSize: fonts.sizes.sm, color: colors.dark, fontWeight: fonts.weights.medium as '500', marginTop: 2 },
  planPhone: { fontSize: fonts.sizes.sm, color: colors.teal, fontWeight: fonts.weights.medium as '500', marginTop: spacing.sm },
  planDocsHint: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: spacing.sm },
  planForm: { gap: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  addButton: { backgroundColor: colors.teal, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 6, minHeight: 32, justifyContent: 'center' },
  addButtonText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  authCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  authHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  authService: { flex: 1, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold as '600', color: colors.navy, lineHeight: 20 },
  authMeta: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  badgeText: { fontSize: 11, fontWeight: fonts.weights.semibold as '600' },
  expiryBadge: { marginTop: spacing.sm },
  denialReason: { fontSize: fonts.sizes.xs, color: '#DC2626', marginTop: spacing.sm, fontStyle: 'italic' },
  appealButton: {
    marginTop: spacing.sm, backgroundColor: '#7C3AED', borderRadius: radii.md,
    paddingVertical: spacing.sm, alignItems: 'center', minHeight: 40, justifyContent: 'center',
  },
  appealButtonText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  closeX: { fontSize: 18, color: colors.mid, padding: 4 },
  fieldLabel: {
    fontSize: fonts.sizes.xs, fontWeight: fonts.weights.semibold as '600', color: colors.mid,
    textTransform: 'uppercase', marginTop: spacing.md, marginBottom: 4,
  },
  input: {
    backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark,
  },
  notesInput: { minHeight: 64 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusPill: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.full,
    backgroundColor: colors.light, borderWidth: 1, borderColor: colors.light, minHeight: 32, justifyContent: 'center',
  },
  statusPillText: { fontSize: 12, color: colors.dark },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  dateCol: { flex: 1 },
  reminderHint: { fontSize: fonts.sizes.xs, color: '#047857', marginTop: spacing.sm },
  validationText: { fontSize: fonts.sizes.xs, color: '#DC2626', marginTop: spacing.sm },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  saveButton: {
    backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, minHeight: 40, justifyContent: 'center', alignItems: 'center',
  },
  saveButtonWide: { marginTop: spacing.lg },
  saveText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  cancelButton: {
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 40, justifyContent: 'center',
  },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.dark },
  deleteButton: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm, minHeight: 36, justifyContent: 'center' },
  deleteText: { fontSize: fonts.sizes.sm, color: '#DC2626' },
});
