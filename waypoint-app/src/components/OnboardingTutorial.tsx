/**
 * Onboarding Tutorial — 4-step interactive intro for new users
 * Phase 9: Sprint S69
 *
 * Shows on first launch, can be skipped, remembers "don't show again"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const TUTORIAL_KEY = 'waypoint_tutorial_completed';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialStep {
  emoji: string;
  title: string;
  description: string;
}

const STEPS: TutorialStep[] = [
  {
    emoji: '🧭',
    title: 'Your AI Navigator',
    description: 'Ask questions about your child\'s rights, services, and next steps. The AI knows California disability law and gives personalized guidance.',
  },
  {
    emoji: '📋',
    title: 'Action Plan Tracker',
    description: 'Save AI recommendations as action items. Track progress, set priorities, and never lose sight of important next steps.',
  },
  {
    emoji: '📅',
    title: 'Calendar & Deadlines',
    description: 'Never miss an IEP deadline or therapy appointment. Sync with Google Calendar and get reminders before key dates.',
  },
  {
    emoji: '👥',
    title: 'Community & Team',
    description: 'Connect with other families, share strategies, and coordinate with co-parents and providers — all in one place.',
  },
];

export function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    (async () => {
      const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
      if (!completed) setShouldShow(true);
    })();
  }, []);

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    setShouldShow(false);
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  }, [currentStep, handleFinish]);

  if (!shouldShow) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentStep && styles.dotActive]} />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.skipButton} onPress={handleFinish}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/** Reset tutorial so it shows again */
export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.teal,
    width: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  skipButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
  nextButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
  },
  nextText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.bold as '700',
  },
});
