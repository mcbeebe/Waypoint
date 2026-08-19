/**
 * AI eval harness — offline golden cases (roadmap 7.4).
 *
 * The parts of the AI pipeline that run client-side are deterministic:
 * trailer parsing, plan generation, and gap detection. These goldens pin
 * their behavior on realistic fixtures so a prompt or parser change that
 * breaks the contract fails CI instead of production.
 *
 * The live half (does the deployed model still emit the contract?) is
 * scripts/eval-navigator.mjs — run by hand against production.
 */

import { describe, it, expect } from 'vitest';
import { parseTrailers, hideStreamingTrailer, hasRichMeta } from './followups';
import { generateStarterPlan } from './planGenerator';
import { detectGaps } from './gapRules';

// ─── Trailer contract: realistic full model outputs ─────────────────────────

const FULL_RESPONSE = [
  "That's a really common situation, and you have more leverage than the school is letting on.",
  '',
  'Under IDEA, once you submit a written request for evaluation, the district has 15 days to respond with an assessment plan.',
  '[[META: iep | high]]',
  '[[QUICKREPLIES: Yes, draft the letter | What if they refuse? | Not yet]]',
  '[[STEPS: [{"action":"Send the evaluation request in writing","who":"You","timeline":"This week","script":"I am requesting a comprehensive special education evaluation for my child under IDEA."},{"action":"Keep a copy for your records","who":"You","timeline":"Same day"}]]]',
  '[[CONTEXT: A verbal request does not start the legal clock — only a written one does.]]',
  '[[RIGHTS: The district must respond to a written evaluation request within 15 days with an assessment plan.]]',
  '[[WATCHOUT: Schools sometimes offer an SST meeting instead — that is a delay tactic, not an evaluation.]]',
  '[[RESOURCES: [{"name":"Disability Rights California","url":"https://www.disabilityrightsca.org","phone":"1-800-776-5746","how":"Free advocacy help with special education disputes"}]]]',
  '[[DRAFT: assessment_request | Want me to draft the evaluation request letter?]]',
  '[[FOLLOWUPS: How long does the whole process take? | What should the letter include? | What if they say no?]]',
].join('\n');

describe('eval: trailer contract on a realistic full response', () => {
  const { content, meta } = parseTrailers(FULL_RESPONSE);

  it('strips every trailer from the stored content', () => {
    expect(content).not.toMatch(/\[\[/);
    expect(content).toContain('15 days to respond');
  });

  it('parses all nine trailer types', () => {
    expect(meta.category).toBe('iep');
    expect(meta.urgency).toBe('high');
    expect(meta.quickReplies).toHaveLength(3);
    expect(meta.steps).toHaveLength(2);
    expect(meta.steps[0].script).toContain('comprehensive special education evaluation');
    expect(meta.context).toContain('legal clock');
    expect(meta.rights).toContain('15 days');
    expect(meta.watchOut).toContain('SST');
    expect(meta.resources[0].phone).toBe('1-800-776-5746');
    expect(meta.draftKey).toBe('assessment_request');
    expect(meta.followUps).toHaveLength(3);
    expect(hasRichMeta(meta)).toBe(true);
  });

  it('handles JSON values containing "]" without truncating', () => {
    const tricky = 'Answer.\n[[STEPS: [{"action":"File form [SSA-3375-BK] today"}]]]';
    const parsed = parseTrailers(tricky);
    expect(parsed.meta.steps[0].action).toBe('File form [SSA-3375-BK] today');
  });

  it('a prose-only response parses to empty meta and is untouched', () => {
    const prose = 'Just a warm sentence with no structure at all.';
    const parsed = parseTrailers(prose);
    expect(parsed.content).toBe(prose);
    expect(hasRichMeta(parsed.meta)).toBe(false);
  });
});

describe('eval: streaming never flashes trailer text', () => {
  const checkpoints = [
    FULL_RESPONSE.slice(0, FULL_RESPONSE.indexOf('[[META') + 1),      // lone "["
    FULL_RESPONSE.slice(0, FULL_RESPONSE.indexOf('[[META') + 5),      // "[[MET"
    FULL_RESPONSE.slice(0, FULL_RESPONSE.indexOf('[[STEPS') + 30),    // mid-JSON
    FULL_RESPONSE,                                                     // complete
  ];

  it.each(checkpoints.map((c, i) => [i, c] as const))(
    'checkpoint %i shows no trailer fragments',
    (_i, partial) => {
      const visible = hideStreamingTrailer(partial);
      expect(visible).not.toMatch(/\[\[[A-Z]/);
      expect(visible).toContain('common situation');
    }
  );
});

// ─── Starter plan goldens ───────────────────────────────────────────────────

describe('eval: starter plan goldens', () => {
  const age = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return d;
  };

  it('autism, age 2, private insurance → Early Start + insurance + Medi-Cal path', () => {
    const titles = generateStarterPlan({
      diagnoses: ['autism'],
      birthday: age(2),
      rcStatus: 'unknown',
      iepStatus: 'no',
      insurance: 'private',
      childName: 'Leo',
      parentName: 'Sam',
    }).map((a) => a.title);

    expect(titles.some((t) => /early start/i.test(t))).toBe(true);
    expect(titles.some((t) => /insurance/i.test(t))).toBe(true);
    expect(titles.some((t) => /medi-cal/i.test(t))).toBe(true);
  });

  it('ADHD, age 8, no IEP → 504/IEP evaluation is in the plan', () => {
    const titles = generateStarterPlan({
      diagnoses: ['adhd'],
      birthday: age(8),
      rcStatus: 'unknown',
      iepStatus: 'no',
      insurance: 'private',
      childName: 'Mia',
      parentName: 'Sam',
    }).map((a) => a.title);

    expect(titles.some((t) => /504|iep/i.test(t))).toBe(true);
  });

  it('PDA is treated as autism-spectrum for plan content', () => {
    const pda = generateStarterPlan({
      diagnoses: ['pda'],
      birthday: age(4),
      rcStatus: 'unknown',
      iepStatus: 'no',
      insurance: 'private',
      childName: 'Ada',
      parentName: 'Sam',
    });
    const blob = pda.map((a) => `${a.title} ${a.description} ${a.script ?? ''}`).join(' ');
    expect(blob).toMatch(/ABA|SB 946/i);
  });

  it('active RC + active IEP produces a smaller plan than a cold start', () => {
    const cold = generateStarterPlan({
      diagnoses: ['autism'], birthday: age(4), rcStatus: 'unknown',
      iepStatus: 'no', insurance: 'none', childName: 'A', parentName: 'B',
    });
    const warm = generateStarterPlan({
      diagnoses: ['autism'], birthday: age(4), rcStatus: 'active',
      iepStatus: 'active', insurance: 'medicaid', childName: 'A', parentName: 'B',
    });
    expect(warm.length).toBeLessThan(cold.length);
    expect(cold.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Gap-rule goldens ───────────────────────────────────────────────────────

describe('eval: gap detection goldens', () => {
  it('autism + private insurance surfaces SB 946', () => {
    const gaps = detectGaps({
      childAgeYears: 5,
      diagnoses: ['autism'],
      rcStatus: 'active',
      iepStatus: 'active',
      insurance: 'private',
      memoryGaps: [],
    });
    expect(gaps.some((g) => /sb ?946/i.test(`${g.title} ${g.body}`))).toBe(true);
  });

  it('age 2.8 triggers the age-3 Regional Center → school transition warning', () => {
    const gaps = detectGaps({
      childAgeYears: 2.8,
      diagnoses: ['delay'],
      rcStatus: 'active',
      iepStatus: 'no',
      insurance: 'medicaid',
      memoryGaps: [],
    });
    expect(gaps.some((g) => /age 3|turns 3|transition/i.test(`${g.title} ${g.body}`))).toBe(true);
  });

  it('a fully-covered Medi-Cal family gets no false alarms from the profile rules', () => {
    const gaps = detectGaps({
      childAgeYears: 8,
      diagnoses: ['autism'],
      rcStatus: 'active',
      iepStatus: 'active',
      insurance: 'medicaid',
      memoryGaps: [],
    });
    // IHSS may legitimately surface for Medi-Cal families; nothing else should
    const unexpected = gaps.filter((g) => !/ihss/i.test(`${g.title} ${g.body}`));
    expect(unexpected).toHaveLength(0);
  });
});
