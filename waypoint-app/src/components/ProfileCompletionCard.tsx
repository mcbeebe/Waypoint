/**
 * "Finish your profile" nudge (Home).
 *
 * Letters and emails keep asking for the same handful of details — last
 * name, phone, school, grade. Saved once, they preload into every draft
 * instead of coming back as [BLANKS]. This card only appears while some
 * of them are missing, and disappears on its own once they're filled.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { missingLetterFields, type LetterProfile } from '@/lib/draftBlanks';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const DISMISS_KEY = 'waypoint_profile_nudge_dismissed';

interface ProfileCompletionCardProps {
  profile: LetterProfile;
  onOpenProfile: () => void;
}

export default function ProfileCompletionCard({
  profile,
  onOpenProfile,
}: ProfileCompletionCardProps) {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until storage answers

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(false));
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
  }, []);

  const missing = missingLetterFields(profile);
  if (dismissed || missing.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>FINISH YOUR PROFILE</Text>
        <TouchableOpacity
          onPress={handleDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss profile reminder"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>
        {missing.length} detail{missing.length === 1 ? '' : 's'} your letters keep asking for
      </Text>
      <Text style={styles.body}>
        Add {missing.map((f) => f.label.toLowerCase()).join(', ')} once, and every email and letter
        Waypoint drafts will fill them in for you instead of leaving blanks.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel="Complete your profile"
      >
        <Text style={styles.buttonText}>Complete my profile →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EFF6FF',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: fonts.weights.bold as '700',
    color: '#2563EB',
    letterSpacing: 0.7,
  },
  dismiss: { fontSize: 14, color: colors.mid, paddingHorizontal: 2 },
  title: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginTop: 4,
  },
  body: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 19,
    marginTop: 4,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fonts.sizes.sm,
    color: '#2563EB',
    fontWeight: fonts.weights.semibold as '600',
  },
});
