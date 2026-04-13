// Database types — matches supabase/migrations/001_schema_v1.sql

export interface Family {
  id: string;
  user_id: string;
  parent_first_name: string | null;
  parent_last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string;
  county: string | null;
  zip_code: string | null;
  regional_center: string | null;
  school_district: string | null;
  insurance_carrier: string | null;
  insurance_plan: string | null;
  income_bracket: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Diagnosis {
  id: string;
  child_id: string;
  name: string;
  icd_code: string | null;
  diagnosed_date: string | null;
  diagnosing_provider: string | null;
  notes: string | null;
  created_at: string;
}

export type ProviderType = 'therapist' | 'doctor' | 'attorney' | 'coordinator' | 'school' | 'regional_center';

export interface Provider {
  id: string;
  family_id: string;
  name: string;
  provider_type: ProviderType;
  specialty: string | null;
  organization: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServiceType = 'OT' | 'ABA' | 'speech' | 'PT' | 'behavioral' | 'respite' | 'other';
export type FundingSource = 'insurance' | 'regional_center' | 'medi-cal' | 'ccs' | 'private_pay' | 'school';
export type ServiceStatus = 'active' | 'pending' | 'denied' | 'ended';

export interface Service {
  id: string;
  child_id: string;
  family_id: string;
  provider_id: string | null;
  service_type: ServiceType;
  funding_source: FundingSource | null;
  authorized_hours: number | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  authorization_number: string | null;
  status: ServiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'iep' | 'evaluation' | 'insurance_denial' | 'appeal' | 'medical_record' | 'ipp' | 'other';

export interface Document {
  id: string;
  family_id: string;
  child_id: string | null;
  title: string;
  document_type: DocumentType;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  extracted_text: string | null;
  key_dates: Record<string, string> | null;
  tags: string[] | null;
  uploaded_at: string;
  created_at: string;
}

// ─── IEP Document Intelligence (Phase 4) ────────────────────────────────────

export type GoalStrength = 'strong' | 'adequate' | 'weak';
export type WeaknessSeverity = 'critical' | 'major' | 'minor';

export interface IEPGoalWeakness {
  severity: WeaknessSeverity;
  issue: string;
  explanation: string;
}

export interface IEPGoal {
  domain: string;
  goalText: string;
  baseline: string | null;
  target: string | null;
  measurement: string | null;
  timeline: string | null;
  strength: GoalStrength;
  weaknesses: IEPGoalWeakness[];
  improvedGoal: string;
  legalCitation: string | null;
}

export interface IEPAnalysisResult {
  goals: IEPGoal[];
  summary: {
    totalGoals: number;
    strongCount: number;
    adequateCount: number;
    weakCount: number;
    criticalIssues: number;
    overallAssessment: string;
  };
}

// ─── Community Forum (Phase 5) ──────────────────────────────────────────────

export interface ForumCategory {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  sort_order: number;
  is_diagnosis_specific: boolean;
  thread_count: number;
  created_at: string;
}

export interface ForumThread {
  id: string;
  category_id: string;
  author_id: string;
  author_display_name: string;
  title: string;
  body: string;
  tags: string[];
  is_pinned: boolean;
  is_locked: boolean;
  is_hidden: boolean;
  post_count: number;
  last_post_at: string;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  parent_post_id: string | null;
  author_id: string;
  author_display_name: string;
  body: string;
  is_hidden: boolean;
  reaction_count: number;
  created_at: string;
  updated_at: string;
}

export type ReactionType = '👍' | '👏' | '❤️';

export interface ForumReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
}

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface ForumReport {
  id: string;
  reporter_id: string;
  thread_id: string | null;
  post_id: string | null;
  reason: string;
  status: ReportStatus;
  moderator_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export type ExpenseCategory = 'therapy' | 'equipment' | 'transportation' | 'copay' | 'medication' | 'other';
export type ReimbursementStatus = 'none' | 'submitted' | 'approved' | 'denied' | 'received';

export interface Expense {
  id: string;
  family_id: string;
  child_id: string | null;
  provider_id: string | null;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expense_date: string;
  funding_source: string | null;
  is_tax_deductible: boolean;
  receipt_document_id: string | null;
  reimbursement_status: ReimbursementStatus;
  reimbursement_amount: number | null;
  notes: string | null;
  created_at: string;
}

export type AppointmentType = 'therapy' | 'iep_meeting' | 'ipp_meeting' | 'medical' | 'evaluation' | 'other';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  family_id: string;
  child_id: string | null;
  provider_id: string | null;
  title: string;
  appointment_type: AppointmentType | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  reminder_sent: boolean;
  status: AppointmentStatus;
  google_calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DeadlineType = 'iep_annual_review' | 'insurance_appeal' | 'ssi_redetermination' | 'ipp_review' | 'authorization_expiry' | 'other';
export type DeadlineStatus = 'upcoming' | 'action_needed' | 'completed' | 'overdue';

export interface Deadline {
  id: string;
  family_id: string;
  child_id: string | null;
  title: string;
  deadline_type: DeadlineType;
  due_date: string;
  reminder_days: number[];
  status: DeadlineStatus;
  notes: string | null;
  google_calendar_event_id: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  family_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Record<string, unknown>[] | null;
  created_at: string;
}

// ─── Actions (Sprint 3) ─────────────────────────────────────────────────────

export type ActionStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';
export type ActionCategory = 'regional_center' | 'iep' | 'insurance' | 'benefits' | 'medical' | 'legal' | 'general';
export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';
export type ActionSource = 'ai_navigator' | 'manual' | 'system';

export interface ActionStep {
  step: string;
  done: boolean;
}

export interface Action {
  id: string;
  family_id: string;
  child_id: string | null;
  chat_session_id: string | null;
  title: string;
  description: string | null;
  category: ActionCategory;
  priority: ActionPriority;
  status: ActionStatus;
  script: string | null;
  steps: ActionStep[] | null;
  kb_article_ids: string[] | null;
  due_date: string | null;
  deadline_warning_days: number;
  completed_at: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  source: ActionSource;
  source_message_id: string | null;
  follow_up_date: string | null;
  follow_up_note: string | null;
  reminder_sent: boolean;
  local_id: string | null;
  synced_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Aggregated action stats from the action_stats view */
export interface ActionStats {
  family_id: string;
  total_actions: number;
  completed_count: number;
  in_progress_count: number;
  not_started_count: number;
  dismissed_count: number;
  completion_rate: number | null;
  avg_days_to_complete: number | null;
}

// ─── Knowledge Base ─────────────────────────────────────────────────────────

export interface KnowledgeEmbedding {
  id: string;
  content: string;
  source: string;
  section: string | null;
  metadata: Record<string, unknown> | null;
  embedding?: number[];
  created_at: string;
}

/** Result from match_knowledge RPC */
export interface KnowledgeMatch {
  id: string;
  content: string;
  source: string;
  section: string | null;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

/** Result from hybrid_search_knowledge RPC */
export interface HybridSearchMatch extends KnowledgeMatch {
  keyword_rank: number;
  combined_score: number;
}

/** Tone level for AI Navigator responses (ported from GAS MVP) */
export type ToneLevel = 'collaborative' | 'assertive' | 'adversarial';

/** AI Navigator chat context */
export interface ChatContext {
  familyId: string;
  childAge: string | null;
  diagnoses: string[];
  state: string;
  county: string | null;
  regionalCenter: string | null;
  schoolDistrict: string | null;
  insuranceCarrier: string | null;
  toneLevel: ToneLevel;
}

// ─── Google Calendar (Phase 1) ──────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink: string;
  status: string;
  created: string;
  updated: string;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
}

// ─── Gmail (Phase 1) ────────────────────────────────────────────────────────

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  labelIds: string[];
}

// Onboarding convenience type
export interface OnboardingData {
  parentFirstName: string;
  parentLastName: string;
  childName: string;
  childDob: string;
  diagnoses: string[];
  state: string;
  regionalCenter: string | null;
  schoolDistrict: string | null;
  insuranceCarrier: string | null;
  insurancePlan: string | null;
}
