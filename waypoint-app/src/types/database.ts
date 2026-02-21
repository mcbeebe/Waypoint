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
