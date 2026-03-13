/**
 * i18n type definitions
 * Supports English, Spanish, Vietnamese
 */

export type SupportedLocale = 'en' | 'es' | 'vi';

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  rtl: false;
}

export const LOCALES: Record<SupportedLocale, LocaleConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', rtl: false },
};

/**
 * Translation keys — structured by screen/feature area.
 * Every key here must have translations in all locale files.
 */
export interface TranslationStrings {
  // ─── Common ──────────────────────────────────────────────
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    done: string;
    back: string;
    next: string;
    ok: string;
    yes: string;
    no: string;
    search: string;
    noResults: string;
    pullToRefresh: string;
  };

  // ─── Tabs ────────────────────────────────────────────────
  tabs: {
    home: string;
    askAi: string;
    actions: string;
    calendar: string;
    profile: string;
  };

  // ─── Home Screen ─────────────────────────────────────────
  home: {
    goodMorning: string;
    goodAfternoon: string;
    goodEvening: string;
    welcome: string;
    dashboard: string;
    upcomingDeadlines: string;
    deadlineCount: string;
    actionPlan: string;
    complete: string;
    inProgress: string;
    toDo: string;
    completed: string;
    currentlyWorkingOn: string;
    more: string;
    viewActions: string;
    askAiNavigator: string;
    actionPlanHint: string;
    quickActions: string;
  };

  // ─── Navigator (AI Chat) ─────────────────────────────────
  navigator: {
    title: string;
    subtitle: string;
    placeholder: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    toneCollaborative: string;
    toneAssertive: string;
    toneAdversarial: string;
    suggestIep: string;
    suggestRc: string;
    suggestInsurance: string;
    suggestRights: string;
    suggestServices: string;
    thinking: string;
    errorGeneric: string;
    newChat: string;
  };

  // ─── Actions ─────────────────────────────────────────────
  actions: {
    title: string;
    all: string;
    notStarted: string;
    inProgress: string;
    completed: string;
    dismissed: string;
    noActions: string;
    noActionsHint: string;
    steps: string;
    stepsComplete: string;
    dueIn: string;
    days: string;
    overdue: string;
    priority: {
      critical: string;
      high: string;
      medium: string;
      low: string;
    };
    script: string;
    kbArticles: string;
    dismiss: string;
    dismissReason: string;
    timeline: string;
  };

  // ─── Calendar ────────────────────────────────────────────
  calendar: {
    title: string;
    appointments: string;
    deadlines: string;
    addAppointment: string;
    addDeadline: string;
    noEvents: string;
    noDeadlines: string;
    today: string;
    daysLeft: string;
    overdue: string;
    urgent: string;
    typeLabels: {
      iep_meeting: string;
      medical: string;
      therapy: string;
      regional_center: string;
      insurance: string;
      legal: string;
      school: string;
      other: string;
    };
  };

  // ─── Documents ───────────────────────────────────────────
  documents: {
    title: string;
    upload: string;
    noDocuments: string;
    noDocumentsHint: string;
    uploadFirst: string;
    typeLabels: {
      iep: string;
      evaluation: string;
      insurance_denial: string;
      appeal: string;
      medical_record: string;
      ipp: string;
      other: string;
    };
    keyDates: string;
  };

  // ─── Profile ─────────────────────────────────────────────
  profile: {
    title: string;
    signOut: string;
    language: string;
    children: string;
    addChild: string;
    editChild: string;
    providers: string;
    services: string;
    settings: string;
    about: string;
    version: string;
    feedback: string;
    privacy: string;
    terms: string;
  };

  // ─── Auth ────────────────────────────────────────────────
  auth: {
    signIn: string;
    signUp: string;
    email: string;
    password: string;
    forgotPassword: string;
    continueWithApple: string;
    noAccount: string;
    hasAccount: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
  };

  // ─── Empathy Messages (rotating) ─────────────────────────
  empathy: string[];

  // ─── Accessibility ───────────────────────────────────────
  a11y: {
    openProfile: string;
    sendMessage: string;
    selectTone: string;
    toggleStep: string;
    filterByType: string;
    navigateToTab: string;
    deadlineAlert: string;
    progressPercent: string;
  };
}
