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
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Journey: undefined;
  /** "You are here" in the Regional Center system (PRD W-G: G1) */
  ProcessMap: undefined;
  /** Eligibility-first result — the funnel's answer screen (PRD W-B: B1) */
  EligibilityResult: undefined;
  /** Funded offer + intro-call booking (PRD W-B: B2/B3) */
  FundedOffer: undefined;
  /** Request/authorization tracker with statutory clocks (PRD W-G: G4) */
  RequestTracker: undefined;
  /** Free vs Premium + web checkout (PRD W-E: E1) */
  Pricing: undefined;
  JourneyPhase: { journeyKey: string; phaseIndex: number };
  Agencies: undefined;
  Reimbursables: undefined;
  Insights: undefined;
  Documents: undefined;
  DocumentAnalysis: { analysis: IEPAnalysisResult; documentId?: string; childId?: string | null };
  IEPHub: undefined;
  Letters:
    | { template?: string; question?: string; guidance?: string; draftBody?: string }
    | undefined;
  EmailAnalyzer: undefined;
  CommunicationLog: undefined;
  Providers: undefined;
  Services: undefined;
  Insurance: undefined;
  HealthRecords: undefined;
  FamilySharing: undefined;
  ProviderPortal: undefined;
  // Community — registered only when FLAGS.community is true
  Forum: undefined;
  Thread: { thread: ForumThread };
  Messages: undefined;
};

export type NavigatorStackParamList = {
  NavigatorMain: { ask?: string } | undefined;
  Resources: undefined;
  Blog: undefined;
};

export type TrackerStackParamList = {
  TrackerList: undefined;
  ActionDetail: { actionId: string };
};

export type CalendarStackParamList = {
  CalendarMain: undefined;
  Expenses: undefined;
  TaxReport: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
};
