/**
 * Supabase Edge Function — AI Proxy
 *
 * Securely proxies AI requests to Anthropic and OpenAI APIs.
 * Keeps API keys server-side (never in client bundle).
 *
 * Endpoints (via action field):
 *   - "chat": Stream a response from Claude (Opus)
 *   - "classify": Classify user intent via Claude (Haiku)
 *   - "embed": Generate embeddings via OpenAI
 *   - "ocr": Extract text from document via Claude vision
 *   - "analyze-iep": Parse IEP goals, weaknesses, and suggestions
 *
 * Auth: Requires Supabase JWT (passed via Authorization header)
 *
 * Deploy: supabase functions deploy ai-proxy
 * Secrets: supabase secrets set ANTHROPIC_API_KEY=xxx OPENAI_API_KEY=xxx
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── Chat (streaming + prompt caching) ──────────────────────────
    if (action === 'chat') {
      const { messages, system, model } = body;

      // Use prompt caching: wrap system prompt in cache_control blocks
      // so the static instructions + KB context are cached across turns
      const systemBlocks = [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
        },
        body: JSON.stringify({
          model: model ?? 'claude-opus-4-6-20250514',
          max_tokens: 4096,
          system: systemBlocks,
          messages,
          stream: true,
        }),
      });

      // Stream the response through
      return new Response(response.body, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ─── Classify (non-streaming) ────────────────────────────────────
    if (action === 'classify') {
      const { query, system: classifySystem } = body;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: classifySystem,
          messages: [{ role: 'user', content: query }],
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── Embed ───────────────────────────────────────────────────────
    if (action === 'embed') {
      const { texts } = body;

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── OCR: Extract text from document image/PDF ────────────────
    if (action === 'ocr') {
      const { documentId, imageBase64, mimeType } = body;

      const ocrResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType || 'image/png',
                    data: imageBase64,
                  },
                },
                {
                  type: 'text',
                  text: 'Extract ALL text from this document image. Preserve the structure, headings, and formatting as closely as possible. If this is an IEP or educational document, pay special attention to goals, objectives, baselines, and dates. Return only the extracted text.',
                },
              ],
            },
          ],
        }),
      });

      const ocrData = await ocrResponse.json();
      const extractedText = ocrData.content?.[0]?.text ?? '';

      // Update document record with extracted text if documentId provided
      if (documentId && extractedText) {
        await supabase
          .from('documents')
          .update({ extracted_text: extractedText })
          .eq('id', documentId);
      }

      return new Response(JSON.stringify({ extractedText, documentId }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ─── Analyze IEP: Parse goals, weaknesses, suggestions ──────
    if (action === 'analyze-iep') {
      const { extractedText, analysisType } = body;
      // analysisType: 'parse' | 'weaknesses' | 'full'

      const systemPrompt = `You are an expert IEP (Individualized Education Program) analyst specializing in California special education law. You analyze IEP documents to identify goals, assess their quality, and suggest improvements.

## Your Expertise
- IDEA Section 300.320 requirements for measurable annual goals
- California Education Code requirements for IEPs
- Best practices for SMART goal writing in special education
- Common weaknesses in IEP goals and how to strengthen them

## Goal Quality Criteria
A strong IEP goal must have ALL of these components:
1. **Baseline**: Current performance level with specific data
2. **Condition**: The circumstances under which the goal will be measured
3. **Behavior**: Observable, measurable target behavior
4. **Criterion**: Specific success criteria (percentage, frequency, duration)
5. **Timeline**: Clear timeframe for achievement
6. **Measurement**: How progress will be measured and reported

## Weakness Severity Levels
- "critical": Goal is non-compliant with IDEA (missing required components)
- "major": Goal is technically compliant but too vague to be meaningful
- "minor": Goal could be strengthened but meets basic requirements`;

      const userPrompt = analysisType === 'parse'
        ? `Parse this IEP document and extract all goals. For each goal, identify:
- domain (e.g., "Reading", "Math", "Speech/Language", "Behavior", "OT", "Social Skills")
- goalText (the full goal text)
- baseline (current performance level, or null if missing)
- target (target performance level, or null if missing)
- measurement (how progress is measured, or null if missing)
- timeline (timeframe, or null if missing)

Return valid JSON: { "goals": [...] }

IEP TEXT:
${extractedText}`
        : `Analyze this IEP document completely. For each goal:
1. Parse the goal components (domain, goalText, baseline, target, measurement, timeline)
2. Identify weaknesses with severity (critical/major/minor) and explanation
3. Provide an improved rewritten version citing IDEA 300.320 where applicable

Return valid JSON:
{
  "goals": [
    {
      "domain": "string",
      "goalText": "string",
      "baseline": "string|null",
      "target": "string|null",
      "measurement": "string|null",
      "timeline": "string|null",
      "strength": "strong|adequate|weak",
      "weaknesses": [
        { "severity": "critical|major|minor", "issue": "string", "explanation": "string" }
      ],
      "improvedGoal": "string",
      "legalCitation": "string|null"
    }
  ],
  "summary": {
    "totalGoals": number,
    "strongCount": number,
    "adequateCount": number,
    "weakCount": number,
    "criticalIssues": number,
    "overallAssessment": "string"
  }
}

IEP TEXT:
${extractedText}`;

      const analysisResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6-20250514',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.content?.[0]?.text ?? '{}';

      // Try to parse the JSON response
      let analysis;
      try {
        // Extract JSON from possible markdown code blocks
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) ?? analysisText.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : analysisText);
      } catch {
        analysis = { error: 'Failed to parse analysis', raw: analysisText };
      }

      return new Response(JSON.stringify(analysis), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ai-proxy] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
