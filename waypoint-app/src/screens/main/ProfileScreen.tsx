/**
 * Profile settings screen — ported from GAS MVP renderProfile()
 * Editable: parent name, email, child name, ZIP, diagnosis, RC/IEP/insurance status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import DiagnosisSelector from '@/components/DiagnosisSelector';
import SelectGrid from '@/components/SelectGrid';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { signOut } from '@/lib/auth';
import { useI18n } from '@/i18n';
import type { SupportedLocale } from '@/i18n';
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
  const { children } = useChildren(family?.id);
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
      // Update family
      await updateFamily({
        parent_first_name: parentName.trim(),
        email: email.trim(),
        zip_code: zipCode.trim() || null,
        insurance_carrier: insurance,
      });

      // Update diagnoses
      if (primaryChild) {
        await setDiagnoses(primaryChild.id, selectedDiagnoses);
      }

      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      Alert.alert('Error', e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [parentName, email, insurance, selectedDiagnoses, primaryChild, updateFamily, setDiagnoses]);

  const handleSignOut = useCallback(async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
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

        <View style={styles.signOutRow}>
          <Button
            title={t.profile.signOut}
            onPress={handleSignOut}
            variant="outline"
          />
        </View>

        <Text style={styles.version}>Waypoint v2.0.0 (Sprint 6)</Text>
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
  buttonRow: {
    marginTop: spacing.xl,
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
