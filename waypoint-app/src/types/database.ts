// Database types — will be expanded in Issue #4 (schema v1)

export interface Family {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  first_name: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface Diagnosis {
  id: string;
  child_id: string;
  name: string;
  code: string | null;
  diagnosed_date: string | null;
}

export interface OnboardingData {
  childName: string;
  childDob: string;
  diagnoses: string[];
  state: string;
  regionalCenter: string | null;
  schoolDistrict: string | null;
  insuranceCarrier: string | null;
}
