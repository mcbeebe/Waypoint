/**
 * 6-step onboarding flow ported from GAS MVP
 * Steps: Basic Info → Diagnosis → Birthday → RC Status → IEP Status → Insurance
 *
 * On completion, creates family + child + diagnoses records in Supabase
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import StepIndicator from '@/components/StepIndicator';
import DiagnosisSelector from '@/components/DiagnosisSelector';
import SelectGrid from '@/components/SelectGrid';
import Button from '@/components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { generateStarterPlan } from '@/lib/planGenerator';
import { lookupRC, rcByCounty, ALL_COUNTIES } from '@/data/regionalCenters';
import { showAlert } from '@/lib/dialogs';
import { toLocalISODate } from '@/lib/localDate';
import { colors, fonts, spacing, radii } from '@/lib/theme';

/** Set at onboarding completion; Home reads it once to reveal the Journey Map */
export const SHOW_JOURNEY_FLAG = '@waypoint_show_journey';

// ─── Step option data (ported from GAS MVP ONBOARD_STEPS) ────────────────────

const RC_STATUS_OPTIONS = [
  { value: 'unknown', label: "I don't know", emoji: '❓', description: 'Not sure what Regional Center is' },
  { value: 'known', label: 'I know my RC', emoji: '📍', description: 'Know which one but not connected' },
  { value: 'applied', label: 'Applied / In process', emoji: '📝', description: 'Referral or intake started' },
  { value: 'active', label: 'Active client', emoji: '✅', description: 'Currently receiving RC services' },
];

const IEP_STATUS_OPTIONS = [
  { value: 'no', label: 'No IEP', emoji: '📭', description: 'Never requested' },
  { value: 'unknown', label: "Don't know", emoji: '❓', description: "Not sure if child has one" },
  { value: 'eval_done', label: 'Evaluation done', emoji: '🔍', description: 'Assessed but no IEP yet' },
  { value: 'active', label: 'Active IEP', emoji: '✅', description: 'Currently has IEP in place' },
  { value: 'na', label: 'Not applicable', emoji: '➖', description: 'Child not school age' },
];

const INSURANCE_OPTIONS = [
  { value: 'private', label: 'Private insurance', emoji: '🏥' },
  { value: 'medicaid', label: 'Medi-Cal', emoji: '🏛️' },
  { value: 'both', label: 'Both', emoji: '🔄' },
  { value: 'none', label: 'None / Unsure', emoji: '❓' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a Date as YYYY-MM-DD in local time (for the web date input).
 * Aliases the shared helper so the picker and the SAVE path cannot drift —
 * they had, and the save path was writing the UTC day. See localDate.ts.
 */
const toDateInputValue = toLocalISODate;

// ─── Types ───────────────────────────────────────────────────────────────────

interface OnboardingData {
  parentFirstName: string;
  childName: string;
  zipCode: string;
  email: string;
  diagnoses: string[];
  birthday: Date | null;
  rcStatus: string;
  iepStatus: string;
  insurance: string;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 6;

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showCountyPicker, setShowCountyPicker] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    parentFirstName: '',
    childName: '',
    zipCode: '',
    email: '',
    diagnoses: [],
    birthday: null,
    rcStatus: '',
    iepStatus: '',
    insurance: '',
  });

  const updateField = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleDiagnosis = (value: string) => {
    setData(prev => ({
      ...prev,
      diagnoses: prev.diagnoses.includes(value)
        ? prev.diagnoses.filter(d => d !== value)
        : [...prev.diagnoses, value],
    }));
  };

  // ─── Validation ──────────────────────────────────────────────────────────

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return data.parentFirstName.trim().length > 0 && data.childName.trim().length > 0;
      case 1: return data.diagnoses.length > 0;
      case 2: return data.birthday !== null;
      case 3: return data.rcStatus !== '';
      case 4: return data.iepStatus !== '';
      case 5: return data.insurance !== '';
      default: return false;
    }
  };

  // ─── Age calculation (ported from GAS onBirthdayChange) ──────────────────

  const getAge = (): { years: number; months: number; display: string; band: string } | null => {
    if (!data.birthday) return null;

    const now = new Date();
    let years = now.getFullYear() - data.birthday.getFullYear();
    let months = now.getMonth() - data.birthday.getMonth();
    if (months < 0) { years--; months += 12; }

    const display = years > 0
      ? `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`
      : `${months} month${months !== 1 ? 's' : ''}`;

    let band = '0-2';
    if (years >= 13) band = '13-17';
    else if (years >= 6) band = '6-12';
    else if (years >= 3) band = '3-5';

    return { years, months, display, band };
  };

  // ─── Save to Supabase ────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!canAdvance()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const age = getAge();

      // Resolve the family's Regional Center from ZIP (or county fallback)
      const rc = data.zipCode.trim()
        ? lookupRC(data.zipCode.trim())
        : selectedCounty
          ? rcByCounty(selectedCounty)
          : null;

      // 1. Create or update family record
      const { data: family, error: familyError } = await supabase
        .from('families')
        .upsert({
          user_id: user.id,
          parent_first_name: data.parentFirstName.trim(),
          email: data.email.trim() || user.email || '',
          zip_code: data.zipCode.trim() || null,
          state: 'CA',
          county: selectedCounty,
          regional_center: rc?.name ?? null,
          insurance_carrier: data.insurance,
          onboarding_completed: true,
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (familyError) throw familyError;

      // 2. Create child record
      const { data: child, error: childError } = await supabase
        .from('children')
        .insert({
          family_id: family.id,
          first_name: data.childName.trim(),
          // LOCAL day, not the UTC one: `toISOString()` stored a birthday a day
          // EARLY for any family east of Greenwich, and the age band, the Early
          // Start exit at 3 and transition planning at 16 all read this column.
          date_of_birth: data.birthday ? toLocalISODate(data.birthday) : null,
          is_primary: true,
          rc_status: data.rcStatus,
          iep_status: data.iepStatus,
        })
        .select()
        .single();

      if (childError) throw childError;

      // 3. Create diagnosis records
      if (data.diagnoses.length > 0) {
        const diagnosisRows = data.diagnoses.map(name => ({
          child_id: child.id,
          name,
        }));
        const { error: dxError } = await supabase
          .from('diagnoses')
          .insert(diagnosisRows);

        if (dxError) throw dxError;
      }

      // 4. Seed the personalized starter plan (ported from GAS generateRichPlan).
      // Non-critical: onboarding still completes if seeding fails — the user can
      // add actions manually or via the AI Navigator.
      try {
        const starterActions = generateStarterPlan({
          diagnoses: data.diagnoses,
          birthday: data.birthday,
          rcStatus: data.rcStatus,
          iepStatus: data.iepStatus,
          insurance: data.insurance,
          childName: data.childName.trim(),
          parentName: data.parentFirstName.trim(),
          zipCode: data.zipCode.trim() || undefined,
        });
        if (starterActions.length > 0) {
          const rows = starterActions.map(action => ({
            ...action,
            family_id: family.id,
            child_id: child.id,
            source: 'system' as const,
          }));
          const { error: planError } = await supabase.from('actions').insert(rows);
          if (planError) console.warn('Starter plan seeding failed:', planError.message);
        }
      } catch (planErr) {
        console.warn('Starter plan generation failed:', planErr);
      }

      // Funnel (B4): registration is complete once the family row exists.
      try {
        const { trackFunnelStep } = await import('@/lib/analytics');
        await trackFunnelStep(family.id, 'registered', {
          regionalCenter: rc?.name ?? undefined,
        });
      } catch {}

      // The eligibility result is the post-onboarding reveal — Home reads this once
      try { await AsyncStorage.setItem(SHOW_JOURNEY_FLAG, '1'); } catch {}

      onComplete();
    } catch (err: unknown) {
      const e = err as { message?: string };
      showAlert('Could not finish setup', e.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [data, onComplete]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step === TOTAL_STEPS - 1) {
      handleComplete();
    } else if (canAdvance()) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(prev => prev - 1);
  };

  // ─── Step Renderers ──────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Welcome to Waypoint</Text>
            <Text style={styles.stepSubtitle}>Let's get to know your family</Text>

            <Text style={styles.inputLabel}>Your first name</Text>
            <TextInput
              style={styles.input}
              value={data.parentFirstName}
              onChangeText={v => updateField('parentFirstName', v)}
              placeholder="e.g., Sarah"
              placeholderTextColor={colors.mid}
              autoCapitalize="words"
              autoFocus
            />

            <Text style={styles.inputLabel}>Child's first name</Text>
            <TextInput
              style={styles.input}
              value={data.childName}
              onChangeText={v => updateField('childName', v)}
              placeholder="e.g., Maya"
              placeholderTextColor={colors.mid}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>ZIP code</Text>
            <TextInput
              style={styles.input}
              value={data.zipCode}
              onChangeText={v => updateField('zipCode', v)}
              placeholder="e.g., 94610"
              placeholderTextColor={colors.mid}
              keyboardType="number-pad"
              maxLength={5}
            />
            <TouchableOpacity
              onPress={() => setShowCountyPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Find your Regional Center by county instead"
            >
              <Text style={styles.countyLink}>
                {selectedCounty
                  ? `County: ${selectedCounty} ✓ (tap to change)`
                  : "Don't know your ZIP? Find by county →"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Email (optional)</Text>
            <TextInput
              style={styles.input}
              value={data.email}
              onChangeText={v => updateField('email', v)}
              placeholder="For deadline reminders"
              placeholderTextColor={colors.mid}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Child's Diagnosis</Text>
            <DiagnosisSelector
              selected={data.diagnoses}
              onToggle={toggleDiagnosis}
            />
          </View>
        );

      case 2: {
        const age = getAge();
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Child's Birthday</Text>
            <Text style={styles.stepSubtitle}>
              This helps us give age-appropriate guidance
            </Text>

            {Platform.OS === 'web' &&
              // Native DateTimePicker has no web implementation — use the
              // browser's built-in date input, styled to match the theme.
              React.createElement('input', {
                type: 'date',
                'aria-label': "Child's birthday",
                value: data.birthday ? toDateInputValue(data.birthday) : '',
                max: toDateInputValue(new Date()),
                min: '2000-01-01',
                onChange: (e: { target: { value: string } }) => {
                  const v = e.target.value;
                  if (v) {
                    const [y, m, d] = v.split('-').map(Number);
                    updateField('birthday', new Date(y, m - 1, d));
                  }
                },
                style: {
                  backgroundColor: colors.light,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: `${spacing.lg}px ${spacing.md}px`,
                  fontSize: fonts.sizes.base,
                  color: colors.dark,
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box',
                },
              })}

            {Platform.OS === 'android' && !showDatePicker && (
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {data.birthday
                    ? data.birthday.toLocaleDateString()
                    : 'Tap to select birthday'}
                </Text>
              </TouchableOpacity>
            )}

            {Platform.OS !== 'web' && showDatePicker && (
              <DateTimePicker
                value={data.birthday || new Date(2020, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(2000, 0, 1)}
                onChange={(_, selectedDate) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selectedDate) updateField('birthday', selectedDate);
                }}
              />
            )}

            {age && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{age.display}</Text>
                <Text style={styles.ageBand}>Age band: {age.band}</Text>
              </View>
            )}
          </View>
        );
      }

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Regional Center Status</Text>
            <Text style={styles.stepSubtitle}>
              Regional Centers provide services under the Lanterman Act
            </Text>
            <SelectGrid
              options={RC_STATUS_OPTIONS}
              selected={data.rcStatus}
              onSelect={v => updateField('rcStatus', v)}
              columns={1}
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>IEP Status</Text>
            <Text style={styles.stepSubtitle}>
              Individualized Education Program at school
            </Text>
            <SelectGrid
              options={IEP_STATUS_OPTIONS}
              selected={data.iepStatus}
              onSelect={v => updateField('iepStatus', v)}
              columns={1}
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Insurance Type</Text>
            <Text style={styles.stepSubtitle}>
              This determines which benefits and services apply
            </Text>
            <SelectGrid
              options={INSURANCE_OPTIONS}
              selected={data.insurance}
              onSelect={v => updateField('insurance', v)}
              columns={2}
            />
          </View>
        );

      default:
        return null;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <StepIndicator totalSteps={TOTAL_STEPS} currentStep={step} />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        {/* County fallback picker — resolves the Regional Center without a ZIP */}
        {showCountyPicker && (
          <View style={styles.countyOverlay}>
            <View style={styles.countySheet}>
              <Text style={styles.countyTitle}>Choose your county</Text>
              <ScrollView style={styles.countyList}>
                {ALL_COUNTIES.map(({ county }) => (
                  <TouchableOpacity
                    key={county}
                    style={styles.countyRow}
                    onPress={() => {
                      setSelectedCounty(county);
                      setShowCountyPicker(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={county}
                  >
                    <Text style={styles.countyName}>{county}</Text>
                    <Text style={styles.countyRc}>{rcByCounty(county)?.name ?? ''}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.countyCancel}
                onPress={() => setShowCountyPicker(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.countyCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.flex} />

          <Button
            title={step === TOTAL_STEPS - 1 ? "Let's go!" : 'Next'}
            onPress={handleNext}
            disabled={!canAdvance() || saving}
            loading={saving}
            variant="primary"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fonts.sizes.md,
    color: colors.mid,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
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
  countyLink: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
  countyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  countySheet: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  countyTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  countyList: {
    flexGrow: 0,
  },
  countyRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countyName: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
  },
  countyRc: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    marginTop: 1,
  },
  countyCancel: {
    marginTop: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  countyCancelText: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.mid,
  },
  dateButton: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: fonts.sizes.md,
    color: colors.dark,
  },
  ageBadge: {
    marginTop: spacing.lg,
    backgroundColor: '#E6F7F5',
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ageText: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.teal,
  },
  ageBand: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backText: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.mid,
  },
});
