import { describe, it, expect } from 'vitest';
import { findObsoleteActions, type ReconcilableAction } from './actionReconcile';

const act = (over: Partial<ReconcilableAction> & { title: string }): ReconcilableAction => ({
  id: over.title.toLowerCase().replace(/\W+/g, '-'),
  status: 'not_started',
  source: 'system',
  ...over,
});

const PLAN: ReconcilableAction[] = [
  act({ title: 'Request 504 Plan or IEP evaluation' }),
  act({ title: 'Request speech/language IEP evaluation' }),
  act({ title: 'Call Regional Center for Early Start referral' }),
  act({ title: 'Apply for Medi-Cal' }),
  act({ title: 'Start SSI application' }),
  act({ title: 'Prepare for your IEP meeting' }),
  act({ title: 'Request your child’s school records' }),
];

describe('findObsoleteActions', () => {
  it('closes IEP-request steps once the IEP is active', () => {
    const closed = findObsoleteActions(PLAN, { iepStatus: 'active' });
    const titles = closed.map((c) => c.title);
    expect(titles).toContain('Request 504 Plan or IEP evaluation');
    expect(titles).toContain('Request speech/language IEP evaluation');
    expect(closed[0].reason).toMatch(/IEP is active/i);
  });

  it('closes Regional Center intake steps once RC is active', () => {
    const titles = findObsoleteActions(PLAN, { rcStatus: 'active' }).map((c) => c.title);
    expect(titles).toEqual(['Call Regional Center for Early Start referral']);
  });

  it('closes the Medi-Cal application once Medi-Cal is in place', () => {
    expect(findObsoleteActions(PLAN, { insurance: 'medicaid' }).map((c) => c.title)).toEqual([
      'Apply for Medi-Cal',
    ]);
    expect(findObsoleteActions(PLAN, { insurance: 'both' }).map((c) => c.title)).toEqual([
      'Apply for Medi-Cal',
    ]);
  });

  it('leaves the follow-through work alone — an active IEP still needs preparing for', () => {
    const titles = findObsoleteActions(PLAN, { iepStatus: 'active' }).map((c) => c.title);
    expect(titles).not.toContain('Prepare for your IEP meeting');
    expect(titles).not.toContain('Request your child’s school records');
    expect(titles).not.toContain('Start SSI application');
  });

  it('never touches work already underway or finished', () => {
    const started = [
      act({ title: 'Request 504 Plan or IEP evaluation', status: 'in_progress' }),
      act({ title: 'Apply for Medi-Cal', status: 'completed' }),
      act({ title: 'Call Regional Center for Early Start referral', status: 'dismissed' }),
    ];
    expect(
      findObsoleteActions(started, { iepStatus: 'active', rcStatus: 'active', insurance: 'both' })
    ).toHaveLength(0);
  });

  it("never closes the parent's own manually-created items", () => {
    const mine = [act({ title: 'Request 504 Plan or IEP evaluation', source: 'manual' })];
    expect(findObsoleteActions(mine, { iepStatus: 'active' })).toHaveLength(0);
  });

  it('closes AI-suggested items the starter-plan reseed would never revisit', () => {
    const fromChat = [act({ title: 'Request an IEP evaluation in writing', source: 'ai_navigator' })];
    expect(findObsoleteActions(fromChat, { iepStatus: 'active' })).toHaveLength(1);
  });

  it('does nothing while the profile still says these are open questions', () => {
    expect(
      findObsoleteActions(PLAN, { iepStatus: 'no', rcStatus: 'applied', insurance: 'private' })
    ).toHaveLength(0);
    expect(findObsoleteActions(PLAN, {})).toHaveLength(0);
  });
});
