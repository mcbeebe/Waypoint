// Navigation type definitions
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ForumThread, IEPAnalysisResult } from '@/types/database';

export type RootStackParamList = {
  Welcome: undefined;
  ResetPassword: undefined;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Terms: undefined;
  Privacy: undefined;
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
