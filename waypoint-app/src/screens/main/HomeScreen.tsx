/**
 * Home (Roadmap/Home-Rebuild-Plan.md phase 6) — reduced to exactly four things:
 * a greeting, the One Thing card (the single highest-priority next step), a
 * composer that opens the AI Navigator, and one status line saying what was
 * checked. Everything the old dashboard stacked here now lives on its own tab —
 * the agenda on Plan, the action-progress summary on the Tracker (reached from
 * Plan), the toolbox on Tools, Agencies and Journey one tap inside Tools,
 * Profile behind the avatar. The draft flow's engine lives in useDraftFlow;
 * this screen renders the sheet and reading overlay it drives.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { useAppointments } from '@/hooks/useAppointments';
import { useDeadlines } from '@/hooks/useDeadlines';
import { ChildPicker, SelectedChildProvider, useSelectedChild } from '@/components/ChildPicker';
import { useRequests } from '@/hooks/useRequests';
import { useCommunications } from '@/hooks/useCommunications';
import { useTriage } from '@/hooks/useTriage';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationPrefs } from '@/hooks/useNotificationPrefs';
import { reminderPlan, fmtDate } from '@/lib/notificationPolicy';
import { registerPushToken, unregisterPushToken } from '@/lib/pushTokens';
import NotificationPrimingSheet from '@/components/NotificationPrimingSheet';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import OneThingCard, { LaterList } from '@/components/OneThingCard';
import SensorLine from '@/components/SensorLine';
import DraftQuestionsSheet from '@/components/DraftQuestionsSheet';
import { useDraftFlow } from '@/hooks/useDraftFlow';
import { searchLearn, type LearnHit } from '@/lib/learnLibrary';
import { searchToolsForHome, type ToolEntry } from '@/lib/toolsCatalog';
import { getHomeStarters } from '@/lib/homeStarters';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import { looksLikePlanQuery } from '@/lib/planQuery';
import type { TriageAction, TriageItem } from '@/lib/homeTriage';
import { FLAGS } from '@/lib/flags';
import { ageFromDob, toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, brand, fonts, semantic, spacing, radii } from '@/lib/theme';
import AccountMenu from '@/components/AccountMenu';
import { Brandmark } from '@/components/Brandmark';
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

/** The friendly invitation above the search, to pull a parent into typing the
 *  thing on their mind right where they land. Trilingual. */
const MIND_PROMPT: Record<FunnelLocale, string> = {
  en: 'Got something on your mind?',
  es: '¿Tiene algo en mente?',
  vi: 'Quý vị đang băn khoăn điều gì?',
};

/** The composer's placeholder and its screen-reader label — now a real search:
 *  type a worry and get the guide, the article, or the AI. Fully trilingual. */
const COMPOSER_PLACEHOLDER: Record<FunnelLocale, string> = {
  en: 'Ask or search — “they said no”, “IEP”, “diapers”…',
  es: 'Pregunte o busque — “dijeron que no”, “IEP”, “pañales”…',
  vi: 'Hỏi hoặc tìm — “họ từ chối”, “IEP”, “tã”…',
};

/** The always-present "ask the AI" row and the section label for hits. */
const ASK_AI_ROW: Record<FunnelLocale, string> = {
  en: 'Ask Waypoint AI',
  es: 'Preguntar a la IA de Waypoint',
  vi: 'Hỏi Trợ lý AI của Waypoint',
};
const HINT_KINDS: Record<FunnelLocale, { article: string; path: string; glossary: string }> = {
  en: { article: 'Read', path: 'How it works', glossary: 'What it means' },
  es: { article: 'Leer', path: 'Cómo funciona', glossary: 'Qué significa' },
  vi: { article: 'Đọc', path: 'Cách hoạt động', glossary: 'Nghĩa là gì' },
};
/** The kind label on a tool result row. */
const TOOL_KIND: Record<FunnelLocale, string> = {
  en: 'Tool',
  es: 'Herramienta',
  vi: 'Công cụ',
};
const COMPOSER_LABEL: Record<FunnelLocale, string> = {
  en: 'Ask the AI Navigator a question',
  es: 'Hágale una pregunta al Navegador con IA',
  vi: 'Hỏi Trợ lý AI một câu hỏi',
};

/** The explicit "Ask" button inside the composer — makes the AI obviously one
 *  tap away (it replaces the old, unwired mic icon). Trilingual. */
const ASK_BTN: Record<FunnelLocale, string> = {
  en: 'Ask',
  es: 'Preguntar',
  vi: 'Hỏi',
};
const ASK_BTN_LABEL: Record<FunnelLocale, string> = {
  en: 'Ask Waypoint AI your question',
  es: 'Pregúntele a la IA de Waypoint',
  vi: 'Hỏi Trợ lý AI của Waypoint',
};
/** The one-line invitation over the starter chips. */
const STARTER_HINT: Record<FunnelLocale, string> = {
  en: 'Not sure where to start? Try',
  es: '¿No sabe por dónde empezar? Pruebe',
  vi: 'Chưa biết bắt đầu từ đâu? Thử',
};

/** The pinned shortcut under the composer, and its in-results twin — both jump
 *  to the Plan tab (the action plan). Owner request, Aug 31 2026. */
const PLAN_SHORTCUT: Record<FunnelLocale, string> = {
  en: 'My action plan',
  es: 'Mi plan de acción',
  vi: 'Kế hoạch hành động của tôi',
};
const PLAN_RESULT: Record<FunnelLocale, string> = {
  en: 'Go to my action plan',
  es: 'Ir a mi plan de acción',
  vi: 'Đến kế hoạch hành động của tôi',
};

/** Time-based greeting, in the family's own language (ported from GAS MVP,
 *  localized in the Home refresh). */
const GREETING: Record<FunnelLocale, { morning: string; afternoon: string; evening: string }> = {
  en: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  es: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  vi: { morning: 'Chào buổi sáng', afternoon: 'Chào buổi chiều', evening: 'Chào buổi tối' },
};
function getGreeting(locale: FunnelLocale): string {
  const hour = new Date().getHours();
  const g = GREETING[locale];
  if (hour < 12) return g.morning;
  if (hour < 17) return g.afternoon;
  return g.evening;
}

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
  /** Honest failure surface for the card's own writes. */
  const [notice, setNotice] = useState<string | null>(null);
  const { selectedChild } = useSelectedChild();

  const primaryChild = selectedChild;

  // Live actions — triage evidence (task #34). Their load/error state feeds the
  // calm gate: a slow or failed actions fetch must not read as "nothing needs
  // you today".
  const {
    actions,
    loading: actionsLoading,
    error: actionsError,
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
  const [menuOpen, setMenuOpen] = useState(false);
  // Home search (owner, Aug 31 2026): the composer is a real search now — type
  // a worry and get the guide, the article, or the AI, right where you land.
  const [homeQuery, setHomeQuery] = useState('');
  const { deadlines, loading: deadlinesLoading, error: deadlinesError } = useDeadlines({
    familyId: family?.id ?? '',
  });

  // Appointments feed the triage ladder (a same-day appointment can lead) — the
  // next seven days, read alongside the actions and deadlines already loaded.
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
  // ── The outbound loop (phase 7, initiative 003) ───────────────────────────
  // Notification settings + OS permission. The calm state may promise "Waypoint
  // will tell you if <date> passes" only when both are true.
  const { prefs: notifPrefs, loaded: notifPrefsLoaded, primed, update: updateNotifPrefs, markPrimed } =
    useNotificationPrefs();
  const { hasPermission, requestPermission, refreshPermission, syncReminders } = useNotifications();
  // Re-read OS permission whenever Home regains focus (returning from the
  // Settings screen, where the parent may have just granted/revoked it) so the
  // promise and the loop never run on a stale permission value.
  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission])
  );
  const remindersOn = notifPrefs.enabled && hasPermission;

  // Keep this device's server push registration in step with consent (Lane B).
  // The token's presence IS the consent signal (the master toggle lives only
  // on-device, invisible to the server), so register when reminders are on and
  // REMOVE the token when a family with OS permission turns them off in-app —
  // otherwise the server would keep pushing after an opt-out. Both no-op safely
  // on web/simulator / without an EAS projectId.
  useEffect(() => {
    if (!notifPrefsLoaded || !family?.id) return;
    // Pass the app language so a server push arrives in the family's own
    // language; re-registers on a language switch (funnelLocale is a dep).
    if (remindersOn) void registerPushToken(funnelLocale);
    else if (hasPermission) void unregisterPushToken();
  }, [notifPrefsLoaded, remindersOn, hasPermission, family?.id, funnelLocale]);
  // The calm-state promise is a DEADLINE promise ("if <date> passes"), backed
  // by the request-clock reminders — which are gated on the deadlines category.
  // So only make the promise when that category is on, not merely the master.
  const promiseKeepable = remindersOn && notifPrefs.deadlines;

  // Home search results — the library answers first (a guide, an article, a
  // definition), and the AI is always one row away. Trimmed to a handful so
  // Home stays calm; the Learn tab is the full library.
  const homeHits = useMemo<LearnHit[]>(
    () => (homeQuery.trim().length > 1 ? searchLearn(homeQuery, funnelLocale).slice(0, 4) : []),
    [homeQuery, funnelLocale]
  );
  // Tools are searchable from Home too (owner, Aug 31 2026): a query like "help
  // me read my son's IEP" should surface the IEP analyzer, not only Learn hits.
  const toolHits = useMemo<ToolEntry[]>(
    () => (homeQuery.trim().length > 1 ? searchToolsForHome(homeQuery, funnelLocale).slice(0, 2) : []),
    [homeQuery, funnelLocale]
  );
  const searching = homeQuery.trim().length > 1;
  // Tappable openers under the composer — tapping one seeds the search, so the
  // box is never a blank a worried parent has to fill from nothing.
  const starters = useMemo(() => getHomeStarters(funnelLocale), [funnelLocale]);

  /** Open a Tool hit — mirrors ToolsArea: a route with no tab lives on Home. */
  const openTool = useCallback(
    (tool: ToolEntry) => {
      (navigation as any).navigate(tool.route.tab ?? 'Home', {
        screen: tool.route.screen,
        params: tool.route.params,
        initial: false,
      });
      setHomeQuery('');
    },
    [navigation]
  );

  /** Ask the AI the typed question — the always-available fallback. */
  const askAI = useCallback(() => {
    const q = homeQuery.trim();
    (navigation as any).navigate('Navigator', {
      screen: 'NavigatorMain',
      params: q ? { ask: q } : undefined,
    });
    setHomeQuery('');
  }, [homeQuery, navigation]);

  /** Jump to the action plan — the Plan tab (Calendar stack → PlanMain). */
  const openPlan = useCallback(() => {
    (navigation as any).navigate('Calendar', { screen: 'PlanMain' });
    setHomeQuery('');
  }, [navigation]);

  /** Open a hit: an article opens the reader, a guide opens its screen, a bare
   *  definition (no target) hands the word to the AI to explain. */
  const openHit = useCallback(
    (hit: LearnHit) => {
      if (hit.kind === 'article') {
        (navigation as any).navigate('Navigator', {
          screen: 'Article',
          params: { articleKey: hit.key },
          initial: false,
        });
      } else if (hit.target) {
        (navigation as any).navigate(hit.target.tab, {
          screen: hit.target.screen,
          params: hit.target.params,
          initial: false,
        });
      } else {
        askAI();
        return;
      }
      setHomeQuery('');
    },
    [navigation, askAI]
  );

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
    notificationsEnabled: promiseKeepable,
  });

  // Keep the device's scheduled reminders in step with the plan (phase 7). When
  // notifications are on, sync the policy's set; when off, clear everything.
  // Runs on any change to the date-bearing data or the prefs.
  useEffect(() => {
    if (!notifPrefsLoaded) return;
    if (!remindersOn) {
      void syncReminders([]);
      return;
    }
    const specs = reminderPlan({
      requests: familyRequests,
      actions: actions.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        dueOn: a.due_date ? a.due_date.slice(0, 10) : null,
      })),
      now: new Date(),
      locale: funnelLocale,
      prefs: notifPrefs,
    });
    void syncReminders(specs);
  }, [
    notifPrefsLoaded,
    remindersOn,
    notifPrefs,
    familyRequests,
    actions,
    funnelLocale,
    syncReminders,
  ]);

  // The contextual permission ask (7A-3): offer it once, when a family first
  // has a live clock to watch and hasn't been asked. Declining remembers. An
  // already-overdue clock counts as live too — that family most needs the
  // follow-up nudge — so trigger on a time-critical leading item, not only an
  // upcoming date.
  const hasLiveClock =
    triage.nextClockDate != null ||
    (!!triage.item && ['overdue', 'clock', 'today', 'reply'].includes(triage.item.cls));
  const showPriming = notifPrefsLoaded && !primed && !notifPrefs.enabled && hasLiveClock;
  const onEnableNotifs = () => {
    void markPrimed();
    void (async () => {
      const granted = await requestPermission();
      await updateNotifPrefs({ enabled: granted });
    })();
  };

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

  // The draft flow (Roadmap/Draft-Flow-Plan.md phases 9a–9e) — its whole engine
  // lives in this hook now; Home just renders the sheet and overlay it drives.
  const {
    draft,
    closeDraft,
    readingReply,
    letterProfile,
    openDraftFlow,
    cancelReadingReply,
    onDraftComplete,
  } = useDraftFlow({
    family,
    primaryChild,
    familyRequests,
    communications,
    locale: funnelLocale,
    navigate: (screen, params) => (navigation as any).navigate(screen, params),
    onNotice: setNotice,
  });

  const actOnItem = (item: TriageItem) => {
    void markActed(item.id);
    // A draftable card opens the question sheet over Home instead of leaving it.
    if (item.action.kind === 'draft') {
      void openDraftFlow(item);
      return;
    }
    followAction(item.action);
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
      {/* First-run feature tour — an invisible, self-hiding overlay (reads its
          own AsyncStorage flag and renders nothing once completed), so it costs
          the reduced Home no chrome. Kept through phase 6 because it introduces
          the app's still-current features (Navigator, Tracker, Plan, Letters),
          not the deleted dashboard cards, and it backs Profile's "Replay app
          tour" button — shedding it would strand that button and drop the
          first-launch tour. */}
      <OnboardingTutorial onComplete={() => {}} />
      {/* The contextual notification ask (phase 7): shown once, when a live
          clock first exists, so the OS prompt has a reason behind it. */}
      <NotificationPrimingSheet
        visible={showPriming}
        locale={funnelLocale}
        dateLabel={triage.nextClockDate ? fmtDate(triage.nextClockDate, funnelLocale) : null}
        onEnable={onEnableNotifs}
        onDismiss={() => { void markPrimed(); }}
      />
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
        aiSummary={draft?.aiSummary}
        onClose={closeDraft}
        onComplete={onDraftComplete}
      />
      {/* 9e: a brief, honest wait while Waypoint reads the reply before the
          sheet opens. Bounded (8s) and dismissable — tap anywhere or Android
          back to skip straight to the manual sheet. */}
      <Modal
        visible={readingReply}
        transparent
        animationType="fade"
        onRequestClose={cancelReadingReply}
      >
        <Pressable
          style={styles.readingScrim}
          onPress={cancelReadingReply}
          accessibilityRole="button"
          accessibilityLabel={
            funnelLocale === 'es' ? 'Omitir' : funnelLocale === 'vi' ? 'Bỏ qua' : 'Skip'
          }
        >
          <View style={styles.readingCard} accessible accessibilityViewIsModal>
            <ActivityIndicator size="small" color={brand.pine} />
            <Text style={styles.readingText}>
              {funnelLocale === 'es'
                ? 'Waypoint está leyendo su respuesta…'
                : funnelLocale === 'vi'
                  ? 'Waypoint đang đọc thư trả lời…'
                  : 'Waypoint is reading their reply…'}
            </Text>
          </View>
        </Pressable>
      </Modal>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // Results render while the keyboard is up; without this the first tap on
        // a result is swallowed to dismiss the keyboard instead of navigating.
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandmark}>
              <Brandmark size={22} />
              <Text style={styles.wordmark}>WAYPOINT</Text>
            </View>
            <Text style={styles.greeting}>
              {getGreeting(funnelLocale)}
              {family?.parent_first_name ? `, ${family.parent_first_name}` : ''} 👋
            </Text>
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

        {/* The One Thing — the highest rung that is true right now; the
            composer beneath it; one status line saying what was checked; and
            everything set aside listed below with the day it comes back.
            Phase 6 reduced Home to exactly this: greeting → card → composer →
            status line. Every card that used to stack here now lives on its
            own tab — Plan (agenda), Tracker (progress), Tools, Agencies,
            Journey. */}
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
            {/* The invitation + the real search. Type a worry right where you
                land and the library answers first — a guide, an article, or the
                AI. (Was a dead button that only opened the AI.) */}
            <Text style={styles.mindPrompt}>{MIND_PROMPT[funnelLocale]}</Text>
            {/* The composer sits on a faint branded surface — Waypoint's palette
                used once, to mark this as the place you turn a worry into help.
                Bigger field, an explicit "Ask" button (the AI, one tap away),
                and tappable starters so the box is never blank. */}
            <View style={styles.askCard}>
              <View style={styles.composer}>
                <Ionicons name="search" size={20} color={brand.pine} />
                <TextInput
                  style={styles.composerInput}
                  value={homeQuery}
                  onChangeText={setHomeQuery}
                  placeholder={COMPOSER_PLACEHOLDER[funnelLocale]}
                  placeholderTextColor={brand.inkFaint}
                  returnKeyType="search"
                  onSubmitEditing={askAI}
                  accessibilityLabel={COMPOSER_LABEL[funnelLocale]}
                />
                {homeQuery.length > 0 && (
                  <Pressable onPress={() => setHomeQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear">
                    <Ionicons name="close-circle" size={18} color={brand.inkFaint} />
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.askBtn, pressed && styles.askBtnPressed]}
                  onPress={askAI}
                  accessibilityRole="button"
                  accessibilityLabel={ASK_BTN_LABEL[funnelLocale]}
                >
                  <Ionicons name="sparkles" size={14} color={colors.white} />
                  <Text style={styles.askBtnText}>{ASK_BTN[funnelLocale]}</Text>
                </Pressable>
              </View>
              {!searching && (
                <View style={styles.starters}>
                  <Text style={styles.starterHint}>{STARTER_HINT[funnelLocale]}</Text>
                  {starters.map((s) => (
                    <Pressable
                      key={s.key}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                      onPress={() => setHomeQuery(s.seed)}
                      accessibilityRole="button"
                      accessibilityLabel={s.label}
                    >
                      <Ionicons name={s.icon as any} size={13} color={brand.pine} />
                      <Text style={styles.chipText}>{s.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Pinned shortcut to the action plan — always here under the
                composer when not mid-search, so it never has to be searched for. */}
            {!searching && (
              <Pressable
                style={({ pressed }) => [styles.planShortcut, pressed && styles.resultPressed]}
                onPress={openPlan}
                accessibilityRole="button"
                accessibilityLabel={PLAN_SHORTCUT[funnelLocale]}
              >
                <Ionicons name="clipboard-outline" size={18} color={brand.pine} />
                <Text style={styles.planShortcutText}>{PLAN_SHORTCUT[funnelLocale]}</Text>
                <Ionicons name="arrow-forward" size={16} color={brand.inkFaint} />
              </Pressable>
            )}

            {searching && (
              <View style={styles.results}>
                {/* Tools first — a direct action (e.g. the IEP analyzer) beats a
                    guide when the query names something the app can just do. */}
                {toolHits.map((tool) => (
                  <Pressable
                    key={`tool:${tool.key}`}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}
                    onPress={() => openTool(tool)}
                    accessibilityRole="button"
                    accessibilityLabel={`${tool.label}. ${tool.description}`}
                  >
                    <Ionicons name={tool.icon as any} size={18} color={brand.pine} />
                    <View style={styles.resultBody}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{tool.label}</Text>
                      <Text style={styles.resultKind}>{TOOL_KIND[funnelLocale]}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={brand.inkFaint} />
                  </Pressable>
                ))}
                {/* When the query reads as plan intent, offer the Plan tab too —
                    ahead of the library hits. */}
                {looksLikePlanQuery(homeQuery) && (
                  <Pressable
                    style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}
                    onPress={openPlan}
                    accessibilityRole="button"
                    accessibilityLabel={PLAN_RESULT[funnelLocale]}
                  >
                    <Ionicons name="clipboard-outline" size={18} color={brand.pine} />
                    <View style={styles.resultBody}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{PLAN_RESULT[funnelLocale]}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={brand.inkFaint} />
                  </Pressable>
                )}
                {homeHits.map((hit) =>
                  // A definition IS the answer — show it inline and don't route
                  // (the library's own rule). Only navigable hits get a chevron.
                  hit.kind === 'glossary' ? (
                    <View
                      key={`${hit.kind}:${hit.key}`}
                      style={styles.resultRow}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={`${hit.title}: ${hit.detail}`}
                    >
                      <Ionicons name="book-outline" size={18} color={brand.pine} />
                      <View style={styles.resultBody}>
                        <Text style={styles.resultTitle}>{hit.title}</Text>
                        <Text style={styles.resultDefn}>{hit.detail}</Text>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      key={`${hit.kind}:${hit.key}`}
                      style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}
                      onPress={() => openHit(hit)}
                      accessibilityRole="button"
                      accessibilityLabel={`${hit.title}. ${hit.detail}`}
                    >
                      <Ionicons
                        name={hit.kind === 'path' ? 'compass-outline' : 'document-text-outline'}
                        size={18}
                        color={brand.pine}
                      />
                      <View style={styles.resultBody}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{hit.title}</Text>
                        <Text style={styles.resultKind}>{HINT_KINDS[funnelLocale][hit.kind]}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={brand.inkFaint} />
                    </Pressable>
                  )
                )}
                {/* The AI is always the last resort — never a dead end. */}
                <Pressable
                  style={({ pressed }) => [styles.resultRow, styles.askAiRow, pressed && styles.resultPressed]}
                  onPress={askAI}
                  accessibilityRole="button"
                  accessibilityLabel={`${ASK_AI_ROW[funnelLocale]}: ${homeQuery.trim()}`}
                >
                  <Ionicons name="sparkles-outline" size={18} color={brand.pine} />
                  <Text style={styles.askAiText} numberOfLines={1}>
                    {ASK_AI_ROW[funnelLocale]} — “{homeQuery.trim()}”
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={brand.pine} />
                </Pressable>
              </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
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
  // The Waypoint marker + wordmark — the "GPS for the journey" identity, on the
  // screen a family opens most. A touch more prominent than before (owner
  // request) — it frames the greeting without shouting.
  brandmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 5,
  },
  wordmark: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.extrabold as '800',
    letterSpacing: 1.4,
    color: brand.ink,
  },
  greeting: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    marginBottom: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.pine,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.white,
  },
  // The branded surface the composer sits on — a faint pine wash, the palette
  // used once so this reads as "Waypoint's brain" while the rest stays calm.
  askCard: {
    backgroundColor: brand.pineTint,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  // The composer: a bigger search field (60px) that reads as the screen's main
  // event, with an explicit "Ask" button so the AI is obviously one tap away.
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    backgroundColor: brand.panel,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: brand.borderStrong,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs + 2,
    shadowColor: brand.pine,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  composerInput: {
    flex: 1,
    fontSize: 16,
    color: brand.ink,
    paddingVertical: 0,
  },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.pine,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  askBtnPressed: { backgroundColor: brand.pineDeep },
  askBtnText: {
    color: colors.white,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
  },
  // Starter chips — tappable openers that seed the search so the box is never
  // blank. Hidden once a search is underway (the results take the space).
  starters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
    paddingHorizontal: 2,
  },
  starterHint: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    fontWeight: fonts.weights.semibold as '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  chipPressed: { backgroundColor: brand.pineTint },
  chipText: {
    fontSize: fonts.sizes.sm,
    color: brand.inkSoft,
    fontWeight: fonts.weights.semibold as '600',
  },
  mindPrompt: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  results: {
    backgroundColor: brand.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderTopWidth: 1,
    borderTopColor: brand.border,
  },
  resultPressed: { backgroundColor: brand.pineTint },
  resultBody: { flex: 1 },
  resultTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold as '600', color: brand.ink },
  resultDefn: { fontSize: fonts.sizes.sm, color: brand.inkSoft, marginTop: 2, lineHeight: fonts.sizes.sm * 1.45 },
  resultKind: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  askAiRow: { backgroundColor: brand.pineTint },
  askAiText: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold as '600', color: brand.pine },
  planShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: brand.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
  },
  planShortcutText: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold as '600', color: brand.ink },
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
    backgroundColor: brand.panel,
    borderRadius: radii.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    maxWidth: 300,
  },
  readingText: { fontSize: fonts.sizes.base, color: brand.ink, fontWeight: fonts.weights.semibold, flexShrink: 1 },
});
