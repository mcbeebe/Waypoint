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
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import DiagnosisSelector from '@/components/DiagnosisSelector';
import SelectGrid from '@/components/SelectGrid';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { reseedStarterPlan } from '@/lib/planGenerator';
import { lookupRC } from '@/data/regionalCenters';
import { signOut } from '@/lib/auth';
import {
  connectGoogleWeb,
  disconnectGoogleWeb,
  isGoogleConnectedWeb,
} from '@/lib/googleAuth';
import { supabase } from '@/lib/supabase';
import { showAlert, showConfirm } from '@/lib/dialogs';
import { useI18n } from '@/i18n';
import type { SupportedLocale } from '@/i18n';
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

export default function ProfileScreen() {
  const { family, updateFamily, loading: familyLoading } = useFamily();
  const { children, addChild, updateChild } = useChildren(family?.id);
  const primaryChild = children.find(c => c.is_primary) || children[0];
  const { diagnoses, setDiagnoses } = useDiagnoses(primaryChild?.id);
  const { t, locale, setLocale } = useI18n();

  const [saving, setSaving] = useState(false);
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [rcStatus, setRcStatus] = useState('');
  const [iepStatus, setIepStatus] = useState('');
  const [insurance, setInsurance] = useState('');
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [addingChild, setAddingChild] = useState(false);

  // Populate form from database
  useEffect(() => {
    if (family) {
      setParentName(family.parent_first_name || '');
      setEmail(family.email || '');
      setZipCode(family.zip_code || '');
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

  const toggleDiagnosis = (value: string) => {
    setSelectedDiagnoses(prev =>
      prev.includes(value)
        ? prev.filter(d => d !== value)
        : [...prev, value]
    );
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
      await updateFamily({
        parent_first_name: parentName.trim(),
        email: email.trim(),
        zip_code: zipCode.trim() || null,
        regional_center: rc?.name ?? family?.regional_center ?? null,
        insurance_carrier: insurance,
      });

      // Update child record — name + intake statuses (migration 012 columns)
      if (primaryChild) {
        await updateChild(primaryChild.id, {
          first_name: childName.trim() || primaryChild.first_name,
          rc_status: (rcStatus || null) as Child['rc_status'],
          iep_status: (iepStatus || null) as Child['iep_status'],
        });
        await setDiagnoses(primaryChild.id, selectedDiagnoses);
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

      Alert.alert('Saved', intakeChanged
        ? 'Profile updated — your action plan has been refreshed to match.'
        : 'Your profile has been updated.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [parentName, email, zipCode, insurance, selectedDiagnoses, rcStatus, iepStatus, childName, primaryChild, family, diagnoses, updateFamily, updateChild, setDiagnoses]);

  const handleAddChild = useCallback(async () => {
    const name = newChildName.trim();
    if (!name) {
      Alert.alert('Name needed', "Please enter the child's first name.");
      return;
    }
    setAddingChild(true);
    try {
      const created = await addChild({ first_name: name, is_primary: false });
      if (created) {
        setNewChildName('');
        setShowAddChild(false);
        Alert.alert('Added', `${name} has been added to your family.`);
      } else {
        Alert.alert('Error', 'Could not add child. Please try again.');
      }
    } finally {
      setAddingChild(false);
    }
  }, [newChildName, addChild]);

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
    const result = await connectGoogleWeb();
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
      'Calendar sync and email sending will stop working until you reconnect.',
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
    if (ok) await signOut();
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
        </View>

        {/* Children */}
        <Text style={styles.sectionTitle}>Children</Text>
        <View style={styles.card}>
          {children.map(c => (
            <View key={c.id} style={styles.childRow}>
              <Text style={styles.childName}>
                {c.first_name}
                {c.is_primary ? '  ⭐' : ''}
              </Text>
              {c.date_of_birth ? (
                <Text style={styles.childDob}>Born {c.date_of_birth}</Text>
              ) : null}
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
              <View style={styles.addChildButtons}>
                <Button title="Add" onPress={handleAddChild} loading={addingChild} disabled={addingChild} variant="primary" />
                <Button title="Cancel" onPress={() => { setShowAddChild(false); setNewChildName(''); }} variant="outline" />
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
            onSelect={setRcStatus}
            columns={2}
          />
        </View>

        {/* IEP Status */}
        <Text style={styles.sectionTitle}>IEP Status</Text>
        <View style={styles.card}>
          <SelectGrid
            options={IEP_STATUS_OPTIONS}
            selected={iepStatus}
            onSelect={setIepStatus}
            columns={2}
          />
        </View>

        {/* Insurance */}
        <Text style={styles.sectionTitle}>Insurance</Text>
        <View style={styles.card}>
          <SelectGrid
            options={INSURANCE_OPTIONS}
            selected={insurance}
            onSelect={setInsurance}
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

        {/* Google account (Calendar sync + Gmail — Phase 3) */}
        {Platform.OS === 'web' && (
          <>
            <Text style={styles.sectionTitle}>Google Account</Text>
            <View style={styles.card}>
              <Text style={styles.privacyStatus}>
                {googleStatus.connected
                  ? `Connected as ${googleStatus.email ?? 'your Google account'}. Waypoint can sync your calendar and send emails you approve.`
                  : 'Connect Google to sync appointments to your calendar and send emails to schools and agencies from Waypoint.'}
              </Text>
              <Button
                title={
                  googleBusy
                    ? 'Working…'
                    : googleStatus.connected
                      ? 'Disconnect Google'
                      : 'Connect Google'
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
