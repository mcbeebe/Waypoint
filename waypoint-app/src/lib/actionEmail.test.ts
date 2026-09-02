import { describe, it, expect } from 'vitest';
import { buildActionEmail, buildActionEmailSubject } from './actionEmail';
import { generateStarterPlan } from './planGenerator';

const RC_ACTION = {
  title: 'Ask Alta California Regional Center for a speech assessment',
  // The block shape planGenerator actually composes: sections separated by a
  // blank line, bullets prefixed with •.
  description:
    'Your IPP does not list speech therapy yet. Requesting an assessment is the first step.\n\n' +
    '⏰ Timeline: 15 days for the RC to respond\n\n' +
    'Documents to gather:\n' +
    '• The current IPP\n' +
    "• The pediatrician's referral",
  category: 'regional_center',
  priority: 'high',
  status: 'not_started',
  due_date: '2026-10-15',
  script: "Hi, I'm calling about my son Mateo — I'd like to request a speech assessment.",
  steps: [
    { step: 'Find your service coordinator’s email', done: true },
    { step: 'Send the assessment request', done: false },
    { step: 'Note the date you asked', done: false },
  ],
};

describe('buildActionEmailSubject', () => {
  it('leads with the child, which is what a teammate scans for', () => {
    expect(buildActionEmailSubject(RC_ACTION, { childFirstName: 'Mateo' })).toBe(
      'Mateo — Ask Alta California Regional Center for a speech assessment'
    );
  });

  it('falls back to the bare title when no child is known', () => {
    expect(buildActionEmailSubject(RC_ACTION)).toBe(RC_ACTION.title);
  });

  it('clips a runaway title rather than shipping a 400-character subject', () => {
    const subject = buildActionEmailSubject({ ...RC_ACTION, title: 'x'.repeat(400) });
    expect(subject.length).toBeLessThanOrEqual(120);
    expect(subject.endsWith('…')).toBe(true);
  });
});

describe('the team draft', () => {
  const { body } = buildActionEmail(RC_ACTION, { childFirstName: 'Mateo' });

  it('is addressed to a person on your side', () => {
    expect(body).toMatch(/Sharing it so we're both looking at the same thing/);
    expect(body).toContain("here's the next step on Mateo's plan");
  });

  it('reads naturally with no child attached', () => {
    const { body: noChild } = buildActionEmail(RC_ACTION);
    expect(noChild).toContain("here's the next step on our plan");
    expect(noChild).not.toMatch(/undefined|null|NaN/);
  });

  it('carries the phone script — a teammate may be the one calling', () => {
    expect(body).toContain("I'm calling about my son Mateo");
  });

  it('reuses the share format, so Share and Email never drift', () => {
    expect(body).toContain('📋 Ask Alta California Regional Center for a speech assessment');
    expect(body).toContain('— Shared from Waypoint · waypointchild.com');
  });

  it('degrades to something still sendable when the action has almost nothing', () => {
    const { body: bare } = buildActionEmail({
      title: 'Ask about respite hours',
      category: 'general',
      priority: 'medium',
    });
    expect(bare).toContain('Ask about respite hours');
    expect(bare).not.toMatch(/undefined|null|NaN/);
  });
});

/**
 * The regression that removed the agency draft (adversary finding, Sep 2 2026).
 *
 * The first version of this module built a "friendly first ask" to the Regional
 * Center out of these very fields, and its tests passed because they ran on a
 * hand-written fixture. Run the REAL generator through it and the draft cites
 * statute and asserts deadlines — a first contact that breaks CLAUDE.md's
 * escalation rule outright.
 *
 * This test does not check the wording of a generated agency letter. It checks
 * that no such letter exists to be sent: that the module's only output is
 * addressed to the family's own team, whatever the plan content contains.
 */
describe('generated plan content is never dressed up as an ask to an agency', () => {
  const plan = generateStarterPlan({
    diagnoses: ['autism'],
    birthday: new Date(2022, 0, 15),
    rcStatus: 'unknown',
    iepStatus: 'no',
    insurance: 'medicaid',
    childName: 'Mateo',
    parentName: 'Dana Ruiz',
  });

  it('produces plan items that carry statute and deadline language', () => {
    // If this ever stops being true the risk is gone — but it is true today,
    // and it is why the agency draft could not be made safe by editing.
    const all = plan
      .map((a) => [a.title, a.description ?? '', ...(a.steps ?? []).map((s) => s.step)].join('\n'))
      .join('\n');
    expect(all).toMatch(/Lanterman Act|§\s?46\d\d|must\b/i);
  });

  it('drafts every one of them to your team, opening as a share and never as a request', () => {
    for (const action of plan) {
      const { body } = buildActionEmail(action, { childFirstName: 'Mateo' });
      // The one opener this module produces. An agency-addressed greeting or a
      // "writing to ask for your help" opener would mean the risky path is back.
      expect(body.startsWith('Hi — ')).toBe(true);
      expect(body).not.toMatch(/^Hello,/m);
      expect(body).not.toMatch(/writing to ask for your help/i);
      expect(body).not.toMatch(/Could you let me know what the next step is on your side/i);
      // And it is unmistakably internal.
      expect(body).toContain("we're both looking at the same thing");
    }
  });
});
