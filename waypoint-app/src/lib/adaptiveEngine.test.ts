import { describe, it, expect } from 'vitest';
import {
  FRUSTRATION_DEEP,
  FOLLOWUPS,
  startFrustrationFlow,
  advanceFrustrationFlow,
  generateDeepRCActions,
  generateDeepSchoolActions,
  generateDeepInsuranceActions,
  getFollowUpActions,
  type AdaptiveContext,
} from './adaptiveEngine';

const ctx: AdaptiveContext = {
  childName: 'Mia',
  parentName: 'Jordan',
  regionalCenterName: 'Regional Center of the East Bay',
  diagnoses: ['autism (ASD)'],
};

describe('frustration flow state machine', () => {
  it('walks the RC slow-response path to a timeline-violation escalation', () => {
    const { state, step } = startFrustrationFlow('rc');
    expect(step.question).toMatch(/Regional Center/);

    const s1 = advanceFrustrationFlow(state, 'slow_response', ctx);
    expect(s1.kind).toBe('step');
    if (s1.kind !== 'step') return;
    expect(s1.step).toBe(FRUSTRATION_DEEP.rc_slow_what);

    const s2 = advanceFrustrationFlow(s1.state, 'intake', ctx);
    expect(s2.kind).toBe('step');
    if (s2.kind !== 'step') return;
    expect(s2.step).toBe(FRUSTRATION_DEEP.rc_slow_duration);

    const s3 = advanceFrustrationFlow(s2.state, '3_plus_months', ctx);
    expect(s3.kind).toBe('actions');
    if (s3.kind !== 'actions') return;
    // 3+ months waiting for intake = Lanterman violation → escalate + 4731
    expect(s3.actions).toHaveLength(2);
    expect(s3.actions[0].title).toMatch(/Timeline violation/);
    expect(s3.actions[0].description).toMatch(/W&I §4642/);
    expect(s3.actions[1].title).toMatch(/4731/);
    expect(s3.actions[1].dependsOnKey).toBe('rc_deep_escalate');
    expect(s3.actions[1].script).toContain('Regional Center of the East Bay');
  });

  it('routes "what is reimbursable" to the Reimbursables screen', () => {
    const { state } = startFrustrationFlow('rc');
    const r = advanceFrustrationFlow(state, 'what_covered', ctx);
    expect(r).toEqual({ kind: 'navigate', screen: 'Reimbursables' });
  });

  it('short waits do not claim a violation and skip the 4731 action', () => {
    const acts = generateDeepRCActions(
      'slow_response',
      { issueType: 'slow_response', waitingFor: 'ipp', duration: '1_2_weeks' },
      ctx
    );
    expect(acts).toHaveLength(1);
    expect(acts[0].title).not.toMatch(/violation/i);
  });

  it('school and insurance flows resolve in one step', () => {
    const { state: school } = startFrustrationFlow('school');
    const r = advanceFrustrationFlow(school, 'disagree_eval', ctx);
    expect(r.kind).toBe('actions');
    if (r.kind !== 'actions') return;
    expect(r.actions[0].script).toMatch(/300\.502/);

    const { state: ins } = startFrustrationFlow('insurance');
    const r2 = advanceFrustrationFlow(ins, 'auth_denied', ctx);
    expect(r2.kind).toBe('actions');
    if (r2.kind !== 'actions') return;
    // Autism in context → SB 946 citation in the appeal draft
    expect(r2.actions[0].script).toMatch(/SB 946/);
  });

  it('every issue-type option produces at least one action (or a navigate)', () => {
    for (const target of ['rc', 'school', 'insurance'] as const) {
      const flow = FRUSTRATION_DEEP[`${target}_issue_type`];
      for (const option of flow.options) {
        const { state } = startFrustrationFlow(target);
        let result = advanceFrustrationFlow(state, option.value, ctx);
        // Walk multi-step branches to the end using the first option each time
        while (result.kind === 'step') {
          result = advanceFrustrationFlow(result.state, result.step.options[0].value, ctx);
        }
        if (result.kind === 'actions') {
          expect(result.actions.length, `${target}:${option.value}`).toBeGreaterThan(0);
        } else {
          expect(result.kind).toBe('navigate');
        }
      }
    }
  });
});

describe('completion check-ins', () => {
  it('voicemail after an RC call generates a retry with another check-in', () => {
    const acts = getFollowUpActions('rc_done', 'voicemail', ctx);
    expect(acts).toHaveLength(1);
    expect(acts[0].title).toMatch(/Call RC again/);
    expect(acts[0].follow_up_key).toBe('rc_done');
  });

  it('insurance denial generates an urgent appeal with SB 946 for autism', () => {
    const acts = getFollowUpActions('ins_done', 'denied', ctx);
    expect(acts).toHaveLength(1);
    expect(acts[0].priority).toBe('urgent');
    expect(acts[0].script).toMatch(/SB 946/);
    expect(acts[0].script).toMatch(/F84\.0/);
  });

  it('positive answers generate nothing', () => {
    expect(getFollowUpActions('rc_done', 'scheduled', ctx)).toHaveLength(0);
    expect(getFollowUpActions('ins_done', 'approved', ctx)).toHaveLength(0);
  });

  it('every FOLLOWUPS option is handled without throwing', () => {
    for (const [key, step] of Object.entries(FOLLOWUPS)) {
      for (const option of step.options) {
        expect(() => getFollowUpActions(key, option.value, ctx)).not.toThrow();
      }
    }
  });
});

describe('deep generators fill in family context', () => {
  it('uses child and parent names in drafts', () => {
    const acts = generateDeepSchoolActions('iep_not_implemented', ctx);
    expect(acts[0].script).toContain('Mia');
    expect(acts[0].script).toContain('Jordan');
  });

  it('falls back to placeholders without context', () => {
    const acts = generateDeepInsuranceActions('auth_denied', {});
    expect(acts[0].script).toContain('[Child Name]');
    expect(acts[0].script).not.toMatch(/SB 946/);
  });
});
