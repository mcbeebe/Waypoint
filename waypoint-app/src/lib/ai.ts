/**
 * AI Navigator service — interfaces with Anthropic Claude via Supabase Edge Function
 *
 * All API calls route through the ai-proxy Edge Function to keep
 * API keys server-side. The client sends the Supabase JWT for auth.
 *
 * Features:
 * - Streaming responses via SSE (proxied through Edge Function)
 * - Tone calibration (collaborative → assertive → adversarial)
 * - RAG context injection from pgvector KB
 * - Family context personalization
 * - Prompt caching for cost optimization
 */

import { supabase } from './supabase';
import type { ChatContext, ToneLevel } from '@/types/database';
import type { RAGConfidence } from './rag';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

/** Get current Supabase auth token for Edge Function auth */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * The Navigator system prompt is built SERVER-SIDE in the ai-proxy edge
 * function (Wave 1 hardening) from DB-derived family context — the client
 * sends only conversation data (messages, tone, retrieved KB articles).
 * Guardrails (medical boundary, crisis protocol, legal disclaimer) can
 * therefore not be stripped by a modified client.
 */

/** Content blocks for messages with image attachments (Claude vision). */
export type ChatContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

export interface ApiChatMessage {
  role: 'user' | 'assistant';
  content: string | ChatContentBlock[];
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

/**
 * Send a message to the AI Navigator with streaming response.
 * Routes through the Supabase Edge Function (ai-proxy) to keep API keys server-side.
 *
 * Includes prompt caching: the system prompt uses cache_control breakpoints
 * so the static portions (instructions, KB context) are cached across messages.
 */
export async function streamNavigatorResponse(
  messages: ApiChatMessage[],
  context: ChatContext,
  ragContext: string,
  callbacks: StreamCallbacks,
  ragConfidence: RAGConfidence = 'high'
): Promise<void> {
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'chat',
        messages,
        tone: context.toneLevel,
        ragContext,
        ragConfidence,
        // Snappy chat: low effort cuts thinking latency and shortens output.
        output_config: { effort: 'low' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI proxy error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    // Process SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            callbacks.onToken(event.delta.text);
          }

          if (event.type === 'message_stop') {
            callbacks.onComplete(fullText);
            return;
          }
        } catch {
          // Skip malformed JSON lines in SSE stream
        }
      }
    }

    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Non-streaming version for simpler use cases
 */
export async function getNavigatorResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: ChatContext,
  ragContext: string,
  ragConfidence: RAGConfidence = 'high'
): Promise<string> {
  const headers = await getAuthHeaders();

  const response = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'chat',
      messages,
      tone: context.toneLevel,
      ragContext,
      ragConfidence,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI proxy error (${response.status}): ${errorText}`);
  }

  // For non-streaming, collect the full SSE response
  const text = await response.text();
  const lines = text.split('\n');
  let fullText = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') continue;
    try {
      const event = JSON.parse(data);
      if (event.type === 'content_block_delta' && event.delta?.text) {
        fullText += event.delta.text;
      }
    } catch {
      // skip
    }
  }

  return fullText;
}

/**
 * Classify user intent to determine which KB sources to search.
 * Uses a fast model (Haiku) via the Edge Function.
 */
export async function classifyIntent(
  query: string
): Promise<{ sources: string[]; suggestedTone: ToneLevel }> {
  const classificationPrompt = `You are a classifier for a California disability services app. Classify this parent's question.

Question: "${query}"

Respond with JSON only:
{
  "sources": ["source_ids"],
  "tone": "collaborative|assertive|adversarial"
}

Source IDs (pick the ones that match the question's topics):
- regional_center — Lanterman Act, Regional Center intake, IPP, purchase of service, RC fair hearings
- iep — school services, IDEA/FAPE, CA Ed Code, IEP meetings, disputes, IEEs, 504 plans, SELPA
- benefits — Medi-Cal, SSI, IHSS, CCS, CalABLE, special needs trusts, funding waterfall
- insurance — private insurance appeals, medical necessity, denials/EOBs, DMHC
- rights — fair hearings, complaints, timelines, due process, DRC, OAH, conservatorship
- navigation — finding providers, waitlists, coordinating systems, assessments, therapies
- transitions — Early Start (0-3), age 3 transition, transition to adulthood, DOR
- journey_autism / journey_pda / journey_adhd / journey_id / journey_sld / journey_sli — step-by-step guides for a specific diagnosis (autism, PDA, ADHD, intellectual disability, specific learning disability, speech-language). Include when the question names or implies one of these diagnoses.
- cross_reference — which services/programs a specific diagnosis qualifies for
- age_timeline — what to do at the child's current age, what's coming next
- equity — discrimination, spending disparities, language access, rural access
- resources — parent organizations, support groups, PTIs, national resources

Rules:
- If about rights violations, denials, or appeals → tone: "adversarial"
- If about processes, eligibility, or how-to → tone: "collaborative"
- If about pushing back, delays, or escalation → tone: "assertive"`;

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'classify',
        query: classificationPrompt,
      }),
    });

    if (!response.ok) {
      return { sources: [], suggestedTone: 'collaborative' };
    }

    const result = await response.json();
    const text = result.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);
    return {
      sources: parsed.sources ?? [],
      suggestedTone: parsed.tone ?? 'collaborative',
    };
  } catch {
    return { sources: [], suggestedTone: 'collaborative' };
  }
}
