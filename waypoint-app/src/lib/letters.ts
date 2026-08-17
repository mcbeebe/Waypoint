/**
 * Letter generator + email analyzer client — Phase 3 Communication Suite.
 * Thin client over the ai-proxy 'draft' and 'analyze-email' actions
 * (prompts and family context live server-side).
 */

import { supabase } from './supabase';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

export type DraftTone = 'warm' | 'professional' | 'strong';

export interface LetterTemplate {
  key: string;
  title: string;
  emoji: string;
  description: string;
  /** Who the finished letter goes to (for the Gmail subject hint). */
  audience: string;
}

/** The 12 templates ported from the GAS MVP (WP-012), grouped for the picker. */
export const LETTER_TEMPLATES: LetterTemplate[] = [
  { key: 'assessment_request', title: 'Assessment Request', emoji: '📝', description: 'Ask the school district to evaluate your child for special education (starts the legal clock).', audience: 'School district' },
  { key: 'iep_email', title: 'IEP Email', emoji: '🏫', description: 'Email the special education team — requests, concerns, or follow-ups.', audience: 'School district' },
  { key: 'iep_prep', title: 'IEP Meeting Prep', emoji: '📋', description: 'A printable checklist to walk into your IEP meeting prepared.', audience: 'For you' },
  { key: 'pwn_request', title: 'Prior Written Notice', emoji: '📄', description: 'Make the school put a verbal "no" in writing — required by federal law.', audience: 'School district' },
  { key: 'records_request', title: 'Records Request', emoji: '🗂️', description: 'Request all school or Regional Center records (first copy is free).', audience: 'School / RC' },
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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface GenerateLetterOptions {
  draftType: string;
  tone: DraftTone;
  /** What the parent needs, in their own words. */
  question: string;
  /** Optional prior AI guidance to ground the draft (e.g. from Navigator). */
  guidance?: string;
  language?: string;
}

export async function generateLetter(
  options: GenerateLetterOptions
): Promise<{ draft: string | null; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'draft', ...options }),
    });
    if (!response.ok) {
      if (response.status === 403) return { draft: null, error: 'consent_required' };
      if (response.status === 429) {
        return { draft: null, error: "You've reached today's AI limit — it resets at midnight." };
      }
      return { draft: null, error: `Draft failed (${response.status})` };
    }
    const data = await response.json();
    return { draft: data.draft ?? null };
  } catch (err) {
    return { draft: null, error: err instanceof Error ? err.message : 'Draft failed' };
  }
}

export interface EmailAnalysis {
  summary: string;
  sender_type: string;
  tone_assessment: string;
  red_flags: Array<{ flag: string; severity: 'high' | 'medium' | 'low'; law_cited?: string }>;
  action_items: Array<{ action: string; deadline?: string; urgency: 'high' | 'medium' | 'low' }>;
  rights_at_stake: string[];
  suggested_response: string;
  offer_to_draft: string | null;
}

export async function analyzeEmail(
  emailText: string,
  language?: string
): Promise<{ analysis: EmailAnalysis | null; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'analyze-email', emailText, language }),
    });
    if (!response.ok) {
      if (response.status === 403) return { analysis: null, error: 'consent_required' };
      if (response.status === 429) {
        return { analysis: null, error: "You've reached today's AI limit — it resets at midnight." };
      }
      return { analysis: null, error: `Analysis failed (${response.status})` };
    }
    const data = await response.json();
    return { analysis: data.analysis ?? null };
  } catch (err) {
    return { analysis: null, error: err instanceof Error ? err.message : 'Analysis failed' };
  }
}

/**
 * Open a prefilled Gmail compose window (web). Works without any OAuth —
 * it's just a URL. Falls back to mailto: elsewhere.
 */
export function openInGmail(subject: string, body: string): string {
  const params = new URLSearchParams({ view: 'cm', su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
