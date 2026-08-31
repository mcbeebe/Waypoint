/**
 * Main navigation — 5 bottom tabs, each wrapping a stack navigator.
 * Tab roots keep their custom in-screen headers (headerShown: false);
 * pushed detail screens get a standard titled header with back.
 *
 * Roadmap 0.1: registers the previously orphaned screens. Community routes
 * (Forum/Thread/Messages) are gated behind FLAGS.community until moderation
 * tooling ships (roadmap 6.1).
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import HomeScreen from '@/screens/main/HomeScreen';
import NavigatorScreen from '@/screens/main/NavigatorScreen';
import ActionsScreen from '@/screens/main/ActionsScreen';
import CalendarScreen from '@/screens/main/CalendarScreen';
import ProfileScreen from '@/screens/main/ProfileScreen';
import NotificationSettingsScreen from '@/screens/main/NotificationSettingsScreen';
import { NotificationPrefsProvider } from '@/hooks/useNotificationPrefs';
import ActionDetailScreen from '@/screens/main/ActionDetailScreen';
import InsightsScreen from '@/screens/main/InsightsScreen';
import DocumentsScreen from '@/screens/main/DocumentsScreen';
import DocumentAnalysisScreen from '@/screens/main/DocumentAnalysisScreen';
import ProvidersScreen from '@/screens/main/ProvidersScreen';
import ServicesScreen from '@/screens/main/ServicesScreen';
import InsuranceScreen from '@/screens/main/InsuranceScreen';
import JourneyPhaseScreen from '@/screens/main/JourneyPhaseScreen';
import ProcessMapScreen from '@/screens/main/ProcessMapScreen';
import SdpJourneyScreen from '@/screens/main/SdpJourneyScreen';
import EscalationLadderScreen from '@/screens/main/EscalationLadderScreen';
import ResourceStackScreen from '@/screens/main/ResourceStackScreen';
import EligibilityResultScreen from '@/screens/main/EligibilityResultScreen';
import FundedOfferScreen from '@/screens/main/FundedOfferScreen';
import RequestTrackerScreen from '@/screens/main/RequestTrackerScreen';
import RequestCaseScreen from '@/screens/main/RequestCaseScreen';
import PricingScreen from '@/screens/main/PricingScreen';
import HealthRecordsScreen from '@/screens/main/HealthRecordsScreen';
import FamilySharingScreen from '@/screens/main/FamilySharingScreen';
import ProviderPortalScreen from '@/screens/main/ProviderPortalScreen';
import ForumScreen from '@/screens/main/ForumScreen';
import ThreadScreen from '@/screens/main/ThreadScreen';
import MessagesScreen from '@/screens/main/MessagesScreen';
import LettersScreen from '@/screens/main/LettersScreen';
import EmailAnalyzerScreen from '@/screens/main/EmailAnalyzerScreen';
import CommunicationLogScreen from '@/screens/main/CommunicationLogScreen';
import ResourcesScreen from '@/screens/main/ResourcesScreen';
import BlogScreen from '@/screens/main/BlogScreen';
import ArticleScreen from '@/screens/main/ArticleScreen';
import ExpensesScreen from '@/screens/main/ExpensesScreen';
import PlanScreen from '@/screens/main/PlanScreen';
import ToolsScreen from '@/screens/main/ToolsScreen';
import TaxReportScreen from '@/screens/main/TaxReportScreen';
import AgenciesScreen from '@/screens/main/AgenciesScreen';
import ReimbursablesScreen from '@/screens/main/ReimbursablesScreen';
import AskForSupportsScreen from '@/screens/main/AskForSupportsScreen';
import SupportDetailScreen from '@/screens/main/SupportDetailScreen';
import JourneyScreen from '@/screens/main/JourneyScreen';
import IEPHubScreen from '@/screens/main/IEPHubScreen';
import PremiumGate from '@/components/PremiumGate';
import { useIEPGoals } from '@/hooks/useIEPGoals';
import { useToast } from '@/components/Toast';

import { useFamily, useDiagnoses } from '@/hooks/useFamily';
import { useIsDesktopWeb } from '@/components/WebFrame';
import { useActions } from '@/hooks/useActions';
import CompletionCheckIn from '@/components/CompletionCheckIn';
import { FOLLOWUPS } from '@/lib/adaptiveEngine';
import { trackActionOutcome } from '@/lib/analytics';
import type { Action } from '@/types/database';
import { useI18n } from '@/i18n';
import { FLAGS } from '@/lib/flags';
import { COMMUNITY_DESTINATIONS, HOME_DESTINATIONS } from './routeGraph';
import { colors, fonts } from '@/lib/theme';
import type {
  HomeStackParamList,
  NavigatorStackParamList,
  TrackerStackParamList,
  CalendarStackParamList,
  ToolsStackParamList,
} from '@/types/navigation';

const Tab = createBottomTabNavigator();
const JourneyStackNav = createNativeStackNavigator();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const NavigatorStackNav = createNativeStackNavigator<NavigatorStackParamList>();
const TrackerStackNav = createNativeStackNavigator<TrackerStackParamList>();
const CalendarStackNav = createNativeStackNavigator<CalendarStackParamList>();
const ToolsStackNav = createNativeStackNavigator<ToolsStackParamList>();

// Shared header treatment for pushed detail screens
const detailHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerTintColor: colors.teal,
  headerTitleStyle: {
    color: colors.navy,
    fontWeight: fonts.weights.bold as '700',
  },
  headerStyle: { backgroundColor: colors.white },
  headerBackButtonDisplayMode: 'minimal',
};

// ─── Route wrappers for prop-based screens ──────────────────────────────────

/** Loads an action by id and binds useActions mutations to ActionDetailScreen. */
function ActionDetailRoute({ route, navigation }: any) {
  const { actionId } = route.params as { actionId: string };
  const { family } = useFamily();
  const { showToast } = useToast();
  const { actions, loading, updateStatus, toggleStep, updateAction, refetch } = useActions({
    familyId: family?.id ?? '',
  });
  const [checkInAction, setCheckInAction] = React.useState<Action | null>(null);

  const action = actions.find(a => a.id === actionId);
  const dependency = action?.depends_on ? actions.find(a => a.id === action.depends_on) : undefined;
  const { diagnoses } = useDiagnoses(action?.child_id ?? undefined);

  if (loading && !action) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }
  if (!action) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>This action is no longer available.</Text>
      </View>
    );
  }

  return (
    <>
      <ActionDetailScreen
        action={action}
        onUpdateStatus={(status, reason) => {
          // Dependency lock: this step builds on another that isn't done yet
          if (
            (status === 'completed' || status === 'in_progress') &&
            dependency &&
            dependency.status !== 'completed'
          ) {
            showToast(`Complete "${dependency.title}" first — this step builds on it.`, 'info');
            return;
          }
          updateStatus(action.id, status, reason);
          if (status === 'completed' && family?.id) {
            trackActionOutcome(family.id, action.category, 'completed', family.regional_center ?? undefined);
          }
          if (status === 'completed' && action.follow_up_key && FOLLOWUPS[action.follow_up_key]) {
            setCheckInAction(action);
          }
        }}
        onToggleStep={stepIndex => toggleStep(action.id, stepIndex)}
        onUpdate={data => updateAction(action.id, data)}
        // Deep links (waypointchild.com/actions/:id) can open this screen as
        // the stack root — fall back to the list so Back always works.
        onBack={() =>
          navigation.canGoBack() ? navigation.goBack() : navigation.navigate('TrackerList')
        }
      />
      <CompletionCheckIn
        action={checkInAction}
        familyId={family?.id ?? ''}
        ctx={{
          parentName: family?.parent_first_name,
          regionalCenterName: family?.regional_center,
          diagnoses: diagnoses.map(d => d.name),
        }}
        onClose={() => setCheckInAction(null)}
        onActionsAdded={refetch}
      />
    </>
  );
}

function DocumentAnalysisRoute({ route, navigation }: any) {
  const { family } = useFamily();
  const { createGoals } = useIEPGoals(family?.id ?? '');
  const { createAction } = useActions({ familyId: family?.id ?? '' });
  const { showToast } = useToast();
  const { analysis, documentId, childId } = route.params;

  return (
    <DocumentAnalysisScreen
      analysis={analysis}
      onBack={() => navigation.goBack()}
      onCreateActions={async (drafts: Array<{ title: string; description?: string; priority?: string }>) => {
        let added = 0;
        for (const d of drafts) {
          const created = await createAction({
            title: d.title,
            description: d.description,
            category: 'iep',
            priority: (d.priority as any) ?? 'high',
            child_id: childId ?? undefined,
            source: 'system',
          });
          if (created) added++;
        }
        showToast(
          added > 0
            ? `${added} step${added === 1 ? '' : 's'} added to your Action Plan`
            : "Couldn't add those — please try again.",
          added > 0 ? 'success' : 'error'
        );
        return added;
      }}
      onSaveGoals={async goals => {
        const { created, analysisFieldsDropped } = await createGoals(
          goals.map((g: any) => ({
            domain: g.domain,
            goal_text: g.goalText,
            baseline: g.baseline ?? undefined,
            target: g.target ?? undefined,
            measurement: g.measurement ?? undefined,
            child_id: childId ?? undefined,
            document_id: documentId ?? undefined,
            // The rewrite and the reasoning are the reason to save a goal at
            // all — they're what you take into the meeting
            strength: g.strength ?? undefined,
            suggested_rewrite: g.improvedGoal ?? undefined,
            issues: g.weaknesses ?? undefined,
            legal_citation: g.legalCitation ?? undefined,
          }))
        );
        if (created > 0) {
          showToast(
            analysisFieldsDropped
              ? `${created} goals saved — but the suggested rewrites and citations need an update that hasn't been applied yet.`
              : `${created} goals saved to your IEP Hub. 🎯`,
            analysisFieldsDropped ? 'info' : 'success'
          );
          navigation.navigate('IEPHub');
        } else {
          showToast('Could not save goals — please try again.', 'error');
        }
      }}
    />
  );
}

function ForumRoute({ navigation }: any) {
  return <ForumScreen onOpenThread={thread => navigation.navigate('Thread', { thread })} />;
}

function ThreadRoute({ route, navigation }: any) {
  return <ThreadScreen thread={route.params.thread} onBack={() => navigation.goBack()} />;
}

// ─── Per-tab stacks ─────────────────────────────────────────────────────────

/**
 * Every screen behind Home, keyed by the names declared in `routeGraph.ts`.
 *
 * The `Record<HomeDestination, …>` type is the point: a name in the graph
 * with no entry here, or an entry here that is not in the graph, is a
 * compile error. The registry and the navigator cannot drift, which is how
 * the hand-copied version came to certify nine dead taps.
 */
type HomeDestination = (typeof HOME_DESTINATIONS)[number];

interface ScreenSpec {
  title: string;
  component?: React.ComponentType<Record<string, unknown>>;
  /** For screens wrapped in a gate or a route adapter. */
  render?: () => React.ReactElement;
}

const DESTINATION_SCREENS: Record<HomeDestination, ScreenSpec> = {
  Journey: { title: 'Journey Map', component: JourneyScreen },
  JourneyPhase: { title: 'This Stage', component: JourneyPhaseScreen },
  ProcessMap: { title: 'How the System Works', component: ProcessMapScreen },
  SdpJourney: { title: 'Self-Determination Journey', component: SdpJourneyScreen },
  EscalationLadder: { title: 'When Services Aren’t Working', component: EscalationLadderScreen },
  ResourceStack: { title: 'Resource Stack', component: ResourceStackScreen },
  EligibilityResult: { title: 'Your Result', component: EligibilityResultScreen },
  FundedOffer: { title: 'Free Help', component: FundedOfferScreen },
  RequestTracker: { title: 'Requests & Clocks', component: RequestTrackerScreen },
  RequestCase: { title: 'Case File', component: RequestCaseScreen },
  Pricing: { title: 'Free & Premium', component: PricingScreen },
  Agencies: { title: 'Agency Directory', component: AgenciesScreen },
  Reimbursables: { title: 'RC Funding Guide', component: ReimbursablesScreen },
  AskForSupports: { title: 'Supports You Can Ask For', component: AskForSupportsScreen },
  SupportDetail: { title: 'Support', component: SupportDetailScreen },
  // Moved out of the Calendar tab (phase 3): Tools → Money & benefits already
  // listed them, and Plan is about obligations, not spending.
  Expenses: { title: 'Expenses', component: ExpensesScreen },
  TaxReport: {
    title: 'Tax Report',
    render: () => (
      <PremiumGate feature="Expense & tax reports">
        <TaxReportScreen />
      </PremiumGate>
    ),
  },
  Insights: { title: 'Insights', component: InsightsScreen },
  Documents: { title: 'Documents', component: DocumentsScreen },
  DocumentAnalysis: { title: 'IEP Review', component: DocumentAnalysisRoute },
  IEPHub: {
    title: 'IEP Goals & Timeline',
    // Premium gate (W-E: E3) — server also enforces analyze-iep
    render: () => (
      <PremiumGate feature="IEP document analysis">
        <IEPHubScreen />
      </PremiumGate>
    ),
  },
  Letters: { title: 'Letters & Drafts', component: LettersScreen },
  EmailAnalyzer: { title: 'Email Analyzer', component: EmailAnalyzerScreen },
  CommunicationLog: { title: 'Paper Trail', component: CommunicationLogScreen },
  Providers: { title: 'Providers', component: ProvidersScreen },
  Services: { title: 'Services', component: ServicesScreen },
  Insurance: { title: 'Insurance Tracker', component: InsuranceScreen },
  HealthRecords: { title: 'Health Records', component: HealthRecordsScreen },
  FamilySharing: { title: 'Family Sharing', component: FamilySharingScreen },
  // Profile left the bar in phase 5. As a stack screen it gets a header and a
  // back button, and the tab a parent came from stays lit.
  Profile: { title: 'Profile & Settings', component: ProfileScreen },
  ProviderPortal: { title: 'Provider Portal', component: ProviderPortalScreen },
  NotificationSettings: { title: 'Notifications', component: NotificationSettingsScreen },
};

const COMMUNITY_SCREENS: Record<(typeof COMMUNITY_DESTINATIONS)[number], ScreenSpec> = {
  Forum: { title: 'Community', component: ForumRoute },
  Thread: { title: 'Discussion', component: ThreadRoute },
  Messages: { title: 'Messages', component: MessagesScreen },
};

function renderScreens(
  Nav: typeof HomeStackNav,
  names: readonly string[],
  specs: Record<string, ScreenSpec>
) {
  return names.map((name) => {
    const spec = specs[name];
    if (spec.render) {
      return (
        <Nav.Screen key={name} name={name as never} options={{ title: spec.title }}>
          {spec.render}
        </Nav.Screen>
      );
    }
    return (
      <Nav.Screen
        key={name}
        name={name as never}
        component={spec.component as never}
        options={{ title: spec.title }}
      />
    );
  });
}

/** Everything behind Home, built from the declared graph. */
function destinationScreens(Nav: typeof HomeStackNav) {
  return (
    <>
      {renderScreens(Nav, HOME_DESTINATIONS, DESTINATION_SCREENS)}
      {FLAGS.community && renderScreens(Nav, COMMUNITY_DESTINATIONS, COMMUNITY_SCREENS)}
    </>
  );
}

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={detailHeaderOptions}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      {destinationScreens(HomeStackNav)}
    </HomeStackNav.Navigator>
  );
}

/**
 * The toolbox tab (Home rebuild phase 5). It registers ONLY its own screen:
 * tool rows name `tab: 'Home'`, which is one registration, one canonical URL
 * per screen, and no second mounted copy of 28 screens.
 */
function ToolsStack() {
  return (
    <ToolsStackNav.Navigator screenOptions={detailHeaderOptions}>
      <ToolsStackNav.Screen name="ToolsMain" component={ToolsScreen} options={{ headerShown: false }} />
    </ToolsStackNav.Navigator>
  );
}

/**
 * Journey is a first-class bottom-bar tab on every platform (owner request,
 * Aug 30 2026). The stack registers only its map root; JourneyScreen's interior
 * taps name tab:'Home' (see its `goHome`), so phases and entity screens open in
 * the Home stack where they live — no dead taps from this tab.
 */
function JourneyStack() {
  return (
    <JourneyStackNav.Navigator screenOptions={detailHeaderOptions}>
      <JourneyStackNav.Screen
        name="JourneyMain"
        component={JourneyScreen}
        // No native header: JourneyScreen draws its own navy hero, like every
        // other tab root. (Without this the visible tab shows a double header.)
        options={{ headerShown: false }}
      />
    </JourneyStackNav.Navigator>
  );
}

function NavigatorStack() {
  return (
    <NavigatorStackNav.Navigator screenOptions={detailHeaderOptions}>
      <NavigatorStackNav.Screen name="NavigatorMain" component={NavigatorScreen} options={{ headerShown: false }} />
      <NavigatorStackNav.Screen name="Resources" component={ResourcesScreen} options={{ title: 'Resources' }} />
      <NavigatorStackNav.Screen name="Blog" component={BlogScreen} options={{ title: 'Blog' }} />
      {/* The Learn reader (phase 8). Empty header title — the screen renders its
          own headline; the back chevron returns to Learn. */}
      <NavigatorStackNav.Screen name="Article" component={ArticleScreen} options={{ title: '' }} />
    </NavigatorStackNav.Navigator>
  );
}

function TrackerStack() {
  return (
    <TrackerStackNav.Navigator screenOptions={detailHeaderOptions}>
      <TrackerStackNav.Screen name="TrackerList" component={ActionsScreen} options={{ headerShown: false }} />
      <TrackerStackNav.Screen name="ActionDetail" component={ActionDetailRoute} options={{ title: 'Action' }} />
    </TrackerStackNav.Navigator>
  );
}

/**
 * Plan (Home rebuild phase 3): the merged Actions + Calendar tab. Plan is the
 * tab's landing screen; the full calendar stays behind it, because adding,
 * editing, recurrence, reminders and Google sync all live there and merging
 * the two views must not cost the family any of it.
 */
function CalendarStack() {
  return (
    <CalendarStackNav.Navigator screenOptions={detailHeaderOptions}>
      <CalendarStackNav.Screen name="PlanMain" component={PlanScreen} options={{ headerShown: false }} />
      {/* headerShown stays false: CalendarScreen draws its own header and
          top inset, and the stack header would stack a second "Calendar"
          title above it. */}
      <CalendarStackNav.Screen name="CalendarMain" component={CalendarScreen} options={{ headerShown: false }} />
    </CalendarStackNav.Navigator>
  );
}

// ─── Tab Icons (Ionicons — UX kit, roadmap 0.5) ─────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(outline: IoniconName, filled: IoniconName) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <Ionicons name={focused ? filled : outline} size={22} color={color} />
  );
}

// ─── Main Tab Navigator ─────────────────────────────────────────────────────

export default function MainTabs() {
  const { t } = useI18n();
  // Desktop web: tabs become a left nav rail so the app reads as a website
  const isDesktop = useIsDesktopWeb();

  return (
    <NotificationPrefsProvider>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.mid,
        ...(isDesktop
          ? {
              tabBarPosition: 'left' as const,
              tabBarVariant: 'material' as const,
              tabBarLabelPosition: 'beside-icon' as const,
              tabBarLabelStyle: {
                fontSize: fonts.sizes.sm,
                fontWeight: fonts.weights.semibold as '600',
              },
              tabBarStyle: {
                backgroundColor: colors.white,
                borderRightColor: colors.border,
                borderRightWidth: 1,
                minWidth: 220,
                paddingTop: 12,
              },
            }
          : {
              tabBarLabelStyle: {
                fontSize: fonts.sizes.xs,
                fontWeight: fonts.weights.semibold as '600',
              },
              tabBarStyle: {
                backgroundColor: colors.white,
                borderTopColor: colors.border,
                paddingBottom: 4,
                height: 56,
              },
            }),
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t.tabs.home,
          tabBarIcon: tabIcon('home-outline', 'home'),
          tabBarAccessibilityLabel: t.tabs.home,
        }}
      />
      <Tab.Screen
        name="JourneyTab"
        component={JourneyStack}
        options={{
          tabBarLabel: t.tabs.journey,
          tabBarIcon: tabIcon('map-outline', 'map'),
          tabBarAccessibilityLabel: t.tabs.journey,
        }}
      />
      <Tab.Screen
        name="Navigator"
        component={NavigatorStack}
        options={{
          tabBarLabel: t.tabs.askAi,
          tabBarIcon: tabIcon('book-outline', 'book'),
          tabBarAccessibilityLabel: t.tabs.askAi,
        }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsStack}
        options={{
          tabBarLabel: t.tabs.tools,
          tabBarIcon: tabIcon('construct-outline', 'construct'),
          tabBarAccessibilityLabel: t.tabs.tools,
        }}
      />
      <Tab.Screen
        name="Tracker"
        component={TrackerStack}
        options={{
          tabBarLabel: t.tabs.actions,
          tabBarIcon: tabIcon('checkbox-outline', 'checkbox'),
          tabBarAccessibilityLabel: t.tabs.actions,
          // Merged into Plan (Home rebuild phase 3): the stack stays
          // registered so action detail and the full list are still
          // reachable from Plan, but the bar no longer offers two tabs
          // that answer the same question.
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarStack}
        options={{
          tabBarLabel: t.tabs.plan,
          tabBarIcon: tabIcon('calendar-outline', 'calendar'),
          tabBarAccessibilityLabel: t.tabs.plan,
        }}
      />

    </Tab.Navigator>
    </NotificationPrefsProvider>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
  },
  notFound: {
    color: colors.mid,
    fontSize: fonts.sizes.md,
  },
});
