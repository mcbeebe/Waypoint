import { describe, it, expect } from 'vitest';
import { buildActionEmail, buildActionEmailSubject } from './actionEmail';

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
  it('leads with the child, which is what an intake coordinator sorts by', () => {
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

describe('the agency draft', () => {
  const { body } = buildActionEmail(
    RC_ACTION,
    { childFirstName: 'Mateo', parentName: 'Dana Ruiz' },
    'agency'
  );

  it('opens collaboratively — an ask, never a demand', () => {
    // CLAUDE.md escalation-tone rule: the FIRST contact is friendly. Firming
    // up is the Letters ladder's job, after an ask goes unanswered.
    expect(body).toMatch(/writing to ask for your help/i);
    expect(body).not.toMatch(/\bdemand\b|\brequire\b|\bmust\b|\byou failed\b|\bentitled\b/i);
  });

  it('names the child once and signs with the parent', () => {
    expect(body).toContain("I'm Mateo's parent");
    expect(body.trimEnd().endsWith('Dana Ruiz')).toBe(true);
  });

  it('leaves a visible placeholder rather than an unsigned letter', () => {
    const { body: unsigned } = buildActionEmail(RC_ACTION, { childFirstName: 'Mateo' }, 'agency');
    expect(unsigned).toContain('[Your name]');
  });

  it('carries the open steps, offered for correction rather than asserted', () => {
    expect(body).toMatch(/please correct me if I have any of it wrong/i);
    expect(body).toContain('1. Send the assessment request');
    expect(body).toContain('2. Note the date you asked');
    // A step already done is not something to ask the agency about.
    expect(body).not.toContain('Find your service coordinator');
  });

  it('offers the documents the action listed', () => {
    expect(body).toContain('• The current IPP');
  });

  it("keeps the family's own due date a hope, not a deadline on the agency", () => {
    expect(body).toMatch(/If it's possible, having an answer by October 15 would really help/);
    expect(body).not.toMatch(/by October 15\b.*(required|must|deadline)/i);
  });

  it('does NOT paste the phone script — it is written for a call', () => {
    expect(body).not.toContain("I'm calling about");
  });

  it('degrades to a still-sendable note when the action has almost nothing', () => {
    const { body: bare } = buildActionEmail(
      { title: 'Ask about respite hours', category: 'general', priority: 'medium' },
      {},
      'agency'
    );
    expect(bare).toContain('Hello,');
    expect(bare).toContain('Ask about respite hours');
    expect(bare).toMatch(/Could you let me know what the next step is/);
    expect(bare).not.toMatch(/undefined|null|NaN/);
  });

  it('never leaves a triple blank line from an absent section', () => {
    expect(body).not.toMatch(/\n{3}/);
  });
});

describe('the team draft', () => {
  const { body } = buildActionEmail(RC_ACTION, { childFirstName: 'Mateo' }, 'team');

  it('is addressed to a person on your side, not to the agency', () => {
    expect(body).toMatch(/Sharing it so we're both looking at the same thing/);
    expect(body).not.toContain('Hello,');
  });

  it('DOES carry the phone script — a teammate may be the one calling', () => {
    expect(body).toContain("I'm calling about my son Mateo");
  });

  it('reuses the share format, so the two never drift', () => {
    expect(body).toContain('📋 Ask Alta California Regional Center for a speech assessment');
    expect(body).toContain('— Shared from Waypoint · waypointchild.com');
  });
});

describe('buildActionEmail defaults', () => {
  it('defaults to the agency draft', () => {
    expect(buildActionEmail(RC_ACTION, { childFirstName: 'Mateo' }).body).toContain('Hello,');
  });
});
