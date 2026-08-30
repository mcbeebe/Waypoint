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
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import CheckInCard from '@/components/CheckInCard';
import ProfileCompletionCard from '@/components/ProfileCompletionCard';
import TodayCard from '@/components/TodayCard';
import { useAppointments } from '@/hooks/useAppointments';
import { buildAgenda, type AgendaScope } from '@/lib/agenda';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useExpenses } from '@/hooks/useExpenses';
import { ChildPicker, SelectedChildProvider, useSelectedChild } from '@/components/ChildPicker';
import { useRequests } from '@/hooks/useRequests';
import { useCommunications } from '@/hooks/useCommunications';
import { useTriage } from '@/hooks/useTriage';
import OneThingCard, { LaterList } from '@/components/OneThingCard';
import SensorLine from '@/components/SensorLine';
import DraftQuestionsSheet from '@/components/DraftQuestionsSheet';
import { draftHandoff } from '@/lib/draftHandoff';
import { analyzeEmail } from '@/lib/letters';
import { replyReadFromAnalysis } from '@/lib/draftQuestions';
import type { LetterProfile } from '@/lib/draftBlanks';
import type { RequestType } from '@/lib/requestClocks';
import type { TriageAction, TriageItem } from '@/lib/homeTriage';
import { FLAGS } from '@/lib/flags';
import { ageFromDob, toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, fonts, semantic, spacing, radii } from '@/lib/theme';
import { announce, percentageLabel } from '@/lib/accessibility';
import PinnedTools from '@/components/PinnedTools';
import AccountMenu from '@/components/AccountMenu';
import { useToolPins } from '@/hooks/useToolPins';
import { getAllTools } from '@/lib/toolsCatalog';
import { lookupRC } from '@/data/regionalCenters';
import type { RcStatus, IepStatus } from '@/types/database';
import { SHOW_JOURNEY_FLAG } from '@/screens/onboarding/OnboardingFlow';

/** The avatar menu's label and hint — Profile left the bar in phase 5. */
const ACCOUNT_LABEL: Record<FunnelLocale, string> = {
  en: 'Your account',
  es: 'Su cuenta',
  vi: 'Tài khoản của quý vị',
};
const ACCOUNT_HINT: Record<FunnelLocale, string> = {
  en: 'Opens settings, family sharing, documents and your subscription',
  es: 'Abre ajustes, compartir en familia, documentos y su suscripción',
  vi: 'Mở cài đặt, chia sẻ gia đình, tài liệu và gói đăng ký của quý vị',
};

/** The one door to the whole toolbox — it must not be the only English string. */
const ALL_TOOLS_LABEL: Record<FunnelLocale, string> = {
  en: 'All tools',
  es: 'Todas las herramientas',
  vi: 'Tất cả công cụ',
};

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
  const { children, updateChild } = useChildren(family?.id);

  return (
    <SelectedChildProvider childRecords={children}>
      <HomeScreenInner family={family} updateChild={updateChild} />
    </SelectedChildProvider>
  );
}

function HomeScreenInner({
  family,
  updateChild,
}: {
  family: ReturnType<typeof useFamily>['family'];
  updateChild: ReturnType<typeof useChildren>['updateChild'];
}) {
  const navigation = useNavigation();
  const [empathyIndex, setEmpathyIndex] = useState(0);
  /** Honest failure surface for the card's own writes. */
  const [notice, setNotice] = useState<string | null>(null);
  const { selectedChild } = useSelectedChild();

  const primaryChild = selectedChild;
  const age = primaryChild ? getAgeDisplay(primaryChild.date_of_birth) : null;

  // Live data from actions + deadlines + expenses
  const {
    actions,
    stats,
    // Actions became triage evidence (task #34), so their load/error state now
    // has to feed the calm gate — a slow or failed actions fetch must not read
    // as "nothing needs you today".
    loading: actionsLoading,
    error: actionsError,
    refetch: refetchActions,
  } = useActions({ familyId: family?.id ?? '' });
  const { diagnoses } = useDiagnoses(primaryChild?.id);
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  const {
    requests: familyRequests,
    loading: requestsLoading,
    error: requestsError,
  } = useRequests(family?.id);
  const {
    communications,
    loading: commsLoading,
    error: commsError,
    refetch: refetchComms,
  } = useCommunications(family?.id ?? '');
  const toolKeys = useMemo(() => getAllTools('en').map((t) => t.key), []);
  const toolPins = useToolPins(family?.id, toolKeys, funnelLocale);
  // Rendered beside the tiles, not inside the child-card block the other
  // notice lives in — a family with no child record would never have seen it.
  const [toolNotice, setToolNotice] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const sayToolNotice = (message: string) => {
    setToolNotice(message);
    announce(message);
  };
  const { deadlines, loading: deadlinesLoading, error: deadlinesError } = useDeadlines({
    familyId: family?.id ?? '',
  });
  const { summary: expenseSummary } = useExpenses({ familyId: family?.id ?? '' });

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
  // ── The One Thing (Roadmap/Home-Rebuild-Plan.md phase 2) ──────────────────
  // One published ladder decides what leads. Everything decidable is in
  // lib/homeTriage.ts; this screen only renders it and routes the tap.
  const {
    result: triage,
    completedIds,
    shared: deferralsShared,
    defer,
    undo,
    markActed,
  } = useTriage({
    familyId: family?.id,
    childName: primaryChild?.first_name ?? null,
    ageYears: primaryChild ? ageFromDob(primaryChild.date_of_birth) : null,
    rcStatus: primaryChild?.rc_status ?? null,
    iepStatus: primaryChild?.iep_status ?? null,
    childId: primaryChild?.id ?? null,
    hasDiagnosis: diagnoses.length > 0,
    mediCalStatus: primaryChild?.medi_cal_status ?? null,
    ihssStatus: primaryChild?.ihss_status ?? null,
    ssiStatus: primaryChild?.ssi_status ?? null,
    sdpStep: primaryChild?.sdp_step ?? null,
    locale: funnelLocale,
    requests: familyRequests,
    communications,
    deadlines,
    appointments: agendaAppointments,
    // The ladder was blind to plan actions (task #34): pass the same set the
    // agenda already renders so an overdue action can reach the card.
    actions,
    // An empty list because a fetch is in flight — or failed — is not
    // evidence that nothing needs the family today. Actions are in this gate
    // now that the ladder reads them (task #34).
    loading: requestsLoading || commsLoading || deadlinesLoading || actionsLoading,
    dataFailed: !!(requestsError || commsError || deadlinesError || actionsError),
    onRepliesSynced: refetchComms,
  });

  const followAction = (action: TriageAction) => {
    if (action.kind === 'call' && action.tel) {
      Linking.openURL(`tel:${action.tel}`).catch(() => {});
      return;
    }
    if (!action.screen) return;
    if (action.tab) {
      // `initial: false` keeps the tab's own list under the pushed screen,
      // so Back and the tab button both still have somewhere to go.
      (navigation as any).navigate(action.tab, {
        screen: action.screen,
        params: action.params,
        initial: false,
      });
      return;
    }
    (navigation as any).navigate(action.screen, action.params);
  };

  // The draft flow (phase 9b). Everything the app already knows that letters
  // ask for; the questions only read childFirstName today, but the handoff to
  // the Letters screen fills the rest.
  const letterProfile: LetterProfile = useMemo(
    () => ({
      parentFirstName: family?.parent_first_name,
      parentLastName: family?.parent_last_name,
      email: family?.email,
      phone: family?.phone,
      childFirstName: primaryChild?.first_name,
      childGrade: primaryChild?.grade,
      schoolName: primaryChild?.school_name,
      schoolDistrict: family?.school_district,
      regionalCenter: family?.regional_center,
      insurance: family?.insurance_carrier,
    }),
    [family, primaryChild]
  );
  // The open sheet, with the owning request's type resolved AT OPEN TIME — so a
  // requests refetch between opening and "Write my letter" can't swap the letter
  // out from under the parent.
  const [draft, setDraft] = useState<{
    item: TriageItem;
    requestType: RequestType | null;
    initialAnswers?: Record<string, string>;
    aiSummary?: string;
  } | null>(null);
  // While Waypoint reads a reply (9e) before opening the sheet.
  const [readingReply, setReadingReply] = useState(false);

  const actOnItem = (item: TriageItem) => {
    void markActed(item.id);
    // A draftable card opens the question sheet over Home instead of leaving it.
    if (item.action.kind === 'draft') {
      void openDraftFlow(item);
      return;
    }
    followAction(item.action);
  };

  // Open the question sheet. For a reply (9e), let the AI read the reply first
  // so "What did they say?" comes pre-answered — the parent confirms it, so a
  // conservative guess is fine, and a null/failed/consent-less read just opens
  // the sheet with the manual default.
  const openDraftFlow = async (item: TriageItem) => {
    const reqId = item.action.params?.requestId;
    const requestType: RequestType | null =
      (reqId && familyRequests.find((r) => r.id === reqId)?.request_type) || null;
    const replyId = item.action.params?.replyId;
    const reply =
      item.cls === 'reply' && replyId ? communications.find((c) => c.id === replyId) : null;

    if (reply?.body && family?.ai_consent_at) {
      setReadingReply(true);
      try {
        const { analysis } = await analyzeEmail(reply.body, funnelLocale);
        if (analysis) {
          setDraft({
            item,
            requestType,
            initialAnswers: { reply_read: replyReadFromAnalysis(analysis) },
            aiSummary: analysis.summary,
          });
          return;
        }
      } catch {
        /* fall through to the manual sheet */
      } finally {
        setReadingReply(false);
      }
    }
    setDraft({ item, requestType });
  };

  // Sheet complete: turn the answers into a prefilled Letters draft.
  const onDraftComplete = (answers: Record<string, string>) => {
    const d = draft;
    setDraft(null);
    if (!d) return;
    const h = draftHandoff(d.item, answers, {
      requestType: d.requestType,
      profile: letterProfile,
      locale: funnelLocale,
    });
    (navigation as any).navigate('Letters', {
      template: h.template,
      question: h.question,
      guidance: h.guidance,
      tone: h.tone,
      requestId: h.requestId,
    });
  };

  // Answering a question card writes the answer straight to the child, so the
  // ladder's next run is based on it. Nothing is asked twice.
  const answerItem = async (item: TriageItem, value: string) => {
    if (!primaryChild) return;
    let saved = false;
    if (item.id.startsWith('question:rc_status')) {
      saved = await updateChild(primaryChild.id, { rc_status: value as RcStatus });
    } else if (item.id.startsWith('question:iep_status')) {
      saved = await updateChild(primaryChild.id, { iep_status: value as IepStatus });
    }
    if (!saved) {
      setNotice("Couldn't save that answer. Check your connection and try again.");
      return;
    }
    // "I'm not sure" is a legal answer that leaves the question true, so the
    // card would re-render the identical question forever. Setting it aside
    // is what moves Home on, and it comes back with its return date.
    if (value === 'unknown') {
      const ok = await defer(item);
      if (!ok) setNotice("Couldn't save that. It will still be here.");
      return;
    }
    void markActed(item.id);
  };

  const deferItem = async (item: TriageItem) => {
    const ok = await defer(item);
    if (!ok) setNotice("Couldn't set that aside — it will be here next time.");
  };

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
      {/* Profile left the tab bar in phase 5; everything it held lives here. */}
      <AccountMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(item) => (navigation as any).navigate(item.screen, item.params)}
        locale={funnelLocale}
        name={family?.parent_first_name ?? null}
      />
      {/* The draft flow (phase 9b): a "Draft the follow-up" tap opens this over
          Home; completing it lands on a prefilled Letters draft. */}
      <DraftQuestionsSheet
        visible={!!draft}
        item={draft?.item ?? null}
        profile={letterProfile}
        locale={funnelLocale}
        initialAnswers={draft?.initialAnswers}
        aiSummary={draft?.aiSummary}
        onClose={() => setDraft(null)}
        onComplete={onDraftComplete}
      />
      {/* 9e: a brief, honest wait while Waypoint reads the reply before the
          sheet opens pre-answered. */}
      <Modal visible={readingReply} transparent animationType="fade">
        <View style={styles.readingScrim}>
          <View style={styles.readingCard}>
            <ActivityIndicator size="small" color={colors.teal} />
            <Text style={styles.readingText}>
              {funnelLocale === 'es'
                ? 'Waypoint está leyendo su respuesta…'
                : funnelLocale === 'vi'
                  ? 'Waypoint đang đọc thư trả lời…'
                  : 'Waypoint is reading their reply…'}
            </Text>
          </View>
        </View>
      </Modal>
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
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={ACCOUNT_LABEL[funnelLocale]}
            accessibilityHint={ACCOUNT_HINT[funnelLocale]}
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

        {/* The One Thing — the highest rung that is true right now, with the
            sensor line saying what was actually checked, and everything set
            aside listed below with the day it comes back. */}
        {FLAGS.newHome && (
          <>
            <OneThingCard
              result={triage}
              locale={funnelLocale}
              shared={deferralsShared}
              completedIds={completedIds}
              onAct={actOnItem}
              onDefer={(item) => { void deferItem(item); }}
              onAnswer={(item, value) => { void answerItem(item, value); }}
            />
            {!!notice && (
              <Text style={styles.notice} accessibilityRole="alert">
                {notice}
              </Text>
            )}
            <SensorLine sensor={triage.sensor} />
            <LaterList
              later={triage.later}
              locale={funnelLocale}
              shared={deferralsShared}
              onUndo={(id) => {
                void undo(id).then((ok) => {
                  if (!ok) setNotice("Couldn't bring that back just now.");
                });
              }}
            />
          </>
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
            {/* The phone number actually dials (20-persona audit: the most
                valuable real-world action on the page failed at the last inch) */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                Linking.openURL(`tel:${rc.phone.replace(/[^\d+]/g, '')}`).catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel={`Call ${rc.name} at ${rc.phone}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.rcPhone}>📞 {rc.phone} · Tap to call</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Tools became a place (phase 4): Home shows the tiles this family
            pinned, and the whole toolbox is one tap behind them. */}
        <PinnedTools pins={toolPins} locale={funnelLocale} onNotice={sayToolNotice} />
        {!!toolNotice && (
          <Text style={styles.notice} accessibilityRole="alert">
            {toolNotice}
          </Text>
        )}
        <TouchableOpacity
          style={styles.allTools}
          onPress={() => (navigation as any).navigate('Tools')}
          accessibilityRole="button"
          accessibilityLabel={ALL_TOOLS_LABEL[funnelLocale]}
        >
          <Text style={styles.allToolsText}>{ALL_TOOLS_LABEL[funnelLocale]} ›</Text>
        </TouchableOpacity>
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
  allTools: {
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  allToolsText: {
    color: colors.teal,
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.bold,
  },
  notice: {
    fontSize: fonts.sizes.sm,
    color: semantic.warning,
    backgroundColor: semantic.warningBg,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.base,
  },
  readingScrim: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    maxWidth: 300,
  },
  readingText: { fontSize: fonts.sizes.base, color: colors.navy, fontWeight: fonts.weights.semibold, flexShrink: 1 },
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
