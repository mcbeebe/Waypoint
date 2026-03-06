/**
 * Multi-select diagnosis picker
 * Ported from GAS MVP ONBOARD_STEPS step 2 (18 diagnosis options)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SelectGrid from './SelectGrid';
import { colors, fonts, spacing } from '@/lib/theme';

/** All diagnosis options from GAS MVP — exact match */
export const DIAGNOSIS_OPTIONS = [
  { value: 'autism', label: 'Autism (ASD)', emoji: '🧩' },
  { value: 'delay', label: 'Developmental delays', emoji: '🌱' },
  { value: 'id', label: 'Intellectual disability', emoji: '🧠' },
  { value: 'sld', label: 'Learning disability (SLD)', emoji: '📚' },
  { value: 'adhd', label: 'ADHD', emoji: '⚡' },
  { value: 'cp', label: 'Cerebral palsy', emoji: '🦽' },
  { value: 'down', label: 'Down syndrome', emoji: '💛' },
  { value: 'epilepsy', label: 'Epilepsy / Seizures', emoji: '⚕️' },
  { value: 'sli', label: 'Speech / Language', emoji: '🗣️' },
  { value: 'sensory', label: 'Sensory processing', emoji: '👁️' },
  { value: 'genetic', label: 'Genetic condition', emoji: '🧬' },
  { value: 'dyslexia', label: 'Dyslexia', emoji: '📖' },
  { value: 'tbi', label: 'Traumatic brain injury', emoji: '🏥' },
  { value: 'deaf', label: 'Deaf / Hard of hearing', emoji: '🦻' },
  { value: 'blind', label: 'Blind / Low vision', emoji: '👓' },
  { value: 'multiple', label: 'Multiple disabilities', emoji: '🔗' },
  { value: 'ohi', label: 'Other health impairment', emoji: '💊' },
  { value: 'ed', label: 'Emotional disturbance', emoji: '🫂' },
  { value: 'suspected', label: 'Suspected (not yet dx)', emoji: '❓' },
];

interface DiagnosisSelectorProps {
  selected: string[];
  onToggle: (value: string) => void;
}

export default function DiagnosisSelector({ selected, onToggle }: DiagnosisSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Select all that apply</Text>
      <SelectGrid
        options={DIAGNOSIS_OPTIONS}
        selected={selected}
        onSelect={onToggle}
        multiSelect
        columns={2}
      />
      {selected.length === 0 && (
        <Text style={styles.validation}>Please select at least one diagnosis</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hint: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  validation: {
    fontSize: fonts.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
