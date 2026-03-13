/**
 * Home dashboard screen — ported from GAS MVP renderHome()
 * Shows: greeting, child age badge, progress summary, quick actions
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { colors, fonts, spacing, radii } from '@/lib/theme';

/** Get time-based greeting (ported from GAS MVP) */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Calculate age from DOB */
function getAgeDisplay(dob: string | null): { display: string; band: string } | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }

  const display = years > 0
    ? `${years}y ${months}m`
    : `${months}m`;

  let band = 'Early Start (0-2)';
  if (years >= 13) band = 'Transition (13-17)';
  else if (years >= 6) band = 'School Age (6-12)';
  else if (years >= 3) band = 'Preschool (3-5)';

  return { display, band };
}

/** Rotating empathy messages (from GAS MVP) */
const EMPATHY_MESSAGES = [
  "You're doing an incredible job advocating for your child.",
  "Every step you take makes a difference for your family.",
  "You don't have to figure it all out today. One step at a time.",
  "Your child is lucky to have such a dedicated advocate.",
  "The path isn't always clear, but you're not walking it alone.",
  "Remember: knowing your rights is your superpower.",
];

export default function HomeScreen() {
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const navigation = useNavigation();
  const [empathyIndex, setEmpathyIndex] = useState(0);

  const primaryChild = children.find(c => c.is_primary) || children[0];
  const age = primaryChild ? getAgeDisplay(primaryChild.date_of_birth) : null;

  useEffect(() => {
    setEmpathyIndex(Math.floor(Math.random() * EMPATHY_MESSAGES.length));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.parentName}>{family?.parent_first_name || 'Welcome'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => (navigation as any).navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Text style={styles.avatarText}>
              {(family?.parent_first_name || 'W')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Child + Age Badge */}
        {primaryChild && (
          <View style={styles.childCard}>
            <Text style={styles.childName}>
              {primaryChild.first_name}'s Dashboard
            </Text>
            {age && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageValue}>{age.display}</Text>
                <Text style={styles.ageBand}>{age.band}</Text>
              </View>
            )}
          </View>
        )}

        {/* Empathy Message */}
        <View style={styles.empathyCard}>
          <Text style={styles.empathyText}>
            {EMPATHY_MESSAGES[empathyIndex]}
          </Text>
        </View>

        {/* Progress Summary (placeholder until action engine is ported in Sprint 3) */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Action Plan</Text>
          <View style={styles.progressRing}>
            <Text style={styles.progressNumber}>0</Text>
            <Text style={styles.progressLabel}>actions</Text>
          </View>
          <Text style={styles.progressHint}>
            Your personalized action plan will appear here after you chat with the AI Navigator.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => (navigation as any).navigate('Navigator')}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Ask AI Navigator</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { emoji: '🧭', label: 'Ask AI', screen: 'Navigator' },
            { emoji: '📋', label: 'Actions', screen: 'Tracker' },
            { emoji: '📅', label: 'Calendar', screen: 'Documents' },
            { emoji: '👤', label: 'Profile', screen: 'Profile' },
          ].map(action => (
            <TouchableOpacity
              key={action.screen}
              style={styles.quickAction}
              onPress={() => (navigation as any).navigate(action.screen)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    marginBottom: 2,
  },
  parentName: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.white,
  },
  childCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childName: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    flex: 1,
  },
  ageBadge: {
    backgroundColor: '#E6F7F5',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  ageValue: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.teal,
  },
  ageBand: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  empathyCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: radii.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.coral,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  empathyText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressNumber: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  progressLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  progressHint: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
  },
  ctaText: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.white,
  },
  sectionTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
  },
});
