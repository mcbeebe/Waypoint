/**
 * The navigation graph, as data (Home rebuild, post-phase-5 review).
 *
 * Why this file exists: React Navigation resolves a `navigate` by walking to
 * PARENTS, never to a sibling stack. So a target is only reachable if the
 * caller's own stack registers it, or the call names the tab that does. Get
 * that wrong and the tap does nothing — silently, in production, with the
 * gates green. It has happened twice: the Plan tab's agency-clock rows, and
 * every one of the Learn library's nine destinations.
 *
 * The first attempt at a guard was a hand-copied list of route names in a
 * test file. It drifted immediately and certified nine dead taps, because it
 * encoded what the author believed rather than what the navigator does.
 *
 * So the graph is declared here, `MainTabs.tsx` BUILDS the navigator from it,
 * and the tests read the same structure. A screen that is not in this file
 * does not exist; a screen in this file is registered by construction.
 */

/** Bottom-bar tabs. Hidden ones are registered but have no button. */
export type TabName = 'Home' | 'JourneyTab' | 'Navigator' | 'Tools' | 'Tracker' | 'Calendar';

export interface StackShape {
  /** Route the stack opens on. */
  initial: string;
  /** Every route name registered in this stack, including the initial one. */
  screens: string[];
  /** False for tabs that are registered but have no button on the bar. */
  visible: boolean;
}

/**
 * Screens registered in the Home stack behind Home itself. Tool rows, Learn
 * targets and the account menu all point here, and every caller outside the
 * Home stack must say `tab: 'Home'`.
 */
export const HOME_DESTINATIONS = [
  'Journey', 'JourneyPhase', 'ProcessMap', 'SdpJourney', 'EscalationLadder',
  'ResourceStack', 'EligibilityResult', 'FundedOffer', 'RequestTracker',
  'RequestCase', 'Pricing', 'Agencies', 'Reimbursables', 'Expenses', 'TaxReport',
  'Insights', 'Documents', 'DocumentAnalysis', 'IEPHub', 'Letters',
  'EmailAnalyzer', 'CommunicationLog', 'Providers', 'Services', 'Insurance',
  'HealthRecords', 'FamilySharing', 'Profile', 'ProviderPortal',
  'NotificationSettings',
] as const;

/** Behind the community flag; registered only when it is on. */
export const COMMUNITY_DESTINATIONS = ['Forum', 'Thread', 'Messages'] as const;

export const ROUTE_GRAPH: Record<TabName, StackShape> = {
  Home: {
    initial: 'HomeMain',
    screens: ['HomeMain', ...HOME_DESTINATIONS],
    visible: true,
  },
  // A first-class bottom-bar tab on every platform (owner request, Aug 30 2026).
  // JourneyScreen's interior taps name tab:'Home', so its phases/entities open
  // in the Home stack — the tab hosts the map, Back from a detail returns Home.
  JourneyTab: { initial: 'JourneyMain', screens: ['JourneyMain'], visible: true },
  Navigator: {
    initial: 'NavigatorMain',
    // 'Article' is the Learn reader (phase 8) — registered here so a tap from
    // the Learn panel opens in this stack and Back returns to Learn.
    screens: ['NavigatorMain', 'Resources', 'Blog', 'Article'],
    visible: true,
  },
  Tools: { initial: 'ToolsMain', screens: ['ToolsMain'], visible: true },
  // Merged into Plan (phase 3); the stack stays for action detail and the
  // full list, both reached from Plan.
  Tracker: { initial: 'TrackerList', screens: ['TrackerList', 'ActionDetail'], visible: false },
  Calendar: { initial: 'PlanMain', screens: ['PlanMain', 'CalendarMain'], visible: true },
};

export interface NavTarget {
  screen: string;
  /** The tab whose stack registers `screen`. Omitted means "my own stack". */
  tab?: string;
}

/**
 * Would this navigate actually land? `callerTab` is the tab the calling
 * screen renders in — the thing the first version of this guard got wrong.
 */
export function resolvesFrom(callerTab: TabName, target: NavTarget): boolean {
  const tab = (target.tab ?? callerTab) as TabName;
  const stack = ROUTE_GRAPH[tab];
  if (!stack) return false;
  return stack.screens.includes(target.screen);
}

/** The tabs a parent can actually see on the bar. */
export function visibleTabs(): TabName[] {
  return (Object.keys(ROUTE_GRAPH) as TabName[]).filter((t) => ROUTE_GRAPH[t].visible);
}
