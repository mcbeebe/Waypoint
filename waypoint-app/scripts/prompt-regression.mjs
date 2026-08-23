#!/usr/bin/env node
/**
 * Prompt-regression suite (PRD W-F: F4) — replays the GAS MVP's QA golden
 * set (qa/promptRegression.golden.json, ported from QATests.csv) against
 * the DEPLOYED ai-proxy classifier and scores category + tone agreement.
 *
 * Run (same auth pattern as eval-navigator.mjs):
 *   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
 *   WAYPOINT_JWT=<a signed-in user's access token> \
 *   node scripts/prompt-regression.mjs
 *
 * Options:
 *   QA_LIMIT=10            run a subset (cost control; default: all 78)
 *   QA_MIN_CATEGORY=0.85   category pass-rate gate
 *   QA_MIN_TONE=0.80       tone pass-rate gate
 *
 * Costs real API tokens (Haiku classify per case). CI runs it on a
 * schedule/dispatch with secrets — never on every PR.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const JWT = process.env.WAYPOINT_JWT;
if (!BASE || !JWT) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and WAYPOINT_JWT (see header comment).');
  process.exit(1);
}

const LIMIT = Number(process.env.QA_LIMIT ?? 0) || Infinity;
const MIN_CATEGORY = Number(process.env.QA_MIN_CATEGORY ?? 0.85);
const MIN_TONE = Number(process.env.QA_MIN_TONE ?? 0.8);

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(
  readFileSync(join(here, '..', 'qa', 'promptRegression.golden.json'), 'utf8')
).slice(0, LIMIT);

// Must mirror src/lib/ai.ts classifyIntent — the suite tests the real prompt.
function classificationPrompt(query) {
  return `You are a classifier for a California disability services app. Classify this parent's question.

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
}

async function classify(question) {
  const res = await fetch(`${BASE}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${JWT}` },
    body: JSON.stringify({ action: 'classify', query: classificationPrompt(question) }),
  });
  if (!res.ok) throw new Error(`ai-proxy ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? '{}';
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
}

let catPass = 0, tonePass = 0, errors = 0;
const failures = [];

for (const [i, c] of golden.entries()) {
  const expectedSource = c.expectedCategory.replace(/-/g, '_');
  try {
    const out = await classify(c.question);
    const catOk = (out.sources ?? []).includes(expectedSource);
    const toneOk = out.tone === c.expectedTone;
    if (catOk) catPass++;
    if (toneOk) tonePass++;
    if (!catOk || !toneOk) {
      failures.push(
        `${c.id}: ${!catOk ? `category got [${(out.sources ?? []).join(',')}] want ${expectedSource}` : ''}${!catOk && !toneOk ? ' · ' : ''}${!toneOk ? `tone got ${out.tone} want ${c.expectedTone}` : ''}`
      );
    }
    process.stdout.write(`\r${i + 1}/${golden.length}`);
  } catch (err) {
    errors++;
    failures.push(`${c.id}: ERROR ${err.message}`);
  }
}

const n = golden.length;
const catRate = catPass / n;
const toneRate = tonePass / n;
console.log(`\n\nCategory: ${catPass}/${n} (${(catRate * 100).toFixed(1)}%) — gate ${MIN_CATEGORY * 100}%`);
console.log(`Tone:     ${tonePass}/${n} (${(toneRate * 100).toFixed(1)}%) — gate ${MIN_TONE * 100}%`);
if (errors) console.log(`Errors:   ${errors}`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f}`);
}

if (catRate < MIN_CATEGORY || toneRate < MIN_TONE || errors > n * 0.1) {
  console.error('\nPROMPT REGRESSION GATE FAILED');
  process.exit(1);
}
console.log('\nPrompt regression gate passed.');
