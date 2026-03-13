/**
 * AI Navigator service — interfaces with Anthropic Claude API
 * Ported and enhanced from GAS MVP Code.gs AI engine
 *
 * Features:
 * - Streaming responses via Anthropic Messages API
 * - Tone calibration (collaborative → assertive → adversarial)
 * - RAG context injection from pgvector KB
 * - Family context personalization
 */

import type { ChatContext, ToneLevel, ChatMessage } from '@/types/database';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2048;

/** System prompt builder — ported from GAS MVP with enhancements */
function buildSystemPrompt(context: ChatContext, ragContext: string): string {
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
    context.insuranceCarrier && `Insurance: ${context.insuranceCarrier}${context.toneLevel === 'collaborative' ? '' : ''}`,
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
function getToneInstructions(tone: ToneLevel): string {
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
 * Send a message to the AI Navigator with streaming response
 * @param messages - Conversation history
 * @param context - Family context for personalization
 * @param ragContext - Retrieved KB articles
 * @param apiKey - Anthropic API key
 * @param callbacks - Streaming callbacks
 */
export async function streamNavigatorResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: ChatContext,
  ragContext: string,
  apiKey: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const systemPrompt = buildSystemPrompt(context, ragContext);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
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

    // If we exit the loop without message_stop, still complete
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
  apiKey: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context, ragContext);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.content[0]?.text ?? '';
}

/**
 * Classify user intent to determine which KB sources to search
 * Uses a fast model (Haiku) for low-latency classification
 */
export async function classifyIntent(
  query: string,
  apiKey: string
): Promise<{ sources: string[]; suggestedTone: ToneLevel }> {
  const classificationPrompt = `Classify this parent's question about California disability services.

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

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: classificationPrompt }],
    }),
  });

  if (!response.ok) {
    // Fall back to default classification on error
    return { sources: [], suggestedTone: 'collaborative' };
  }

  try {
    const result = await response.json();
    const text = result.content[0]?.text ?? '{}';
    const parsed = JSON.parse(text);
    return {
      sources: parsed.sources ?? [],
      suggestedTone: parsed.tone ?? 'collaborative',
    };
  } catch {
    return { sources: [], suggestedTone: 'collaborative' };
  }
}
