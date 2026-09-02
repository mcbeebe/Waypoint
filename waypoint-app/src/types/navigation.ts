// Navigation type definitions
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ForumThread, IEPAnalysisResult } from '@/types/database';

export type RootStackParamList = {
  Welcome: undefined;
  ResetPassword: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  /** Staff shell (035/036): facilitators, supervisors, admins land here */
  Staff: NavigatorScreenParams<StaffStackParamList> | undefined;
  Terms: undefined;
  Privacy: undefined;
  /** Family Sharing B3: a tokenised invite link lands here (root-level, so it is reachable before onboarding). */
  JoinFamily: { token?: string } | undefined;
};

/** Facilitation workspace (PRD W-C) — the staff-side stack */
export type StaffStackParamList = {
  StaffHome: undefined;
  /** familyId always; caseId when a live case exists */
  CaseDetail: { familyId: string; caseId?: string };
  PCPBuilder: { caseId: string; familyId: string };
  SpendingPlan: { caseId: string; familyId: string };
  TimeCapture: { caseId: string; familyId: string };
  Baseline: { caseId: string; familyId: string };
  /** Supervisor/admin: dual-payer invoicing + aged receivables (W-D: D2) */
  Billing: undefined;
  /** Supervisor/admin: the four kill-criteria metrics (W-D: D4) */
  Scorecard: undefined;
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Navigator: NavigatorScreenParams<NavigatorStackParamList> | undefined;
  Tracker: NavigatorScreenParams<TrackerStackParamList> | undefined;
  Tools: NavigatorScreenParams<ToolsStackParamList> | undefined;
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Journey: undefined;
  /** "You are here" — Regional Center system by default, or the school system */
  ProcessMap: { system?: 'rc' | 'school' } | undefined;
  /** SDP enrollment stepper, steps 0–8 per DDS D-2026-SDP-002 */
  SdpJourney: undefined;
  /** RC escalation ladder — four rungs, collaborative first (depth plan) */
  EscalationLadder: undefined;
  /** The six benefit layers, foundation-up (Resource Stack plan, phase 4) */
  ResourceStack: undefined;
  /** Eligibility-first result — the funnel's answer screen (PRD W-B: B1) */
  EligibilityResult: undefined;
  /** Funded offer + intro-call booking (PRD W-B: B2/B3) */
  FundedOffer: undefined;
  /** Request/authorization tracker with statutory clocks (PRD W-G: G4) */
  RequestTracker: undefined;
  /** One request, one thread, one honest clock (Request Case File plan) */
  RequestCase: { requestId: string };
  /** Free vs Premium + web checkout (PRD W-E: E1) */
  Pricing: undefined;
  Agencies: undefined;
  Reimbursables: undefined;
  /** Moved out of the Calendar tab in the Home rebuild (phase 3). */
  Expenses: undefined;
  TaxReport: undefined;
  Insights: undefined;
  Documents: undefined;
  DocumentAnalysis: { analysis: IEPAnalysisResult; documentId?: string; childId?: string | null };
  IEPHub: undefined;
  Letters:
    | {
        template?: string;
        question?: string;
        guidance?: string;
        draftBody?: string;
        /** Lever letters launched from a case stamp their log entry with it. */
        requestId?: string;
        /** The draft flow pre-sets the tone the parent chose in the questions. */
        tone?: 'warm' | 'professional' | 'strong';
        /**
         * Overrides the tracked-request title on send. A template can serve
         * several distinct asks (e.g. the IPP-need letter, one per support), so
         * the caller passes a specific title to keep each its own tracked
         * thread — otherwise the constant template title would collapse them.
         */
        trackTitle?: string;
      }
    | undefined;
  EmailAnalyzer: undefined;
  /** Paper trail; highlightId auto-expands an entry; openReplyId opens its reply composer */
  CommunicationLog: { highlightId?: string; openReplyId?: string } | undefined;
  Providers: undefined;
  Services: undefined;
  Insurance: undefined;
  HealthRecords: undefined;
  FamilySharing: undefined;
  ProviderPortal: undefined;
  /** Left the tab bar in phase 5; a stack screen now, so Back works. */
  Profile: undefined;
  // Community — registered only when FLAGS.community is true
  Forum: undefined;
  Thread: { thread: ForumThread };
  Messages: undefined;
};

export type NavigatorStackParamList = {
  NavigatorMain: { ask?: string } | undefined;
  Resources: undefined;
  Blog: undefined;
  Article: { articleKey: string };
};

export type TrackerStackParamList = {
  TrackerList: undefined;
  ActionDetail: { actionId: string };
};

export type CalendarStackParamList = {
  /**
   * Plan is the tab's landing screen; the full calendar sits behind it.
   * `view` preselects a segment — the Navigator's "Plan" button uses it to
   * land on the Action Plan rather than on whichever segment was last used.
   */
  PlanMain: { view?: 'list' | 'month' | 'actions' } | undefined;
  CalendarMain: undefined;
};

/**
 * The Tools tab (Home rebuild phase 5). It registers the same destinations
 * as the Home stack, because a navigate bubbles to parents, not siblings —
 * a tool row tapped here has to resolve here.
 */
export type ToolsStackParamList = Omit<HomeStackParamList, 'HomeMain'> & {
  ToolsMain: undefined;
};
