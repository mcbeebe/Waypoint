/**
 * Profile settings screen — ported from GAS MVP renderProfile()
 * Editable: parent name, email, child name, ZIP, diagnosis, RC/IEP/insurance status
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { toFunnelLocale } from '@/lib/eligibility';
import {
  profileCopy,
  profileUpdatedClosed,
  rcStatusOptions,
  iepStatusOptions,
  insuranceOptions,
  editChildLabel,
  removeChildLabel,
  makePrimaryLabel,
  nowPrimaryToast,
  childAddedToast,
  childRemovedToast,
  removeChildTitle,
  removeChildBody,
  removeConfirmLabel,
  forgetMemoryLabel,
  textSizeLabel,
  bornLabel,
  gradeLabel,
  googleConnectedFull,
  googleConnectedCalendarOnly,
  yourGoogleAccount,
} from '@/lib/profileCopy';
import { usePremiumGuard } from '@/hooks/usePremiumGuard';
import type { Child } from '@/types/database';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Options (same as onboarding) ────────────────────────────────────────────
// The three intake grids moved to `@/lib/profileCopy` when this screen was
// localized (initiative 009): their labels are translated per locale while
// their VALUES stay locale-invariant, because the values are what the
// database stores. `profileCopy.test.ts` pins that split.

/** The language picker names each language in itself, so it never translates. */
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
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { family, updateFamily, loading: familyLoading } = useFamily();
  const { children, addChild, updateChild, deleteChild } = useChildren(family?.id);
  const { guard } = usePremiumGuard();
  const primaryChild = children.find(kid => kid.is_primary) || children[0];
  const { diagnoses, setDiagnoses } = useDiagnoses(primaryChild?.id);
  const { t, locale, setLocale } = useI18n();
  // Screen chrome is trilingual via profileCopy; `locale` here is the app
  // language, narrowed to the three the copy is written for.
  const fl = toFunnelLocale(locale);
  // Memoized so the handlers below can depend on it without rebuilding every
  // render. This screen HOSTS the language picker, so `fl` really does change
  // under the user — a handler closing over a stale `copy` would show the
  // previous language's dialog right after they switched.
  const copy = useMemo(() => profileCopy(fl), [fl]);
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
        result.ok ? copy.exportReady : result.error ?? copy.exportFailed,
        result.ok ? 'success' : 'error'
      );
    } finally {
      setExporting(false);
    }
  }, [family?.id, exporting, showToast, copy]);

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
          ? copy.profileUpdated
          : closedCount > 0
            ? profileUpdatedClosed(closedCount, fl)
            : copy.profileUpdatedPlan,
        'success'
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(e.message || copy.saveProfileFailed, 'error');
    } finally {
      setSaving(false);
    }
  }, [parentName, parentLastName, email, phone, zipCode, schoolDistrict, insurance, selectedDiagnoses, rcStatus, iepStatus, childName, primaryChild, family, diagnoses, updateFamily, updateChild, setDiagnoses, showToast, copy, fl]);

  const handleAddChild = useCallback(async () => {
    // Premium (E3): the first child is free forever; additional children
    // are part of multi-child support
    if (children.length >= 1 && !guard(copy.multiChildFeature)) return;
    const name = newChildName.trim();
    if (!name) {
      showToast(copy.enterChildName, 'error');
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
        showToast(childAddedToast(name, fl), 'success');
      } else {
        showToast(copy.childAddFailed, 'error');
      }
    } finally {
      setAddingChild(false);
    }
  }, [newChildName, newChildDob, addChild, children.length, guard, showToast, copy, fl]);

  // ─── Google account (web) ─────────────────────────────────────────
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email: string | null; gmail: boolean }>({
    connected: false,
    email: null,
    gmail: false,
  });
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    isGoogleConnectedWeb().then(setGoogleStatus);
  }, [copy]);

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
        copy.googleConnectFailTitle,
        result.error?.includes('not enabled')
          ? copy.googleNotConfigured
          : result.error ?? copy.tryAgain
      );
    }
  }, [copy]);

  const handleDisconnectGoogle = useCallback(async () => {
    const ok = await showConfirm(
      copy.disconnectGoogleTitle,
      copy.disconnectGoogleBody,
      copy.disconnectConfirm,
      true
    );
    if (!ok) return;
    setGoogleBusy(true);
    const result = await disconnectGoogleWeb();
    setGoogleBusy(false);
    if (result.success) {
      setGoogleStatus({ connected: false, email: null, gmail: false });
    } else {
      showAlert(copy.disconnectFailTitle, result.error ?? copy.tryAgain);
    }
  }, [copy]);

  const handleToggleAIConsent = useCallback(async () => {
    if (family?.ai_consent_at) {
      const ok = await showConfirm(
        copy.aiOffTitle,
        copy.aiOffBody,
        copy.aiOffConfirm,
        true
      );
      if (!ok) return;
      const saved = await updateFamily({ ai_consent_at: null });
      if (!saved) showAlert(copy.couldNotSaveTitle, copy.tryAgainMoment);
    } else {
      const saved = await updateFamily({ ai_consent_at: new Date().toISOString() });
      if (saved) {
        showAlert(copy.aiEnabledTitle, copy.aiEnabledBody);
      } else {
        showAlert(
          copy.aiEnableFailTitle,
          copy.aiEnableFailBody
        );
      }
    }
  }, [family?.ai_consent_at, updateFamily, copy]);

  const handleDeleteAccount = useCallback(async () => {
    const first = await showConfirm(
      copy.deleteTitle,
      copy.deleteBody,
      copy.deleteConfirm,
      true
    );
    if (!first) return;
    const second = await showConfirm(
      copy.deleteSureTitle,
      copy.deleteSureBody,
      copy.deleteSureConfirm,
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
        showAlert(copy.deleteFailTitle, err?.error ?? copy.deleteFailBody);
        return;
      }
      await signOut();
    } catch {
      showAlert(copy.deleteFailTitle, copy.deleteFailOffline);
    }
  }, [copy]);

  const handleSignOut = useCallback(async () => {
    const ok = await showConfirm(copy.signOutTitle, copy.signOutBody, copy.signOutTitle);
    if (!ok) return;
    // Remove this device's push token first (needs the session): signing out is
    // a consent withdrawal, and it also stops the next signed-in family from
    // inheriting this device's server pushes (phase 7 Lane B).
    await unregisterPushToken();
    await signOut();
  }, [copy]);

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
        <Text style={styles.sectionTitle}>{copy.familyInfo}</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel} nativeID="label-parent-name">{copy.yourFirstName}</Text>
          <TextInput
            style={styles.input}
            value={parentName}
            onChangeText={setParentName}
            placeholder={copy.egParentName}
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel={copy.yourFirstName}
          />

          <Text style={styles.inputLabel} nativeID="label-parent-last-name">{copy.yourLastName}</Text>
          <TextInput
            style={styles.input}
            value={parentLastName}
            onChangeText={setParentLastName}
            placeholder={copy.yourLastNameHint}
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel={copy.yourLastName}
          />

          <Text style={styles.inputLabel} nativeID="label-email">{copy.email}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={copy.emailHint}
            placeholderTextColor={colors.mid}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel={copy.emailA11y}
          />

          <Text style={styles.inputLabel} nativeID="label-phone">{copy.phone}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={copy.phoneHint}
            placeholderTextColor={colors.mid}
            keyboardType="phone-pad"
            accessibilityLabel={copy.phoneA11y}
          />

          <Text style={styles.inputLabel} nativeID="label-child-name">{copy.childFirstName}</Text>
          <TextInput
            style={styles.input}
            value={childName}
            onChangeText={setChildName}
            placeholder={copy.egChildName}
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel={copy.childFirstName}
          />

          <Text style={styles.inputLabel} nativeID="label-zip">{copy.zipCode}</Text>
          <TextInput
            style={styles.input}
            value={zipCode}
            onChangeText={setZipCode}
            placeholder={copy.egZip}
            placeholderTextColor={colors.mid}
            keyboardType="number-pad"
            maxLength={5}
            accessibilityLabel={copy.zipCode}
          />

          <Text style={styles.inputLabel} nativeID="label-school-district">{copy.schoolDistrict}</Text>
          <TextInput
            style={styles.input}
            value={schoolDistrict}
            onChangeText={setSchoolDistrict}
            placeholder={copy.egDistrict}
            placeholderTextColor={colors.mid}
            autoCapitalize="words"
            accessibilityLabel={copy.schoolDistrict}
          />
        </View>

        {/* Key contacts (D4): the child's team, auto-filled into letters/emails */}
        {family?.id && (
          <>
            <Text style={styles.sectionTitle}>{copy.keyContacts}</Text>
            <ContactsCard familyId={family.id} />
          </>
        )}

        {/* Children */}
        <Text style={styles.sectionTitle}>{copy.children}</Text>
        <View style={styles.card}>
          {children.map(child => (
            <View key={child.id} style={styles.childRow}>
              {editingChildId === child.id ? (
                <View>
                  <Text style={styles.inputLabel}>{copy.firstName}</Text>
                  <TextInput
                    style={styles.input}
                    value={editChildName}
                    onChangeText={setEditChildName}
                    autoCapitalize="words"
                    accessibilityLabel={copy.childFirstName}
                  />
                  <Text style={styles.inputLabel}>{copy.birthday}</Text>
                  <DateInput value={editChildDob} onChange={setEditChildDob} />
                  <Text style={styles.inputLabel}>{copy.school}</Text>
                  <TextInput
                    style={styles.input}
                    value={editChildSchool}
                    onChangeText={setEditChildSchool}
                    placeholder={copy.egSchool}
                    placeholderTextColor={colors.mid}
                    autoCapitalize="words"
                    accessibilityLabel={copy.schoolNameA11y}
                  />
                  <Text style={styles.inputLabel}>{copy.grade}</Text>
                  <TextInput
                    style={styles.input}
                    value={editChildGrade}
                    onChangeText={setEditChildGrade}
                    placeholder={copy.egGrade}
                    placeholderTextColor={colors.mid}
                    accessibilityLabel={copy.grade}
                  />
                  <View style={styles.addChildButtons}>
                    <Button
                      title={copy.save}
                      variant="primary"
                      onPress={async () => {
                        if (!editChildName.trim()) return;
                        const ok = await updateChild(child.id, {
                          first_name: editChildName.trim(),
                          date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(editChildDob) ? editChildDob : null,
                          school_name: editChildSchool.trim() || null,
                          grade: editChildGrade.trim() || null,
                        });
                        showToast(ok ? copy.childUpdated : copy.cantSave, ok ? 'success' : 'error');
                        if (ok) setEditingChildId(null);
                      }}
                    />
                    <Button title={copy.cancel} variant="outline" onPress={() => setEditingChildId(null)} />
                  </View>
                  <View style={styles.childManageRow}>
                    {!child.is_primary && (
                      <TouchableOpacity
                        onPress={async () => {
                          // One primary at a time: demote others, promote this one
                          for (const other of children.filter(o => o.is_primary && o.id !== child.id)) {
                            await updateChild(other.id, { is_primary: false });
                          }
                          const ok = await updateChild(child.id, { is_primary: true });
                          showToast(ok ? nowPrimaryToast(child.first_name ?? '', fl) : copy.cantUpdate, ok ? 'success' : 'error');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={makePrimaryLabel(child.first_name ?? '', fl)}
                      >
                        <Text style={styles.childManageLink}>{copy.makePrimary}</Text>
                      </TouchableOpacity>
                    )}
                    {children.length > 1 && (
                      <TouchableOpacity
                        onPress={async () => {
                          const confirmed = await showConfirm(
                            removeChildTitle(child.first_name ?? '', fl),
                            removeChildBody(fl),
                            removeConfirmLabel(fl),
                            true
                          );
                          if (!confirmed) return;
                          const ok = await deleteChild(child.id);
                          showToast(ok ? childRemovedToast(child.first_name ?? '', fl) : copy.cantRemove, ok ? 'success' : 'error');
                          if (ok) setEditingChildId(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={removeChildLabel(child.first_name ?? '', fl)}
                      >
                        <Text style={[styles.childManageLink, styles.childManageDanger]}>{copy.removeChild}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.childRowTap}
                  onPress={() => {
                    setEditingChildId(child.id);
                    setEditChildName(child.first_name ?? '');
                    setEditChildDob(child.date_of_birth ?? '');
                    setEditChildSchool(child.school_name ?? '');
                    setEditChildGrade(child.grade ?? '');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={editChildLabel(child.first_name ?? '', fl)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childName}>
                      {child.first_name}
                      {child.is_primary ? '  ⭐' : ''}
                    </Text>
                    {child.date_of_birth ? (
                      <Text style={styles.childDob}>{bornLabel(child.date_of_birth ?? '', fl)}</Text>
                    ) : null}
                    {child.school_name || copy.grade ? (
                      <Text style={styles.childDob}>
                        {[child.school_name, child.grade ? gradeLabel(child.grade, fl) : null].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.childEditHint}>{copy.editHint}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {showAddChild ? (
            <View>
              <Text style={styles.inputLabel}>{copy.newChildFirstName}</Text>
              <TextInput
                style={styles.input}
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder={copy.egNewChildName}
                placeholderTextColor={colors.mid}
                autoCapitalize="words"
                accessibilityLabel={copy.newChildFirstName}
              />
              <Text style={styles.inputLabel}>{copy.birthdayOptional}</Text>
              <DateInput value={newChildDob} onChange={setNewChildDob} />
              <View style={styles.addChildButtons}>
                <Button title={copy.add} onPress={handleAddChild} loading={addingChild} disabled={addingChild} variant="primary" />
                <Button title={copy.cancel} onPress={() => { setShowAddChild(false); setNewChildName(''); setNewChildDob(''); }} variant="outline" />
              </View>
            </View>
          ) : (
            <Button title={copy.addAChild} onPress={() => setShowAddChild(true)} variant="outline" />
          )}
        </View>

        {/* Diagnosis Section */}
        <Text style={styles.sectionTitle}>{copy.diagnosis}</Text>
        <View style={styles.card}>
          <DiagnosisSelector
            selected={selectedDiagnoses}
            onToggle={toggleDiagnosis}
          />
        </View>

        {/* RC Status */}
        <Text style={styles.sectionTitle}>{copy.rcStatus}</Text>
        <View style={styles.card}>
          <SelectGrid
            options={rcStatusOptions(fl)}
            selected={rcStatus}
            onSelect={(v: string) => { setRcStatus(v); void persistIntake({ rcStatus: v }); }}
            columns={2}
          />
        </View>

        {/* IEP Status */}
        <Text style={styles.sectionTitle}>{copy.iepStatus}</Text>
        <View style={styles.card}>
          <SelectGrid
            options={iepStatusOptions(fl)}
            selected={iepStatus}
            onSelect={(v: string) => { setIepStatus(v); void persistIntake({ iepStatus: v }); }}
            columns={2}
          />
        </View>

        {/* Insurance */}
        <Text style={styles.sectionTitle}>{copy.insurance}</Text>
        <View style={styles.card}>
          <SelectGrid
            options={insuranceOptions(fl)}
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
            title={copy.saveChanges}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            variant="primary"
          />
        </View>

        {/* Accessibility & display */}
        <Text style={styles.sectionTitle}>{copy.displayAccessibility}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingBody}>
              <Text style={styles.settingLabel}>{copy.textSize}</Text>
              <Text style={styles.settingHint}>{copy.textSizeHint}</Text>
            </View>
            <TouchableOpacity
              style={styles.textSizePill}
              onPress={cycleScale}
              accessibilityRole="button"
              accessibilityLabel={textSizeLabel(Math.round(scale * 100), fl)}
            >
              <Text style={styles.textSizePillText}>Aa {Math.round(scale * 100)}%</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingBody}>
              <Text style={styles.settingLabel}>{copy.appTour}</Text>
              <Text style={styles.settingHint}>{copy.appTourHint}</Text>
            </View>
            <TouchableOpacity
              style={styles.textSizePill}
              onPress={async () => {
                await resetTutorial();
                showToast(copy.tourWillReplay, 'success');
              }}
              accessibilityRole="button"
              accessibilityLabel={copy.replayTourA11y}
            >
              <Text style={styles.textSizePillText}>{copy.replay}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingBody}>
              <Text style={styles.settingLabel}>{copy.howWaypointWorks}</Text>
              <Text style={styles.settingHint}>{copy.howWaypointWorksHint}</Text>
            </View>
            <TouchableOpacity
              style={styles.textSizePill}
              onPress={() => navigation.navigate('HowWaypointWorks')}
              accessibilityRole="button"
              accessibilityLabel={copy.howWaypointWorksA11y}
            >
              <Text style={styles.textSizePillText}>{copy.view}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & AI */}
        <Text style={styles.sectionTitle}>{copy.privacyAi}</Text>
        <View style={styles.card}>
          <Text style={styles.privacyStatus}>
            {copy.aiIntro}{' '}
            <Text style={{ fontWeight: '700' }}>{family?.ai_consent_at ? copy.aiOn : copy.aiOff}</Text>.
            {family?.ai_consent_at ? copy.aiOnDetail : copy.aiOffDetail}
          </Text>
          <Button
            title={family?.ai_consent_at ? copy.turnOffAi : copy.enableAi}
            onPress={handleToggleAIConsent}
            variant="outline"
          />
        </View>

        {/* Data export — everything the family owns, as one JSON file */}
        <Text style={styles.sectionTitle}>{copy.yourData}</Text>
        <View style={styles.card}>
          <Text style={styles.privacyStatus}>
            {copy.exportBlurb}
          </Text>
          <Button
            title={exporting ? copy.exportPreparing : copy.exportButton}
            onPress={handleExportData}
            variant="outline"
            disabled={exporting}
          />
        </View>

        {/* What Waypoint knows (P2): the AI's memory of this family, with
            full parent control — every memory visible and deletable */}
        {family?.ai_consent_at && (
          <>
            <Text style={styles.sectionTitle}>{copy.whatWaypointKnows}</Text>
            <View style={styles.card}>
              <Text style={styles.privacyStatus}>
                {copy.memoriesBlurb}
              </Text>
              {memories.length === 0 ? (
                <Text style={styles.memoryEmpty}>
                  {copy.memoriesEmpty}
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
                          showToast(ok ? copy.forgotten : copy.cantRemove, ok ? 'success' : 'error');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={forgetMemoryLabel(m.content, fl)}
                      >
                        <Text style={styles.memoryForgetText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={async () => {
                      const confirmed = await showConfirm(
                        copy.forgetAllTitle,
                        copy.forgetAllBody,
                        copy.forgetAllConfirm,
                        true
                      );
                      if (!confirmed) return;
                      const ok = await forgetAll();
                      showToast(ok ? copy.allForgotten : copy.cantClear, ok ? 'success' : 'error');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={copy.forgetAllA11y}
                    style={styles.memoryForgetAll}
                  >
                    <Text style={styles.memoryForgetAllText}>{copy.forgetEverything}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Google account (Calendar sync + Gmail — Phase 3) */}
        {Platform.OS === 'web' && (
          <>
            <Text style={styles.sectionTitle}>{copy.googleAccount}</Text>
            <View style={styles.card}>
              <Text style={styles.privacyStatus}>
                {!googleStatus.connected
                  ? copy.googleDisconnected
                  : googleStatus.gmail
                    ? googleConnectedFull(googleStatus.email ?? yourGoogleAccount(fl), fl)
                    // Gmail is a separate, restricted-scope opt-in, so a
                    // connected account is often Calendar-only. Claiming
                    // sending and reply-tracking here would be a promise the
                    // app cannot keep.
                    : googleConnectedCalendarOnly(googleStatus.email ?? yourGoogleAccount(fl), fl)}
              </Text>
              {/* Calendar-only is a real, common state: offer the Gmail
                  upgrade rather than only Disconnect. */}
              {googleStatus.connected && !googleStatus.gmail && (
                <Button
                  title={googleBusy ? copy.working : copy.addGmail}
                  onPress={handleConnectGoogle}
                  variant="outline"
                  disabled={googleBusy}
                />
              )}
              <Button
                title={
                  googleBusy
                    ? copy.working
                    : googleStatus.connected
                      ? copy.disconnectGoogle
                      : copy.connectGoogle
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
          accessibilityLabel={copy.deleteAccountA11y}
        >
          <Text style={styles.deleteText}>{copy.deleteAccount}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{copy.version}</Text>
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
