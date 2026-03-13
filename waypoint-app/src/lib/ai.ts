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

/** System prompt builder — ported from GAS MVP with enhancements */
export function buildSystemPrompt(context: ChatContext, ragContext: string): string {
  const toneInstructions = getToneInstructions(context.toneLevel);

  const childInfo = context.childAge
    ? `The parent has a child who is ${context.childAge} old.`
    : 'The parent has a child with a developmental disability.';

  const diagnosisInfo = context.diagnoses.length > 0
    ? `Diagnoses: ${context.diagnoses.join(', ')}.`
    : '';

  const locationInfo = [
    context.county && `County: ${context.county}`,
    context.regionalCenter && `Regional Center: ${context.regionalCenter}`,
    context.schoolDistrict && `School District: ${context.schoolDistrict}`,
    context.insuranceCarrier && `Insurance: ${context.insuranceCarrier}`,
  ]
    .filter(Boolean)
    .join('. ');

  return `You are Waypoint, an AI navigator helping California parents of children with disabilities understand their rights and navigate complex systems including Regional Centers, school districts (IEP), insurance, Medi-Cal, SSI, and other services.

## Your Role
You are like a knowledgeable friend who happens to be a disability rights advocate. You combine deep knowledge of California disability law with genuine empathy and practical guidance.

## Family Context
${childInfo}
${diagnosisInfo}
Location: ${context.state}.${locationInfo ? ' ' + locationInfo : ''}

## Communication Style
${toneInstructions}

## Knowledge Base Context
The following knowledge base articles are relevant to this conversation. Use them to provide accurate, specific guidance with legal citations where appropriate:

${ragContext}

## Critical Rules
1. ALWAYS cite specific code sections when referencing laws (e.g., W&I Code §4512, Ed Code §56341)
2. NEVER provide specific legal advice — frame as "you may have the right to..." or "the law provides..."
3. If unsure about a specific fact, say so — don't fabricate legal citations
4. Always provide concrete next steps the parent can take
5. Be warm and empathetic — these parents are often stressed and overwhelmed
6. When relevant, mention timelines and deadlines (they matter enormously in disability law)
7. If a question falls outside California disability services, acknowledge it and redirect gently`;
}

/** Tone calibration instructions (ported from GAS MVP) */
export function getToneInstructions(tone: ToneLevel): string {
  switch (tone) {
    case 'collaborative':
      return `Use a warm, supportive, collaborative tone. Assume the system (Regional Center, school district, insurance) is acting in good faith and guide the parent through standard processes. Focus on partnership language: "working together," "requesting," "sharing your concerns." This is the default starting tone for new conversations.`;

    case 'assertive':
      return `Use a firm but professional assertive tone. The parent may have encountered resistance or delays. Guide them to assert their legal rights more directly. Use language like "you have the right to," "the law requires them to," "put your request in writing." Reference specific deadlines and consequences for non-compliance. Help them escalate within the system.`;

    case 'adversarial':
      return `Use a direct, advocacy-oriented adversarial tone. The parent is likely facing denials, delays, or rights violations. Guide them through formal dispute resolution: fair hearings, compliance complaints, OAH filings, OCR complaints. Reference specific legal protections and remedies. Help them document everything. Mention when an attorney consultation may be warranted. Be their fiercest advocate while remaining factual and legally grounded.`;
  }
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
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: ChatContext,
  ragContext: string,
  _apiKey: string, // kept for backward compat — ignored, auth via JWT
  callbacks: StreamCallbacks
): Promise<void> {
  const systemPrompt = buildSystemPrompt(context, ragContext);
  const headers = await getAuthHeaders();

  try {
    const response = await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'chat',
        system: systemPrompt,
        messages,
        // Prompt caching: system prompt cached on Anthropic side
        // The Edge Function passes this through to the Anthropic API
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
  _apiKey: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context, ragContext);
  const headers = await getAuthHeaders();

  const response = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'chat',
      system: systemPrompt,
      messages,
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
  query: string,
  _apiKey: string
): Promise<{ sources: string[]; suggestedTone: ToneLevel }> {
  const classificationPrompt = `You are a classifier for a California disability services app. Classify this parent's question.

Question: "${query}"

Respond with JSON only:
{
  "sources": ["source_ids"],
  "tone": "collaborative|assertive|adversarial"
}

Source IDs: regional_center, lanterman_act, iep, idea, medi_cal, ssi, insurance, ccs, fair_hearing, rights, transitions, navigation

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
        system: 'You are an intent classifier. Respond with valid JSON only.',
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
