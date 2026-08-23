/**
 * Stable action keys (C-12, step 1) — the single catalog that decouples
 * generated actions from their English titles.
 *
 * Before this file, three things silently coupled to title strings: the
 * effort estimates, the follow-up check-in keys, and the reconcile rules.
 * Retitling an action (or localizing it) broke all three without a test
 * failing. Now: titles map to a stable key HERE and nowhere else; every
 * other table keys on the stable key; a test proves every generated action
 * resolves to one. Jurisdiction rides on the catalog so a second state is
 * added as data, not code paths.
 */

export interface ActionKeyEntry {
  key: string;
  jurisdiction: 'CA';
}

/** English title → stable key. The ONLY place a title may be matched. */
export const STABLE_ACTION_KEYS: Record<string, ActionKeyEntry> = {
  'Call Regional Center for Early Start referral': { key: 'rc_early_start_referral', jurisdiction: 'CA' },
  'Call Regional Center to start your referral': { key: 'rc_start_referral', jurisdiction: 'CA' },
  'Follow up on RC application status': { key: 'rc_follow_up_application', jurisdiction: 'CA' },
  'Get a formal evaluation for your child': { key: 'dx_formal_evaluation', jurisdiction: 'CA' },
  'Send written request for IEP meeting': { key: 'iep_request_meeting', jurisdiction: 'CA' },
  'Request school district evaluation (in writing)': { key: 'iep_request_evaluation', jurisdiction: 'CA' },
  'Get pediatrician referral for therapy': { key: 'therapy_pediatrician_referral', jurisdiction: 'CA' },
  'Call insurance to verify therapy coverage': { key: 'insurance_verify_coverage', jurisdiction: 'CA' },
  'Apply for Medi-Cal': { key: 'medical_apply', jurisdiction: 'CA' },
  'Start SSI application': { key: 'ssi_apply', jurisdiction: 'CA' },
  'Apply for IHSS (In-Home Supportive Services)': { key: 'ihss_apply', jurisdiction: 'CA' },
  'Request 504 Plan or IEP evaluation': { key: 'iep_504_request', jurisdiction: 'CA' },
  "Apply for California Children's Services (CCS)": { key: 'ccs_apply', jurisdiction: 'CA' },
  'Apply for CCS and connect with Down syndrome resources': { key: 'ccs_down_syndrome', jurisdiction: 'CA' },
  'Connect with Deaf/HoH specialized services': { key: 'deaf_hoh_services', jurisdiction: 'CA' },
  'Connect with vision impairment services': { key: 'vision_services', jurisdiction: 'CA' },
  'Coordinate TBI-specific services across systems': { key: 'tbi_coordinate', jurisdiction: 'CA' },
  'Request ERMHS (mental health services) through school': { key: 'ermhs_request', jurisdiction: 'CA' },
  'Request speech/language IEP evaluation': { key: 'sli_iep_evaluation', jurisdiction: 'CA' },
  'Apply to Department of Rehabilitation (DOR)': { key: 'dor_apply', jurisdiction: 'CA' },
  'Set up a CalABLE savings account': { key: 'calable_setup', jurisdiction: 'CA' },
};

/** Stable key for a generated title; null when the title is not cataloged. */
export function stableKeyFor(title: string): string | null {
  return STABLE_ACTION_KEYS[title]?.key ?? null;
}
