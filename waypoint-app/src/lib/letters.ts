/**
 * Letter generator + email analyzer client — Phase 3 Communication Suite.
 * Thin client over the ai-proxy 'draft' and 'analyze-email' actions
 * (prompts and family context live server-side).
 */

import { supabase } from './supabase';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

export type { DraftTone, LetterTemplate } from './lettersCatalog';
export { LETTER_TEMPLATES, TONE_OPTIONS } from './lettersCatalog';
import type { DraftTone } from './lettersCatalog';

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

// Compose-URL building moved to lib/emailCompose.ts, which routes phones to
// mailto: — Gmail's web compose URL is intercepted on mobile by an
// app-install interstitial that discards the prefilled draft.
