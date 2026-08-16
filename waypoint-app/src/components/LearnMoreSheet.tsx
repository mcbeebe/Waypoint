/**
 * Learn More sheet (roadmap 1.5) — in-app explainers for the system's jargon
 * (SSI, IHSS, Lanterman Act, SB 946…), so no term is ever a dead end.
 * Content ported verbatim from the GAS MVP LEARN_MORE data.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LEARN_MORE } from '@/data/agencies';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

/**
 * Which explainer applies to which starter-plan action (by title).
 * Mirrors the GAS learnMoreKey field that the actions schema doesn't carry.
 */
export const LEARN_MORE_BY_ACTION_TITLE: Record<string, string> = {
  'Call Regional Center for Early Start referral': 'Regional Center',
  'Call Regional Center to start your referral': 'Regional Center',
  'Follow up on RC application status': 'Regional Center',
  'Send written request for IEP meeting': 'IEP',
  'Request school district evaluation (in writing)': 'IEP',
  'Request 504 Plan or IEP evaluation': 'IEP',
  'Request speech/language IEP evaluation': 'IEP',
  'Call insurance to verify therapy coverage': 'SB 946',
  'Apply for Medi-Cal': 'Medi-Cal',
  'Start SSI application': 'SSI',
  'Apply for IHSS (In-Home Supportive Services)': 'IHSS',
  'Apply to Department of Rehabilitation (DOR)': 'DOR',
  'Set up a CalABLE savings account': 'CalABLE',
};

interface LearnMoreSheetProps {
  /** Key into LEARN_MORE, or null to hide */
  learnKey: string | null;
  onClose: () => void;
}

export default function LearnMoreSheet({ learnKey, onClose }: LearnMoreSheetProps) {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const entry = learnKey ? LEARN_MORE[learnKey] : null;

  return (
    <Modal visible={entry !== null} animationType="slide" onRequestClose={onClose}>
      {entry && (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <Text style={[styles.headerLabel, { fontSize: sz(11) }]}>📖 LEARN MORE</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.mid} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { fontSize: sz(22) }]}>{entry.title}</Text>
            <Text style={[styles.body, { fontSize: sz(14.5), lineHeight: sz(23) }]}>{entry.body}</Text>
            <View style={styles.tipBox}>
              <Text style={[styles.tipLabel, { fontSize: sz(11) }]}>💡 TIP</Text>
              <Text style={[styles.tipText, { fontSize: sz(14), lineHeight: sz(21) }]}>{entry.tip}</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerLabel: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.teal,
    letterSpacing: 0.8,
  },
  closeButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  body: {
    color: colors.dark,
    marginBottom: spacing.lg,
  },
  tipBox: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  tipLabel: {
    fontWeight: fonts.weights.bold as '700',
    color: semantic.warning,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  tipText: {
    color: colors.dark,
  },
});
