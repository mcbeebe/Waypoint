/**
 * AI consent modal (roadmap Wave 1.4 / App Store Guideline 5.1.2(i)) —
 * affirmative, specific consent before any family data is sent to Anthropic.
 * Shown once before the first Navigator message and before the first
 * document analysis; withdrawable any time in Profile.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AIConsentModal({ visible, onAccept, onDecline }: AIConsentModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDecline}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']}>
          <View style={styles.sheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Before we use AI</Text>
              <Text style={styles.body}>
                Waypoint's AI features are powered by Anthropic's Claude. To give you
                personalized guidance, we send Anthropic:
              </Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Your questions and the conversation</Text>
                <Text style={styles.listItem}>• Your child's age and diagnoses</Text>
                <Text style={styles.listItem}>• Your county, Regional Center, school district, and insurance carrier</Text>
                <Text style={styles.listItem}>• The text of documents you choose to analyze (e.g., an IEP)</Text>
              </View>
              <Text style={styles.body}>
                Anthropic processes this to generate responses and does not use it to train
                its models. We never sell your data. You can withdraw consent any time in
                Profile — AI features simply turn off, and everything you've saved stays yours.
              </Text>
              <Text style={styles.disclaimer}>
                AI guidance is informational only — not legal or medical advice.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={onAccept}
              accessibilityRole="button"
              accessibilityLabel="I agree, enable AI features"
            >
              <Text style={styles.acceptText}>I agree — enable AI features</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={onDecline}
              accessibilityRole="button"
              accessibilityLabel="Not now"
            >
              <Text style={styles.declineText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    maxHeight: '85%',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  body: {
    fontSize: fonts.sizes.md,
    color: colors.dark,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  list: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  listItem: {
    fontSize: fonts.sizes.md,
    color: colors.dark,
    lineHeight: 22,
  },
  disclaimer: {
    fontSize: fonts.sizes.sm,
    color: semantic.warning,
    marginBottom: spacing.md,
  },
  acceptButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  acceptText: {
    color: colors.white,
    fontWeight: fonts.weights.bold as '700',
    fontSize: fonts.sizes.md,
  },
  declineButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  declineText: {
    color: colors.mid,
    fontWeight: fonts.weights.semibold as '600',
  },
});
