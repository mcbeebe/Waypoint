/**
 * Profile settings screen — ported from GAS MVP renderProfile()
 * Editable: parent name, email, child name, ZIP, diagnosis, RC/IEP/insurance status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import DiagnosisSelector from '@/components/DiagnosisSelector';
import DateInput from '@/components/DateInput';
import SelectGrid from '@/components/SelectGrid';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { reseedStarterPlan } from '@/lib/planGenerator';
import { exportFamilyData } from '@/lib/dataExport';
import { closeObsoleteActions } from '@/lib/actionReconcile';
import { lookupRC } from '@/data/regionalCenters';
import { signOut } from '@/lib/auth';
import { unregisterPushToken } from '@/lib/pushTokens';
import {
  connectGmailWeb,
  disconnectGoogleWeb,
  isGoogleConnectedWeb,
} from '@/lib/googleAuth';
import { supabase } from '@/lib/supabase';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { useToast } from '@/components/Toast';
import { useTextScale } from '@/lib/textSize';
import { useMemories, type MemoryKind } from '@/hooks/useMemories';
import ContactsCard from '@/components/ContactsCard';
import { resetTutorial } from '@/components/OnboardingTutorial';
import { useI18n } from '@/i18n';
import type { SupportedLocale } from '@/i18n';
import { usePremiumGuard } from '@/hooks/usePremiumGuard';
import type { Child } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Options (same as onboarding) ────────────────────────────────────────────

const RC_STATUS_OPTIONS = [
  { value: 'unknown', label: "Don't know", emoji: '❓' },
  { value: 'known', label: 'Know my RC', emoji: '📍' },
  { value: 'applied', label: 'Applied', emoji: '📝' },
  { value: 'active', label: 'Active', emoji: '✅' },
];

const IEP_STATUS_OPTIONS = [
  { value: 'no', label: 'No IEP', emoji: '📭' },
  { value: 'unknown', label: "Don't know", emoji: '❓' },
  { value: 'eval_done', label: 'Eval done', emoji: '🔍' },
  { value: 'active', label: 'Active IEP', emoji: '✅' },
  { value: 'na', label: 'N/A', emoji: '➖' },
];

const INSURANCE_OPTIONS = [
  { value: 'private', label: 'Private', emoji: '🏥' },
  { value: 'medicaid', label: 'Medi-Cal', emoji: '🏛️' },
  { value: 'both', label: 'Both', emoji: '🔄' },
  { value: 'none', label: 'None', emoji: '❓' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English', emoji: '🇺🇸' },
  { value: 'es', label: 'Espa\u00f1ol', emoji: '🇲🇽' },
  { value: 'vi', label: 'Ti\u1ebfng Vi\u1ec7t', emoji: '🇻🇳' },
];

// ─── Component ───────────────────────────────────────────────────────────────

const MEMORY_KIND_EMOJI: Record<MemoryKind, string> = {
  fact: '📌',
  preference: '💬',
  situation: '🔄',
  gap: '💡',
};

export default function ProfileScreen() {
  const { family, updateFamily, loading: familyLoading } = useFamily();
  const { children, addChild, updateChild, deleteChild } = useChildren(family?.id);
  const { guard } = usePremiumGuard();
  const primaryChild = children.find(c => c.is_primary) || children[0];
  const { diagnoses, setDiagnoses } = useDiagnoses(primaryChild?.id);
  const { t, locale, setLocale } = useI18n();
  const { scale, cycleScale } = useTextScale();
  const { showToast } = useToast();
  const { memories, forgetMemory, forgetAll } = useMemories(family?.id);

  const [saving, setSaving] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [schoolDistrict, setSchoolDistrict] = useState('');
  // Child editing (P1): inline edit per child row
  const [phone, setPhone] = useState('');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildDob, setEditChildDob] = useState('');
  const [editChildSchool, setEditChildSchool] = useState('');
  const [editChildGrade, setEditChildGrade] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [rcStatus, setRcStatus] = useState('');
  const [iepStatus, setIepStatus] = useState('');
  const [insurance, setInsurance] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [addingChild, setAddingChild] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportData = useCallback(async () => {
    if (!family?.id || exporting) return;
    setExporting(true);
    try {
      const result = await exportFamilyData(family.id);
      showToast(
        result.ok ? 'Export ready — check your downloads' : result.error ?? 'Export failed',
        result.ok ? 'success' : 'error'
      );
    } finally {
      setExporting(false);
    }
  }, [family?.id, exporting, showToast]);

  // Populate form from database
  useEffect(() => {
    if (family) {
      setParentName(family.parent_first_name || '');
      setParentLastName(family.parent_last_name || '');
      setEmail(family.email || '');
      setPhone(family.phone || '');
      setZipCode(family.zip_code || '');
      setSchoolDistrict(family.school_district || '');
      setInsurance(family.insurance_carrier || '');
    }
  }, [family]);

  useEffect(() => {
    if (primaryChild) {
      setChildName(primaryChild.first_name || '');
      setRcStatus(primaryChild.rc_status || '');
      setIepStatus(primaryChild.iep_status || '');
    }
  }, [primaryChild]);

  useEffect(() => {
    if (diagnoses.length > 0) {
      setSelectedDiagnoses(diagnoses.map(d => d.name));
    }
  }, [diagnoses]);

  /**
   * Auto-save intake selections (RC/IEP status, insurance, diagnoses) the
   * moment they're tapped. Tap-grids read as instant toggles — nobody
   * scrolls to a Save button for them — and RN's Alert is a no-op on web,
   * so failures used to vanish silently. Text fields still use Save Changes.
   */
  const persistIntake = useCallback(async (
    patch: { rcStatus?: string; iepStatus?: string; insurance?: string; diagnoses?: string[] }
  ) => {
    const nextRc = patch.rcStatus ?? rcStatus;
    const nextIep = patch.iepStatus ?? iepStatus;
    const nextIns = patch.insurance ?? insurance;
    const nextDx = patch.diagnoses ?? selectedDiagnoses;

    let ok = true;
    if (primaryChild && (patch.rcStatus !== undefined || patch.iepStatus !== undefined)) {
      ok = await updateChild(primaryChild.id, {
        rc_status: (nextRc || null) as Child['rc_status'],
        iep_status: (nextIep || null) as Child['iep_status'],
      });
    }
    if (patch.insurance !== undefined) {
      ok = (await updateFamily({ insurance_carrier: nextIns })) && ok;
    }
    if (primaryChild && patch.diagnoses !== undefined) {
      ok = (await setDiagnoses(primaryChild.id, nextDx)) && ok;
    }
    if (!ok) {
      showToast("Couldn't save that change — please try again", 'error');
      return;
    }
    showToast('Saved', 'success');

    // Intake changes refresh the starter plan and retire the steps these
    // answers just made obsolete. Best-effort and in the background: the
    // selection itself is already stored.
    if (family && primaryChild) {
      reseedStarterPlan(family.id, primaryChild.id, {
        diagnoses: nextDx,
        birthday: primaryChild.date_of_birth ? new Date(primaryChild.date_of_birth + 'T00:00:00') : null,
        rcStatus: nextRc,
        iepStatus: nextIep,
        insurance: nextIns,
        childName: childName.trim() || primaryChild.first_name,
        parentName: parentName.trim(),
        zipCode: zipCode.trim() || undefined,
      })
        .then(() =>
          closeObsoleteActions(family.id, {
            rcStatus: nextRc,
            iepStatus: nextIep,
            insurance: nextIns,
          })
        )
        .then((closed) => {
          if (closed.length > 0) {
            showToast(
              `${closed.length} action${closed.length === 1 ? '' : 's'} closed — no longer needed`,
              'success'
            );
          }
        })
        .catch(() => {});
    }
  }, [rcStatus, iepStatus, insurance, selectedDiagnoses, primaryChild, family, childName, parentName, zipCode, updateChild, updateFamily, setDiagnoses, showToast]);

  const toggleDiagnosis = (value: string) => {
    const next = selectedDiagnoses.includes(value)
      ? selectedDiagnoses.filter(d => d !== value)
      : [...selectedDiagnoses, value];
    setSelectedDiagnoses(next);
    void persistIntake({ diagnoses: next });
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Detect intake changes BEFORE writing — they trigger a plan reseed
      const intakeChanged =
        primaryChild != null &&
        ((primaryChild.rc_status || '') !== rcStatus ||
          (primaryChild.iep_status || '') !== iepStatus ||
          (family?.insurance_carrier || '') !== insurance ||
          diagnoses.map(d => d.name).sort().join(',') !== [...selectedDiagnoses].sort().join(','));

      // Update family — re-resolve the Regional Center from the (new) ZIP,
      // mirroring the GAS MVP's re-lookup on every profile save
      const rc = zipCode.trim() ? lookupRC(zipCode.trim()) : null;
      const okFamily = await updateFamily({
        parent_first_name: parentName.trim(),
        parent_last_name: parentLastName.trim() || null,
        email: email.trim(),
        phone: phone.trim() || null,
        zip_code: zipCode.trim() || null,
        school_district: schoolDistrict.trim() || null,
        regional_center: rc?.name ?? family?.regional_center ?? null,
        insurance_carrier: insurance,
      });

      // Update child record — name + intake statuses (migration 012 columns)
      let okChild = true;
      let okDx = true;
      if (primaryChild) {
        okChild = await updateChild(primaryChild.id, {
          first_name: childName.trim() || primaryChild.first_name,
          rc_status: (rcStatus || null) as Child['rc_status'],
          iep_status: (iepStatus || null) as Child['iep_status'],
        });
        okDx = await setDiagnoses(primaryChild.id, selectedDiagnoses);
      }

      // The hooks swallow DB errors into a return value — surface them,
      // visibly on web too (RN Alert is a no-op in the browser)
      if (!okFamily || !okChild || !okDx) {
        showToast("Some changes couldn't be saved — please try again", 'error');
        return;
      }

      // Mirror the GAS MVP: intake changes regenerate the starter plan
      // (untouched system actions replaced; started/completed work preserved)
      if (intakeChanged && family && primaryChild) {
        await reseedStarterPlan(family.id, primaryChild.id, {
          diagnoses: selectedDiagnoses,
          birthday: primaryChild.date_of_birth ? new Date(primaryChild.date_of_birth + 'T00:00:00') : null,
          rcStatus,
          iepStatus,
          insurance,
          childName: childName.trim(),
          parentName: parentName.trim(),
          zipCode: zipCode.trim() || undefined,
        });
      }

      // Retire the steps these answers just made obsolete (visible in the
      // Dismissed filter with the reason, never silently deleted)
      let closedCount = 0;
      if (intakeChanged && family) {
        const closed = await closeObsoleteActions(family.id, {
          rcStatus,
          iepStatus,
          insurance,
        });
        closedCount = closed.length;
      }

      showToast(
        !intakeChanged
          ? 'Profile updated'
          : closedCount > 0
            ? `Profile updated — plan refreshed, ${closedCount} action${closedCount === 1 ? '' : 's'} closed as no longer needed`
            : 'Profile updated — action plan refreshed to match',
        'success'
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  }, [parentName, parentLastName, email, phone, zipCode, schoolDistrict, insurance, selectedDiagnoses, rcStatus, iepStatus, childName, primaryChild, family, diagnoses, updateFamily, updateChild, setDiagnoses, showToast]);

  const handleAddChild = useCallback(async () => {
    // Premium (E3): the first child is free forever; additional children
    // are part of multi-child support
    if (children.length >= 1 && !guard('Multi-child support')) return;
    const name = newChildName.trim();
    if (!name) {
      showToast("Please enter the child's first name", 'error');
      return;
    }
    setAddingChild(true);
    try {
      const created = await addChild({
        first_name: name,
        is_primary: false,
        date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(newChildDob) ? newChildDob : null,
      });
      if (created) {
        setNewChildName('');
        setShowAddChild(false);
        showToast(`${name} has been added to your family`, 'success');
      } else {
        showToast('Could not add child — please try again', 'error');
      }
    } finally {
      setAddingChild(false);
    }
  }, [newChildName, addChild, children.length, guard]);

  // ─── Google account (web) ─────────────────────────────────────────
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email: string | null }>({
    connected: false,
    email: null,
  });
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    isGoogleConnectedWeb().then(setGoogleStatus);
  }, []);

  const handleConnectGoogle = useCallback(async () => {
    setGoogleBusy(true);
    // The Settings connection is the FULL one — Calendar + Gmail (send +
    // readonly) in a single consent — so a parent connects everything in one
    // place instead of hunting for a separate Gmail button (owner, Aug 31).
    const result = await connectGmailWeb('/profile');
    // On success the browser redirects to Google — this code only runs on failure.
    setGoogleBusy(false);
    if (!result.success) {
      showAlert(
        'Could not connect Google',
        result.error?.includes('not enabled')
          ? 'Google sign-in is not configured yet — check the Supabase Google provider setup.'
          : result.error ?? 'Please try again.'
      );
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    const ok = await showConfirm(
      'Disconnect Google?',
      'Calendar sync, sending, and reply tracking will stop working until you reconnect.',
      'Disconnect',
      true
    );
    if (!ok) return;
    setGoogleBusy(true);
    const result = await disconnectGoogleWeb();
    setGoogleBusy(false);
    if (result.success) {
      setGoogleStatus({ connected: false, email: null });
    } else {
      showAlert('Could not disconnect', result.error ?? 'Please try again.');
    }
  }, []);

  const handleToggleAIConsent = useCallback(async () => {
    if (family?.ai_consent_at) {
      const ok = await showConfirm(
        'Turn off AI features?',
        'The AI Navigator and document analysis will stop working until you turn this back on. Everything you have saved stays yours.',
        'Turn off',
        true
      );
      if (!ok) return;
      const saved = await updateFamily({ ai_consent_at: null });
      if (!saved) showAlert('Could not save', 'Please try again in a moment.');
    } else {
      const saved = await updateFamily({ ai_consent_at: new Date().toISOString() });
      if (saved) {
        showAlert('AI features enabled', 'You can turn this off here any time.');
      } else {
        showAlert(
          'Could not enable AI features',
          'The server rejected the change — if this keeps happening, the latest database migration may not be applied yet.'
        );
      }
    }
  }, [family?.ai_consent_at, updateFamily]);

  const handleDeleteAccount = useCallback(async () => {
    const first = await showConfirm(
      'Delete your account?',
      'This permanently deletes your account and ALL data — children, action plans, documents, chats. This cannot be undone.',
      'Delete everything',
      true
    );
    if (!first) return;
    const second = await showConfirm(
      'Are you absolutely sure?',
      'There is no way to recover your data after this.',
      'Yes, delete permanently',
      true
    );
    if (!second) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? '';
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showAlert('Deletion failed', err?.error ?? 'Please try again or email support.');
        return;
      }
      await signOut();
    } catch {
      showAlert('Deletion failed', 'Please check your connection and try again.');
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    const ok = await showConfirm('Sign Out', 'Are you sure you want to sign out?', 'Sign Out');
    if (!ok) return;
    // Remove this device's push token first (needs the session): signing out is
    // a consent withdrawal, and it also stops the next signed-in family from
    // inheriting this device's server pushes (phase 7 Lane B).
    await unregisterPushToken();
    await signOut();
  }, []);

  if (familyLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t.profile.title}</Text>

        {/* Family Info Section */}
        <Text style={styles.sectionTitle}>Family Info</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel} nativeID="label-parent-name">Your first name</Text>
          <TextInput
            style={styles.input}
            value={parentName}
            onChangeText={setParentName}
            placeholder="e.g., Sarah"
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel="Your first name"
          />

          <Text style={styles.inputLabel} nativeID="label-parent-last-name">Your last name</Text>
          <TextInput
            style={styles.input}
            value={parentLastName}
            onChangeText={setParentLastName}
            placeholder="Used to sign generated letters"
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel="Your last name"
          />

          <Text style={styles.inputLabel} nativeID="label-email">Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="For deadline reminders"
            placeholderTextColor={colors.mid}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email address"
          />

          <Text style={styles.inputLabel} nativeID="label-phone">Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Auto-fills into letters and emails"
            placeholderTextColor={colors.mid}
            keyboardType="phone-pad"
            accessibilityLabel="Your phone number"
          />

          <Text style={styles.inputLabel} nativeID="label-child-name">Child's first name</Text>
          <TextInput
            style={styles.input}
            value={childName}
            onChangeText={setChildName}
            placeholder="e.g., Maya"
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel="Child's first name"
          />

          <Text style={styles.inputLabel} nativeID="label-zip">ZIP code</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="e.g., 94610"
            placeholderTextColor={colors.mid}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel="ZIP code"
          />

          <Text style={styles.inputLabel} nativeID="label-school-district">School district</Text>
          <TextInput
            style={styles.input}
            value={schoolDistrict}
            onChangeText={setSchoolDistrict}
            placeholder="e.g., Oakland Unified"
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel="School district"
          />
        </View>

        {/* Key contacts (D4): the child's team, auto-filled into letters/emails */}
        {family?.id && (
          <>
            <Text style={styles.sectionTitle}>Key Contacts</Text>
            <ContactsCard familyId={family.id} />
          </>
        )}

        {/* Children */}
        <Text style={styles.sectionTitle}>Children</Text>
        <View style={styles.card}>
          {children.map(c => (
            <View key={c.id} style={styles.childRow}>
              {editingChildId === c.id ? (
                <View>
                  <Text style={styles.inputLabel}>First name</Text>
                  <TextInput
                    style={styles.input}
                    value={editChildName}
                    onChangeText={setEditChildName}
                    autoCapitalize="words"
                    accessibilityLabel="Child's first name"
                  />
                  <Text style={styles.inputLabel}>Birthday</Text>
                  <DateInput value={editChildDob} onChange={setEditChildDob} />
                  <Text style={styles.inputLabel}>School</Text>
                  <TextInput
                    style={styles.input}
                    value={editChildSchool}
                    onChangeText={setEditChildSchool}
                    placeholder="e.g., Glenview Elementary"
                    placeholderTextColor={colors.mid}
                    autoCapitalize="words"
                    accessibilityLabel="School name"
                  />
                  <Text style={styles.inputLabel}>Grade</Text>
                  <TextInput
                    style={styles.input}
                    value={editChildGrade}
                    onChangeText={setEditChildGrade}
                    placeholder="e.g., 3rd"
                    placeholderTextColor={colors.mid}
                    accessibilityLabel="Grade"
                  />
                  <View style={styles.addChildButtons}>
                    <Button
                      title="Save"
                      variant="primary"
                      onPress={async () => {
                        if (!editChildName.trim()) return;
                        const ok = await updateChild(c.id, {
                          first_name: editChildName.trim(),
                          date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(editChildDob) ? editChildDob : null,
                          school_name: editChildSchool.trim() || null,
                          grade: editChildGrade.trim() || null,
                        });
                        showToast(ok ? 'Child updated' : "Couldn't save — try again.", ok ? 'success' : 'error');
                        if (ok) setEditingChildId(null);
                      }}
                    />
                    <Button title="Cancel" variant="outline" onPress={() => setEditingChildId(null)} />
                  </View>
                  <View style={styles.childManageRow}>
                    {!c.is_primary && (
                      <TouchableOpacity
                        onPress={async () => {
                          // One primary at a time: demote others, promote this one
                          for (const other of children.filter(o => o.is_primary && o.id !== c.id)) {
                            await updateChild(other.id, { is_primary: false });
                          }
                          const ok = await updateChild(c.id, { is_primary: true });
                          showToast(ok ? `${c.first_name} is now the primary child` : "Couldn't update.", ok ? 'success' : 'error');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Make ${c.first_name} the primary child`}
                      >
                        <Text style={styles.childManageLink}>⭐ Make primary</Text>
                      </TouchableOpacity>
                    )}
                    {children.length > 1 && (
                      <TouchableOpacity
                        onPress={async () => {
                          const confirmed = await showConfirm(
                            `Remove ${c.first_name}?`,
                            'Their profile and diagnoses will be removed. Actions and documents stay but lose the child link.',
                            'Remove',
                            true
                          );
                          if (!confirmed) return;
                          const ok = await deleteChild(c.id);
                          showToast(ok ? `${c.first_name} removed` : "Couldn't remove — try again.", ok ? 'success' : 'error');
                          if (ok) setEditingChildId(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${c.first_name}`}
                      >
                        <Text style={[styles.childManageLink, styles.childManageDanger]}>Remove child</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.childRowTap}
                  onPress={() => {
                    setEditingChildId(c.id);
                    setEditChildName(c.first_name ?? '');
                    setEditChildDob(c.date_of_birth ?? '');
                    setEditChildSchool(c.school_name ?? '');
                    setEditChildGrade(c.grade ?? '');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${c.first_name}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childName}>
                      {c.first_name}
                      {c.is_primary ? '  ⭐' : ''}
                    </Text>
                    {c.date_of_birth ? (
                      <Text style={styles.childDob}>Born {c.date_of_birth}</Text>
                    ) : null}
                    {c.school_name || c.grade ? (
                      <Text style={styles.childDob}>
                        {[c.school_name, c.grade ? `${c.grade} grade` : null].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.childEditHint}>Edit ›</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {showAddChild ? (
            <View>
              <Text style={styles.inputLabel}>New child's first name</Text>
              <TextInput
                style={styles.input}
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="e.g., Leo"
                placeholderTextColor={colors.mid}
                autoCapitalize="words"
                accessibilityLabel="New child's first name"
              />
              <Text style={styles.inputLabel}>Birthday (optional)</Text>
              <DateInput value={newChildDob} onChange={setNewChildDob} />
              <View style={styles.addChildButtons}>
                <Button title="Add" onPress={handleAddChild} loading={addingChild} disabled={addingChild} variant="primary" />
                <Button title="Cancel" onPress={() => { setShowAddChild(false); setNewChildName(''); setNewChildDob(''); }} variant="outline" />
              </View>
            </View>
          ) : (
            <Button title="＋ Add a child" onPress={() => setShowAddChild(true)} variant="outline" />
          )}
        </View>

        {/* Diagnosis Section */}
        <Text style={styles.sectionTitle}>Diagnosis</Text>
        <View style={styles.card}>
          <DiagnosisSelector
            selected={selectedDiagnoses}
            onToggle={toggleDiagnosis}
          />
        </View>

        {/* RC Status */}
        <Text style={styles.sectionTitle}>Regional Center Status</Text>
        <View style={styles.card}>
          <SelectGrid
            options={RC_STATUS_OPTIONS}
            selected={rcStatus}
            onSelect={(v: string) => { setRcStatus(v); void persistIntake({ rcStatus: v }); }}
            columns={2}
          />
        </View>

        {/* IEP Status */}
        <Text style={styles.sectionTitle}>IEP Status</Text>
        <View style={styles.card}>
          <SelectGrid
            options={IEP_STATUS_OPTIONS}
            selected={iepStatus}
            onSelect={(v: string) => { setIepStatus(v); void persistIntake({ iepStatus: v }); }}
            columns={2}
          />
        </View>

        {/* Insurance */}
        <Text style={styles.sectionTitle}>Insurance</Text>
        <View style={styles.card}>
          <SelectGrid
            options={INSURANCE_OPTIONS}
            selected={insurance}
            onSelect={(v: string) => { setInsurance(v); void persistIntake({ insurance: v }); }}
            columns={2}
          />
        </View>

        {/* Language — wired to i18n context */}
        <Text style={styles.sectionTitle}>{t.profile.language}</Text>
        <View style={styles.card}>
          <SelectGrid
            options={LANGUAGE_OPTIONS}
            selected={locale}
            onSelect={(val: string) => setLocale(val as SupportedLocale)}
            columns={3}
          />
        </View>

        {/* Save + Sign Out */}
        <View style={styles.buttonRow}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            variant="primary"
          />
        </View>

        {/* Accessibility & display */}
        <Text style={styles.sectionTitle}>Display & Accessibility</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingBody}>
              <Text style={styles.settingLabel}>Text size</Text>
              <Text style={styles.settingHint}>Applies to reading-heavy screens like actions and analyses.</Text>
            </View>
            <TouchableOpacity
              style={styles.textSizePill}
              onPress={cycleScale}
              accessibilityRole="button"
              accessibilityLabel={`Text size ${Math.round(scale * 100)} percent. Tap to change.`}
            >
              <Text style={styles.textSizePillText}>Aa {Math.round(scale * 100)}%</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingBody}>
              <Text style={styles.settingLabel}>App tour</Text>
              <Text style={styles.settingHint}>Replay the 4-step feature intro on the Home screen.</Text>
            </View>
            <TouchableOpacity
              style={styles.textSizePill}
              onPress={async () => {
                await resetTutorial();
                showToast('Tour will replay next time you open Home.', 'success');
              }}
              accessibilityRole="button"
              accessibilityLabel="Replay the app tour"
            >
              <Text style={styles.textSizePillText}>Replay</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & AI */}
        <Text style={styles.sectionTitle}>Privacy & AI</Text>
        <View style={styles.card}>
          <Text style={styles.privacyStatus}>
            AI features (Navigator, document analysis) are{' '}
            <Text style={{ fontWeight: '700' }}>{family?.ai_consent_at ? 'ON' : 'OFF'}</Text>.
            {family?.ai_consent_at
              ? ' Your questions, your child’s age/diagnoses, and documents you analyze are processed by Anthropic to generate guidance.'
              : ' Nothing is sent to the AI provider while this is off.'}
          </Text>
          <Button
            title={family?.ai_consent_at ? 'Turn off AI features' : 'Enable AI features'}
            onPress={handleToggleAIConsent}
            variant="outline"
          />
        </View>

        {/* Data export — everything the family owns, as one JSON file */}
        <Text style={styles.sectionTitle}>Your Data</Text>
        <View style={styles.card}>
          <Text style={styles.privacyStatus}>
            Download everything Waypoint stores for your family — profile, children, actions,
            appointments, expenses, chats, contacts, and more — as a single JSON file.
            Document files stay in Documents, where you can download them individually.
          </Text>
          <Button
            title={exporting ? 'Preparing export…' : '⬇️ Export my data'}
            onPress={handleExportData}
            variant="outline"
            disabled={exporting}
          />
        </View>

        {/* What Waypoint knows (P2): the AI's memory of this family, with
            full parent control — every memory visible and deletable */}
        {family?.ai_consent_at && (
          <>
            <Text style={styles.sectionTitle}>What Waypoint Knows</Text>
            <View style={styles.card}>
              <Text style={styles.privacyStatus}>
                As you chat, Waypoint remembers durable details — services in place, things
                in progress, preferences — so it understands your family better over time.
                You control this list: tap ✕ to make it forget anything.
              </Text>
              {memories.length === 0 ? (
                <Text style={styles.memoryEmpty}>
                  Nothing saved yet — memories appear after your next AI Navigator chat.
                </Text>
              ) : (
                <>
                  {memories.map((m) => (
                    <View key={m.id} style={styles.memoryRow}>
                      <Text style={styles.memoryKind}>{MEMORY_KIND_EMOJI[m.kind]}</Text>
                      <Text style={styles.memoryText}>{m.content}</Text>
                      <TouchableOpacity
                        style={styles.memoryForget}
                        onPress={async () => {
                          const ok = await forgetMemory(m.id);
                          showToast(ok ? 'Forgotten' : "Couldn't remove — try again.", ok ? 'success' : 'error');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Forget: ${m.content}`}
                      >
                        <Text style={styles.memoryForgetText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={async () => {
                      const confirmed = await showConfirm(
                        'Forget everything?',
                        'Waypoint will delete all saved memories and start fresh.',
                        'Forget all',
                        true
                      );
                      if (!confirmed) return;
                      const ok = await forgetAll();
                      showToast(ok ? 'All memories forgotten' : "Couldn't clear — try again.", ok ? 'success' : 'error');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Forget all memories"
                    style={styles.memoryForgetAll}
                  >
                    <Text style={styles.memoryForgetAllText}>Forget everything</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Google account (Calendar sync + Gmail — Phase 3) */}
        {Platform.OS === 'web' && (
          <>
            <Text style={styles.sectionTitle}>Google Account</Text>
            <View style={styles.card}>
              <Text style={styles.privacyStatus}>
                {googleStatus.connected
                  ? `Connected as ${googleStatus.email ?? 'your Google account'}. Waypoint can sync your calendar, send emails you approve, and track replies from schools and agencies.`
                  : 'Connect Google to sync appointments to your calendar, send emails to schools and agencies, and track their replies — all from Waypoint.'}
              </Text>
              <Button
                title={
                  googleBusy
                    ? 'Working…'
                    : googleStatus.connected
                      ? 'Disconnect Google'
                      : 'Connect Google (Calendar + Gmail)'
                }
                onPress={googleStatus.connected ? handleDisconnectGoogle : handleConnectGoogle}
                variant="outline"
                disabled={googleBusy}
              />
            </View>
          </>
        )}

        <View style={styles.signOutRow}>
          <Button
            title={t.profile.signOut}
            onPress={handleSignOut}
            variant="outline"
          />
        </View>

        {/* Danger zone */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={styles.deleteRow}
          accessibilityRole="button"
          accessibilityLabel="Delete account and all data"
        >
          <Text style={styles.deleteText}>Delete account & all data</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Waypoint v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 3,
  },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  memoryEmpty: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  memoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  memoryKind: {
    fontSize: 14,
  },
  memoryText: {
    flex: 1,
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    lineHeight: 17,
  },
  memoryForget: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryForgetText: {
    fontSize: 12,
    color: colors.mid,
  },
  memoryForgetAll: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    minHeight: 24,
    justifyContent: 'center',
  },
  memoryForgetAllText: {
    fontSize: fonts.sizes.xs,
    color: '#DC2626',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingBody: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
  },
  settingHint: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 1,
  },
  textSizePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: colors.teal,
    minHeight: 36,
    justifyContent: 'center',
  },
  textSizePillText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.md,
    color: colors.dark,
  },
  childRowTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  childEditHint: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  childManageRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  childManageLink: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
    paddingVertical: 6,
  },
  childManageDanger: {
    color: '#DC2626',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  childName: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
  },
  childDob: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
  addChildButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonRow: {
    marginTop: spacing.xl,
  },
  privacyStatus: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deleteRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  deleteText: {
    color: '#DC2626',
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
  },
  signOutRow: {
    marginTop: spacing.md,
  },
  version: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
