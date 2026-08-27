/**
 * Home dashboard screen — ported from GAS MVP renderHome()
 * Shows: greeting, child age badge, progress summary, quick actions
 */

import React, { useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import CheckInCard from '@/components/CheckInCard';
import GapPromptsCard from '@/components/GapPromptsCard';
import ProfileCompletionCard from '@/components/ProfileCompletionCard';
import TodayCard from '@/components/TodayCard';
import { useAppointments } from '@/hooks/useAppointments';
import { buildAgenda, type AgendaScope } from '@/lib/agenda';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useExpenses } from '@/hooks/useExpenses';
import { ChildPicker, SelectedChildProvider, useSelectedChild } from '@/components/ChildPicker';
import InsightCard from '@/components/InsightCard';
import StackInsightCard from '@/components/StackInsightCard';
import { deriveHomeInsight } from '@/lib/insights';
import { deriveStackInsight, MEDI_CAL_DEEMING_REQUEST_TITLE } from '@/lib/resourceStack';
import { useRequests } from '@/hooks/useRequests';
import { snoozeFor, isSnoozed } from '@/lib/snooze';
import { ageFromDob, toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { percentageLabel } from '@/lib/accessibility';
import { FLAGS } from '@/lib/flags';
import { lookupRC } from '@/data/regionalCenters';
import { SHOW_JOURNEY_FLAG } from '@/screens/onboarding/OnboardingFlow';

/** Remembers "Everything" vs "Waypoint only" between visits */
const AGENDA_SCOPE_KEY = 'waypoint_agenda_scope';

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

  return (
    <SelectedChildProvider childRecords={children}>
      <HomeScreenInner family={family} />
    </SelectedChildProvider>
  );
}

function HomeScreenInner({ family }: { family: ReturnType<typeof useFamily>['family'] }) {
  const navigation = useNavigation();
  const [empathyIndex, setEmpathyIndex] = useState(0);
  const { selectedChild } = useSelectedChild();

  const primaryChild = selectedChild;
  const age = primaryChild ? getAgeDisplay(primaryChild.date_of_birth) : null;

  // Live data from actions + deadlines + expenses
  const { actions, stats, refetch: refetchActions } = useActions({ familyId: family?.id ?? '' });
  const { diagnoses } = useDiagnoses(primaryChild?.id);
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  // "Waypoint noticed" — the one entitlement this profile isn't using yet
  const insight = useMemo(
    () =>
      primaryChild
        ? deriveHomeInsight(
            {
              ageYears: ageFromDob(primaryChild.date_of_birth),
              rcStatus: primaryChild.rc_status,
              iepStatus: primaryChild.iep_status,
              hasDiagnosis: diagnoses.length > 0,
              childName: primaryChild.first_name,
            },
            funnelLocale
          )
        : null,
    [primaryChild, diagnoses.length, funnelLocale]
  );
  // Resource Stack edition of the same card — takes the slot when the next
  // unlock has a deep-dive guide (Medi-Cal deeming, IHSS). An open tracked
  // deeming request counts as applied, so a sent letter is reflected.
  const { requests: familyRequests } = useRequests(family?.id);
  const mediCalRequested = useMemo(
    () =>
      familyRequests.some(
        (r) =>
          r.title === MEDI_CAL_DEEMING_REQUEST_TITLE &&
          (r.status === 'requested' || r.status === 'in_progress' || r.status === 'granted')
      ),
    [familyRequests]
  );
  const stackInsight = useMemo(
    () =>
      primaryChild
        ? deriveStackInsight(
            {
              ageYears: ageFromDob(primaryChild.date_of_birth),
              rcStatus: primaryChild.rc_status,
              iepStatus: primaryChild.iep_status,
              mediCalStatus: primaryChild.medi_cal_status,
              ihssStatus: primaryChild.ihss_status,
              ssiStatus: primaryChild.ssi_status,
              sdpStep: primaryChild.sdp_step,
              mediCalRequested,
            },
            funnelLocale,
            primaryChild.first_name
          )
        : null,
    [primaryChild, funnelLocale, mediCalRequested]
  );

  // "Remind me later" — per-device snooze on the Waypoint-noticed slot.
  const [insightSnoozed, setInsightSnoozed] = useState<boolean>(false);
  useEffect(() => {
    isSnoozed('home_insight').then(setInsightSnoozed);
  }, []);
  const snoozeInsight = () => {
    setInsightSnoozed(true);
    snoozeFor('home_insight', 7);
  };
  const snoozeLabel =
    funnelLocale === 'es'
      ? 'Recuérdamelo después'
      : funnelLocale === 'vi'
        ? 'Nhắc tôi sau'
        : 'Remind me later';
  const { deadlines } = useDeadlines({ familyId: family?.id ?? '' });
  const { summary: expenseSummary } = useExpenses({ familyId: family?.id ?? '' });

  const urgentDeadlines = deadlines.filter((d) => {
    if (d.status === 'completed') return false;
    const daysLeft = Math.ceil(
      (new Date(d.due_date).getTime() - new Date().getTime()) / 86400000
    );
    return daysLeft <= 14;
  });

  const activeActions = actions.filter((a) => a.status === 'in_progress');
  const completionPct = stats?.completion_rate ?? 0;

  // Today & week at a glance — the next seven days of appointments, read
  // alongside the open actions and deadlines this screen already loads
  const agendaRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }, []);
  const { appointments: agendaAppointments } = useAppointments({
    familyId: family?.id ?? '',
    dateRange: agendaRange,
  });
  // Remembered so the parent isn't re-choosing this every morning
  const [agendaScope, setAgendaScope] = useState<AgendaScope>('all');
  useEffect(() => {
    AsyncStorage.getItem(AGENDA_SCOPE_KEY)
      .then((v) => { if (v === 'waypoint' || v === 'all') setAgendaScope(v); })
      .catch(() => {});
  }, []);
  const changeAgendaScope = (next: AgendaScope) => {
    setAgendaScope(next);
    AsyncStorage.setItem(AGENDA_SCOPE_KEY, next).catch(() => {});
  };

  const agenda = useMemo(
    () =>
      buildAgenda({
        actions,
        appointments: agendaAppointments,
        deadlines,
        now: new Date(),
        scope: agendaScope,
      }),
    [actions, agendaAppointments, deadlines, agendaScope]
  );

  useEffect(() => {
    setEmpathyIndex(Math.floor(Math.random() * EMPATHY_MESSAGES.length));
  }, []);

  const rc = useMemo(
    () => (family?.zip_code ? lookupRC(family.zip_code) : null),
    [family?.zip_code]
  );

  // Post-onboarding reveal: open the eligibility result once (B1 — onboarding
  // ends in an answer; it links onward to the Journey Map), then clear the flag
  useEffect(() => {
    AsyncStorage.getItem(SHOW_JOURNEY_FLAG)
      .then(v => {
        if (v) {
          AsyncStorage.removeItem(SHOW_JOURNEY_FLAG).catch(() => {});
          (navigation as any).navigate('EligibilityResult');
        }
      })
      .catch(() => {});
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* First-visit feature tour — self-hides after completion (AsyncStorage) */}
      <OnboardingTutorial onComplete={() => {}} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.parentName}>{family?.parent_first_name || 'Welcome'}</Text>
            <ChildPicker />
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

        {/* What's on deck today, and the week ahead */}
        {family?.id && (
          <TodayCard
            agenda={agenda}
            childName={primaryChild?.first_name}
            scope={agendaScope}
            onChangeScope={changeAgendaScope}
            onOpenAction={(actionId) =>
              // `initial: false` puts the Actions LIST beneath the detail
              // screen. Without it the detail becomes the whole stack, and
              // both Back and the Actions tab have nowhere to go.
              (navigation as any).navigate('Tracker', {
                screen: 'ActionDetail',
                params: { actionId },
                initial: false,
              })
            }
            onOpenCalendar={() => (navigation as any).navigate('Calendar')}
            onOpenActions={() => (navigation as any).navigate('Tracker')}
          />
        )}

        {/* Waypoint noticed — the highest-leverage unused entitlement. The
            Resource Stack edition wins the slot when a deep-dive unlock
            exists; the generic card covers the other stories. */}
        {insightSnoozed ? null : stackInsight ? (
          <StackInsightCard
            insight={stackInsight}
            locale={funnelLocale}
            onDraft={(template) => (navigation as any).navigate('Letters', { template })}
            onOpenStack={() => (navigation as any).navigate('ResourceStack')}
            onTrack={() => (navigation as any).navigate('RequestTracker')}
            onSnooze={snoozeInsight}
          />
        ) : insight ? (
          <InsightCard
            insight={insight}
            onOpen={(target) =>
              (navigation as any).navigate(target.screen, target.params)
            }
            onSnooze={snoozeInsight}
            snoozeLabel={snoozeLabel}
          />
        ) : null}

        {/* Empathy Message */}
        <View
          style={styles.empathyCard}
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={`Encouragement: ${EMPATHY_MESSAGES[empathyIndex]}`}
        >
          <Text style={styles.empathyText}>
            {EMPATHY_MESSAGES[empathyIndex]}
          </Text>
        </View>

        {/* Finish-your-profile nudge: the details letters keep bracketing */}
        {family?.id && (
          <ProfileCompletionCard
            profile={{
              parentLastName: family.parent_last_name,
              phone: family.phone,
              schoolName: primaryChild?.school_name,
              childGrade: primaryChild?.grade,
            }}
            onOpenProfile={() => (navigation as never as { navigate: (n: string) => void }).navigate('Profile')}
          />
        )}

        {/* Proactive "Waypoint noticed" prompts (P3) */}
        {family?.id && (
          <GapPromptsCard
            familyId={family.id}
            childAgeYears={
              primaryChild?.date_of_birth
                ? (Date.now() - new Date(primaryChild.date_of_birth).getTime()) / 31557600000
                : null
            }
            diagnoses={diagnoses.map((d) => d.name)}
            rcStatus={primaryChild?.rc_status ?? null}
            iepStatus={primaryChild?.iep_status ?? null}
            insurance={family.insurance_carrier}
          />
        )}

        {/* Check-in + frustration deep-dive (wave 2 adaptive engine) */}
        {family?.id && (
          <CheckInCard
            familyId={family.id}
            childId={primaryChild?.id ?? null}
            childName={primaryChild?.first_name}
            parentName={family.parent_first_name}
            regionalCenterName={family.regional_center}
            diagnoses={diagnoses.map((d) => d.name)}
            onActionsAdded={refetchActions}
          />
        )}

        {/* Deadline Alerts */}
        {urgentDeadlines.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => (navigation as any).navigate('Calendar')}
            accessibilityRole="button"
            accessibilityLabel={`${urgentDeadlines.length} upcoming deadline${urgentDeadlines.length !== 1 ? 's' : ''}, tap to view calendar`}
            accessibilityHint="Opens the calendar screen"
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
            <View
              style={styles.progressRing}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={percentageLabel(completionPct, 'of action items complete')}
            >
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

        {/* Financial Summary Widget */}
        <Text style={styles.sectionTitle}>Financial Snapshot</Text>
        <View style={styles.financeCard}>
          <View style={styles.financeRow}>
            <View style={styles.financeItem}>
              <Text style={styles.financeValue}>${expenseSummary.monthlyTotal.toFixed(0)}</Text>
              <Text style={styles.financeLabel}>This Month</Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={[styles.financeValue, { color: '#F59E0B' }]}>
                ${expenseSummary.totalReimbursementPending.toFixed(0)}
              </Text>
              <Text style={styles.financeLabel}>Pending</Text>
            </View>
            <View style={styles.financeItem}>
              <Text style={[styles.financeValue, { color: '#10B981' }]}>
                ${expenseSummary.totalAmount.toFixed(0)}
              </Text>
              <Text style={styles.financeLabel}>YTD Total</Text>
            </View>
          </View>
        </View>

        {/* Journey Map link */}
        <TouchableOpacity
          style={styles.journeyCard}
          onPress={() => (navigation as any).navigate('Journey')}
          accessibilityRole="button"
          accessibilityLabel="Open your journey map"
        >
          <Ionicons name="map-outline" size={22} color={colors.white} style={styles.journeyIcon} />
          <View style={styles.journeyText}>
            <Text style={styles.journeyTitle}>Your Journey Map</Text>
            <Text style={styles.journeySubtitle}>See where you are and what comes next</Text>
          </View>
          <Text style={styles.journeyChevron}>›</Text>
        </TouchableOpacity>

        {/* Regional Center card */}
        {rc && (
          <TouchableOpacity
            style={styles.rcCard}
            onPress={() => (navigation as any).navigate('Agencies')}
            accessibilityRole="button"
            accessibilityLabel={`Your Regional Center: ${rc.name}. Open agency directory.`}
          >
            <Text style={styles.rcLabel}>YOUR REGIONAL CENTER</Text>
            <Text style={styles.rcName}>{rc.name}</Text>
            <Text style={styles.rcPhone}>📞 {rc.phone}</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { icon: 'compass-outline', label: 'Ask AI', screen: 'Navigator' },
            { icon: 'checkbox-outline', label: 'Actions', screen: 'Tracker' },
            { icon: 'calendar-outline', label: 'Calendar', screen: 'Calendar' },
            { icon: 'person-outline', label: 'Profile', screen: 'Profile' },
          ].map(action => (
            <TouchableOpacity
              key={action.screen}
              style={styles.quickAction}
              onPress={() => (navigation as any).navigate(action.screen)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Ionicons name={action.icon as never} size={24} color={colors.teal} style={styles.tileIcon} />
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tools — entry points to the full feature set */}
        <Text style={styles.sectionTitle}>Tools</Text>
        <View style={styles.toolsGrid}>
          {[
            { icon: 'business-outline', label: 'Agencies', go: () => (navigation as any).navigate('Agencies') },
            { icon: 'wallet-outline', label: 'RC Funding', go: () => (navigation as any).navigate('Reimbursables') },
            { icon: 'map-outline', label: 'Journey', go: () => (navigation as any).navigate('Journey') },
            { icon: 'compass-outline', label: 'How It Works', go: () => (navigation as any).navigate('ProcessMap') },
            { icon: 'checkmark-circle-outline', label: 'Your Result', go: () => (navigation as any).navigate('EligibilityResult') },
            { icon: 'stopwatch-outline', label: 'Requests', go: () => (navigation as any).navigate('RequestTracker') },
            { icon: 'folder-open-outline', label: 'Documents', go: () => (navigation as any).navigate('Documents') },
            { icon: 'school-outline', label: 'IEP Hub', go: () => (navigation as any).navigate('IEPHub') },
            { icon: 'mail-outline', label: 'Letters', go: () => (navigation as any).navigate('Letters') },
            { icon: 'search-outline', label: 'Email Check', go: () => (navigation as any).navigate('EmailAnalyzer') },
            { icon: 'file-tray-full-outline', label: 'Paper Trail', go: () => (navigation as any).navigate('CommunicationLog') },
            { icon: 'book-outline', label: 'Resources', go: () => (navigation as any).navigate('Navigator', { screen: 'Resources', initial: false }) },
            { icon: 'newspaper-outline', label: 'Blog', go: () => (navigation as any).navigate('Navigator', { screen: 'Blog', initial: false }) },
            { icon: 'cash-outline', label: 'Expenses', go: () => (navigation as any).navigate('Calendar', { screen: 'Expenses', initial: false }) },
            { icon: 'receipt-outline', label: 'Tax Report', go: () => (navigation as any).navigate('Calendar', { screen: 'TaxReport', initial: false }) },
            { icon: 'shield-checkmark-outline', label: 'Insurance', go: () => (navigation as any).navigate('Insurance') },
            { icon: 'medkit-outline', label: 'Providers', go: () => (navigation as any).navigate('Providers') },
            { icon: 'layers-outline', label: 'Services', go: () => (navigation as any).navigate('Services') },
            { icon: 'bar-chart-outline', label: 'Insights', go: () => (navigation as any).navigate('Insights') },
            { icon: 'star-outline', label: 'Premium', go: () => (navigation as any).navigate('Pricing') },
            { icon: 'people-outline', label: 'Family', go: () => (navigation as any).navigate('FamilySharing') },
            { icon: 'fitness-outline', label: 'Health Records', go: () => (navigation as any).navigate('HealthRecords') },
            { icon: 'briefcase-outline', label: 'Provider Portal', go: () => (navigation as any).navigate('ProviderPortal') },
            ...(FLAGS.community
              ? [
                  { icon: 'chatbubbles-outline', label: 'Community', go: () => (navigation as any).navigate('Forum') },
                  { icon: 'mail-outline', label: 'Messages', go: () => (navigation as any).navigate('Messages') },
                ]
              : []),
          ].map(tool => (
            <TouchableOpacity
              key={tool.label}
              style={styles.toolTile}
              onPress={tool.go}
              accessibilityRole="button"
              accessibilityLabel={tool.label}
            >
              <Ionicons name={tool.icon as never} size={22} color={colors.teal} style={styles.tileIcon} />
              <Text style={styles.toolLabel} numberOfLines={2}>{tool.label}</Text>
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
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toolTile: {
    // 4 tiles per row: 4 × 23% + 3 gaps ≈ 100%
    flexBasis: '23%',
    flexGrow: 1,
    maxWidth: '24%',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toolLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 13,
    marginTop: 2,
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
  tileIcon: {
    marginBottom: 4,
  },
  journeyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  journeyIcon: {
    marginRight: spacing.md,
  },
  journeyText: {
    flex: 1,
  },
  journeyTitle: {
    color: colors.white,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
  },
  journeySubtitle: {
    color: '#9FB3C8',
    fontSize: fonts.sizes.sm,
    marginTop: 1,
  },
  journeyChevron: {
    color: colors.white,
    fontSize: 22,
    marginLeft: spacing.sm,
  },
  rcCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rcLabel: {
    fontSize: 10,
    fontWeight: fonts.weights.bold as '700',
    color: colors.mid,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  rcName: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  rcPhone: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
    marginTop: 2,
  },
  quickActionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
  },
  financeCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  financeItem: {
    alignItems: 'center',
  },
  financeValue: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  financeLabel: {
    fontSize: 10,
    color: colors.mid,
    marginTop: 2,
  },
});
