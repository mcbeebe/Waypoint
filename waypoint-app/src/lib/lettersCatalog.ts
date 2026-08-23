/**
 * Letter catalog — template and tone metadata only (PRD W-G: G3 adds the
 * Regional Center lever letters). Pure data, no Supabase import, so the
 * process map and its tests can consume it.
 */

export type DraftTone = 'warm' | 'professional' | 'strong';

export interface LetterTemplate {
  key: string;
  title: string;
  emoji: string;
  description: string;
  /** Who the finished letter goes to (for the Gmail subject hint). */
  audience: string;
}

/** The GAS-ported templates (WP-012) plus the RC lever letters (PRD W-G: G3). */
export const LETTER_TEMPLATES: LetterTemplate[] = [
  { key: 'assessment_request', title: 'Assessment Request', emoji: '📝', description: 'Ask the school district to evaluate your child for special education (starts the legal clock).', audience: 'School district' },
  { key: 'iep_email', title: 'IEP Email', emoji: '🏫', description: 'Email the special education team — requests, concerns, or follow-ups.', audience: 'School district' },
  { key: 'iep_prep', title: 'IEP Meeting Prep', emoji: '📋', description: 'A printable checklist to walk into your IEP meeting prepared.', audience: 'For you' },
  { key: 'pwn_request', title: 'Prior Written Notice', emoji: '📄', description: 'Make the school put a verbal "no" in writing — required by federal law.', audience: 'School district' },
  { key: 'records_request', title: 'Records Request', emoji: '🗂️', description: 'Request all school or Regional Center records (first copy is free).', audience: 'School / RC' },
  { key: 'ipp_review_request', title: 'IPP Meeting Request', emoji: '📅', description: 'Request an IPP review meeting — the RC must hold it within 30 days (W&I §4646.5).', audience: 'Regional Center' },
  { key: 'noa_request', title: 'Put It in Writing', emoji: '📨', description: 'A verbal "no" is not a decision — demand a written Notice of Action with your appeal rights.', audience: 'Regional Center' },
  { key: 'rc_timeline_followup', title: 'Deadline Follow-Up', emoji: '⏱️', description: 'The clock is running — follow up on an overdue assessment or IPP with the statute and the date.', audience: 'Regional Center' },
  { key: 'sdp_info_request', title: 'SDP Info Request', emoji: '🧭', description: 'Ask about Self-Determination: orientation referral, your child\'s authorizations, and budget basis.', audience: 'Regional Center' },
  { key: 'rc_request', title: 'Regional Center Request', emoji: '🏛️', description: 'Request a service or assessment from your Service Coordinator.', audience: 'Regional Center' },
  { key: 'appeal_letter', title: 'Insurance Appeal', emoji: '🏥', description: 'Appeal an insurance denial with a medical-necessity argument.', audience: 'Insurance appeals dept.' },
  { key: 'ihss_appeal', title: 'IHSS Appeal', emoji: '🏠', description: 'Appeal an IHSS denial or too-few hours, with Aid Paid Pending.', audience: 'State hearings office' },
  { key: 'cde_complaint', title: 'CDE Complaint', emoji: '⚖️', description: 'Formal state complaint when the school violates special-ed law.', audience: 'CA Dept. of Education' },
  { key: 'dds_4731_complaint', title: '4731 Complaint', emoji: '🛡️', description: 'Rights-violation complaint against your Regional Center.', audience: 'RC director / DDS' },
  { key: 'complaint', title: 'Other Complaint', emoji: '📢', description: 'Formal complaint — Waypoint picks the right mechanism from your situation.', audience: 'Varies' },
  { key: 'general', title: 'Custom Letter', emoji: '✍️', description: 'Describe what you need and get a clean draft for any situation.', audience: 'Varies' },
];

export const TONE_OPTIONS: Array<{ key: DraftTone; label: string; hint: string }> = [
  { key: 'warm', label: 'Friendly & Warm', hint: 'Short, personal, no legal language' },
  { key: 'professional', label: 'Professional & Clear', hint: 'Organized and firm, minimal citations' },
  { key: 'strong', label: 'Strong & Direct', hint: 'Legal citations, deadlines, expectations' },
];
