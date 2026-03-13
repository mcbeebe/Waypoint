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
import { useActions } from '@/hooks/useActions';
import { useDeadlines } from '@/hooks/useDeadlines';
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

  const primaryChild = children.find((c) => c.is_primary) || children[0];
  const age = primaryChild ? getAgeDisplay(primaryChild.date_of_birth) : null;

  // Live data from actions + deadlines
  const { actions, stats } = useActions({ familyId: family?.id ?? '' });
  const { deadlines } = useDeadlines({ familyId: family?.id ?? '' });

  const urgentDeadlines = deadlines.filter((d) => {
    if (d.status === 'completed') return false;
    const daysLeft = Math.ceil(
      (new Date(d.due_date).getTime() - new Date().getTime()) / 86400000
    );
    return daysLeft <= 14;
  });

  const activeActions = actions.filter((a) => a.status === 'in_progress');
  const completionPct = stats?.completion_rate ?? 0;

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

        {/* Deadline Alerts */}
        {urgentDeadlines.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => (navigation as any).navigate('Calendar')}
          >
            <Text style={styles.alertEmoji}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {urgentDeadlines.length} upcoming deadline{urgentDeadlines.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.alertSubtitle} numberOfLines={1}>
                {urgentDeadlines[0].title}
                {urgentDeadlines.length > 1 ? ` + ${urgentDeadlines.length - 1} more` : ''}
              </Text>
            </View>
            <Text style={styles.alertChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Progress Summary — live data */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Your Action Plan</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressRing}>
              <Text style={[styles.progressNumber, completionPct > 0 && { color: colors.sage }]}>
                {Math.round(completionPct)}%
              </Text>
              <Text style={styles.progressLabel}>complete</Text>
            </View>
            <View style={styles.progressStats}>
              <StatRow count={stats?.in_progress_count ?? 0} label="In Progress" color={colors.teal} />
              <StatRow count={stats?.not_started_count ?? 0} label="To Do" color="#94A3B8" />
              <StatRow count={stats?.completed_count ?? 0} label="Completed" color={colors.sage} />
            </View>
          </View>
          {activeActions.length > 0 && (
            <View style={styles.activeSection}>
              <Text style={styles.activeLabel}>Currently working on:</Text>
              {activeActions.slice(0, 2).map((a) => (
                <View key={a.id} style={styles.activeItem}>
                  <Text style={styles.activeItemDot}>◐</Text>
                  <Text style={styles.activeItemText} numberOfLines={1}>{a.title}</Text>
                </View>
              ))}
              {activeActions.length > 2 && (
                <Text style={styles.activeMore}>+{activeActions.length - 2} more</Text>
              )}
            </View>
          )}
          {stats?.total_actions === 0 && (
            <Text style={styles.progressHint}>
              Your personalized action plan will appear here after you chat with the AI Navigator.
            </Text>
          )}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => (navigation as any).navigate(stats?.total_actions ? 'Tracker' : 'Navigator')}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>
              {stats?.total_actions ? 'View Actions' : 'Ask AI Navigator'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { emoji: '🧭', label: 'Ask AI', screen: 'Navigator' },
            { emoji: '📋', label: 'Actions', screen: 'Tracker' },
            { emoji: '📅', label: 'Calendar', screen: 'Calendar' },
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

/** Small stat row for progress card */
function StatRow({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statValue}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  alertEmoji: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: '#DC2626',
  },
  alertSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 2,
  },
  alertChevron: {
    fontSize: 20,
    color: '#DC2626',
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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%' as const,
    marginBottom: spacing.md,
  },
  progressStats: {
    flex: 1,
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
    width: 20,
  },
  statLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  activeSection: {
    width: '100%' as const,
    marginBottom: spacing.md,
  },
  activeLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginBottom: 4,
    fontWeight: fonts.weights.medium as '500',
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activeItemDot: {
    fontSize: 12,
    color: colors.teal,
  },
  activeItemText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    flex: 1,
  },
  activeMore: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontStyle: 'italic' as const,
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
