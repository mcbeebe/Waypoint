/**
 * The web/deep-link URL for every screen (extracted from App.tsx so a test
 * can read it).
 *
 * Every screen a family can reach deserves a URL: on web that is what makes
 * browser back, bookmarks and a shared link work. `linking.test.ts` checks
 * this against `routeGraph.ts` — a screen registered with no path is a page
 * nobody can link to, and a path naming a screen that is not registered is a
 * dead bookmark. Both have shipped.
 */
export interface StackLinking {
  initialRouteName?: string;
  screens: Record<string, string>;
}

export const MAIN_LINKING: { screens: Record<string, StackLinking> } = {
  screens: {
    Home: {
      // Deep links to nested screens get the list/root screen placed
      // beneath them, so Back always has somewhere to go (e.g. opening
      // /actions/:id directly no longer strands the user).
      initialRouteName: 'HomeMain',
      screens: {
        HomeMain: '',
        Journey: 'journey',
        ProcessMap: 'how-it-works',
        EscalationLadder: 'escalation-ladder',
        EligibilityResult: 'your-result',
        FundedOffer: 'free-help',
        RequestTracker: 'requests',
        Pricing: 'premium',
        JourneyPhase: 'journey/:journeyKey/:phaseIndex',
        Agencies: 'agencies',
        Reimbursables: 'rc-funding',
        // Moved out of the Calendar tab in the Home rebuild (phase 3);
        // the old /expenses and /tax-report links keep working.
        Expenses: 'expenses',
        TaxReport: 'tax-report',
        Profile: 'profile',
        Insights: 'insights',
        Documents: 'documents',
        IEPHub: 'iep',
        Letters: 'letters',
        EmailAnalyzer: 'email-analyzer',
        CommunicationLog: 'paper-trail',
        Providers: 'providers',
        Services: 'services',
        Insurance: 'insurance',
        HealthRecords: 'health-records',
        FamilySharing: 'family',
        NotificationSettings: 'notifications',
        ProviderPortal: 'provider-portal',
        Forum: 'community',
        Messages: 'messages',
      },
    },
    JourneyTab: {
      screens: { JourneyMain: 'journey-map' },
    },
    Navigator: {
      initialRouteName: 'NavigatorMain',
      screens: { NavigatorMain: 'ask', Resources: 'resources', Blog: 'blog', Article: 'learn/:articleKey' },
    },
    Tools: {
      initialRouteName: 'ToolsMain',
      // /tools is the URL the previous release shipped; keep it.
      screens: { ToolsMain: 'tools' },
    },
    Tracker: {
      initialRouteName: 'TrackerList',
      screens: { TrackerList: 'actions', ActionDetail: 'actions/:actionId' },
    },
    Calendar: {
      // Plan is the tab's landing screen (Home rebuild phase 3); the
      // full calendar sits behind it and keeps its own URL.
      initialRouteName: 'PlanMain',
      screens: { PlanMain: 'plan', CalendarMain: 'calendar' },
    },
  },
};
