import { describe, it, expect } from 'vitest';
import {
  entityCategory,
  entityPriority,
  entityToAction,
  phaseToActions,
  phaseQuestion,
  phaseChips,
  entityLever,
  entityStanding,
  standingLabel,
  entityExplainer,
  cadenceNote,
  entityGuide,
  entityStepQuestion,
} from './journeyActions';
import { resolvesFrom } from '@/navigation/routeGraph';
import type { JourneyPhase } from '@/data/types';

const PHASE: JourneyPhase = {
  age: '0–3',
  label: 'Early Intervention',
  color: '#7C3AED',
  bg: '#F5F3FF',
  icon: '👶',
  description: 'This is often the hardest moment.',
  entities: [
    { name: 'Pediatrician', action: 'Referral for developmental evaluation', time: 'Immediate' },
    { name: 'Regional Center', action: 'Early Start intake → IFSP development', time: '45 days' },
    { name: 'Insurance', action: 'ABA therapy authorization', time: '30 days' },
  ],
  milestone: 'IFSP in place, therapies started',
  alert: 'RC intake must happen within 45 days of referral',
};

describe('entityCategory', () => {
  it('files each entity under the system it belongs to', () => {
    expect(entityCategory('Regional Center')).toBe('regional_center');
    expect(entityCategory('Early Start')).toBe('regional_center');
    expect(entityCategory('School District')).toBe('iep');
    expect(entityCategory('Insurance')).toBe('insurance');
    expect(entityCategory('Medi-Cal')).toBe('benefits');
    expect(entityCategory('IHSS')).toBe('benefits');
    expect(entityCategory('Pediatrician')).toBe('medical');
    expect(entityCategory('CCS')).toBe('medical');
    expect(entityCategory('Special education attorney')).toBe('legal');
    expect(entityCategory('Something else entirely')).toBe('general');
  });
});

describe('entityPriority', () => {
  it('raises priority for tight timing', () => {
    expect(entityPriority('Immediate')).toBe('urgent');
    expect(entityPriority('This week')).toBe('urgent');
    expect(entityPriority('45 days')).toBe('high');
    expect(entityPriority('30 days')).toBe('high');
  });

  it('keeps standing work low', () => {
    expect(entityPriority('Ongoing')).toBe('low');
    expect(entityPriority('Annual')).toBe('low');
    expect(entityPriority('')).toBe('medium');
  });
});

describe('entityToAction', () => {
  it('names the task and carries the phase as context', () => {
    const draft = entityToAction(PHASE.entities[1], PHASE, 'Teddy');
    expect(draft.title).toBe('Regional Center: Early Start intake → IFSP development');
    expect(draft.category).toBe('regional_center');
    expect(draft.priority).toBe('high');
    expect(draft.description).toContain("Teddy's journey");
    expect(draft.description).toContain('Early Intervention (ages 0–3)');
    expect(draft.description).toContain('Typical timing: 45 days');
    expect(draft.description).toContain('IFSP in place');
    expect(draft.description).toContain('45 days of referral');
  });

  it('works without a child name', () => {
    expect(entityToAction(PHASE.entities[0], PHASE).description).toContain('journey');
  });
});

describe('phaseToActions', () => {
  it('produces one item per entity, correctly categorised', () => {
    const drafts = phaseToActions(PHASE, 'Teddy');
    expect(drafts).toHaveLength(3);
    expect(drafts.map((d) => d.category)).toEqual(['medical', 'regional_center', 'insurance']);
    expect(drafts[0].priority).toBe('urgent');
  });
});

describe('phaseQuestion', () => {
  it('asks about this exact stage, by name and age', () => {
    const q = phaseQuestion(PHASE, 'Autism (ASD)', 'Teddy');
    expect(q).toContain('Teddy');
    expect(q).toContain('Early Intervention');
    expect(q).toContain('ages 0–3');
    expect(q).toContain('Autism (ASD)');
    expect(q).toMatch(/deadlines/);
  });
});

describe('phaseChips — one-tap ask starters, scoped to the stage', () => {
  it('returns short labels whose questions name this exact stage', () => {
    const chips = phaseChips(PHASE, 'Autism (ASD)', 'Teddy');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    for (const c of chips) {
      // Labels stay short enough to fit a chip.
      expect(c.label.length).toBeLessThanOrEqual(28);
      // Each seeded question is scoped — it names the stage and the journey.
      expect(c.ask).toContain('Early Intervention');
      expect(c.ask).toContain('Autism (ASD)');
    }
    // The child-personalized starters carry the name.
    expect(chips.some((c) => c.ask.includes('Teddy'))).toBe(true);
  });

  it('falls back to a generic subject when no child name is set', () => {
    const chips = phaseChips(PHASE, 'Autism (ASD)', null);
    expect(chips.some((c) => c.ask.includes('my child'))).toBe(true);
    expect(chips.every((c) => !c.ask.includes('Teddy'))).toBe(true);
  });
});

describe('entityLever — every journey row has a real destination or an honest null', () => {
  it('RC entities route to the system map; IPP mentions to the meeting letter', () => {
    expect(entityLever({ name: 'Regional Center', action: 'Early Start intake', time: '45 days' }))
      .toEqual({ type: 'screen', screen: 'ProcessMap' });
    expect(entityLever({ name: 'Regional Center', action: 'Annual IPP review and goal updates', time: 'Yearly' }))
      .toEqual({ type: 'letter', template: 'ipp_review_request' });
  });

  it('school rows route to the right letter', () => {
    expect(entityLever({ name: 'School District', action: 'Assessment plan (15 days)', time: '~75 days' }))
      .toEqual({ type: 'letter', template: 'assessment_request' });
    expect(entityLever({ name: 'School District', action: 'Annual IEP reviews', time: 'Yearly' }))
      .toEqual({ type: 'letter', template: 'iep_email' });
  });

  it('insurance/benefits/medical route to their screens', () => {
    expect(entityLever({ name: 'Insurance', action: 'Therapy re-authorizations', time: 'Every 3–12 mo' })?.type).toBe('screen');
    expect(entityLever({ name: 'IHSS', action: 'Annual hour reassessment', time: 'Yearly' }))
      .toEqual({ type: 'screen', screen: 'Agencies' });
    expect(entityLever({ name: 'Pediatrician', action: 'Referral', time: 'Immediate' }))
      .toEqual({ type: 'screen', screen: 'Providers' });
  });

  it('unmappable rows return null, not a wrong guess', () => {
    expect(entityLever({ name: 'Attorney', action: 'Consult on due process', time: 'As needed' })).toBeNull();
  });
});

describe('entityStanding — the journey map agrees with the resource stack', () => {
  const standings = {
    rcStatus: 'active' as const,
    iepStatus: 'active' as const,
    mediCalStatus: 'unknown' as const,
    ihssStatus: 'unknown' as const,
    ssiStatus: 'none' as const,
    mediCalRequested: true,
  };

  it('secured systems read as in place', () => {
    expect(entityStanding('Regional Center', standings)).toBe('in_place');
    expect(entityStanding('School District', standings)).toBe('in_place');
  });

  it('a tracked deeming request upgrades Medi-Cal to in motion', () => {
    expect(entityStanding('Medi-Cal', standings)).toBe('in_motion');
    expect(entityStanding('Medi-Cal', { ...standings, mediCalRequested: false })).toBeNull();
  });

  it('unknown standings stay null — the generic prompt is honest there', () => {
    expect(entityStanding('IHSS', standings)).toBeNull();
    expect(entityStanding('SSI', standings)).toBeNull();
    expect(entityStanding('CalABLE', standings)).toBeNull();
    expect(entityStanding('Pediatrician', standings)).toBeNull();
  });

  it('applied / eval_done read as in motion', () => {
    expect(entityStanding('Regional Center', { ...standings, rcStatus: 'applied' })).toBe('in_motion');
    expect(entityStanding('School District', { ...standings, iepStatus: 'eval_done' })).toBe('in_motion');
    expect(entityStanding('IHSS', { ...standings, ihssStatus: 'applied' })).toBe('in_motion');
    expect(entityStanding('SSI / Medi-Cal', { ...standings, ssiStatus: 'active', mediCalStatus: 'active', mediCalRequested: false })).toBe('in_place');
  });
});

describe('step "learn more" derivations (This Stage depth)', () => {
  it('explains the common entities and returns null for the unknown', () => {
    expect(entityExplainer('School District')).toMatch(/IEP/);
    expect(entityExplainer('Regional Center')).toMatch(/IPP/);
    expect(entityExplainer('IHSS')).toMatch(/hours/i);
    expect(entityExplainer('CalABLE')).toMatch(/save|benefits/i);
    expect(entityExplainer('Some Novel Entity')).toBeNull();
  });

  it('reads cadence in plain language', () => {
    expect(cadenceNote('Yearly')).toMatch(/every year/i);
    expect(cadenceNote('45 days')).toMatch(/clock/i);
    expect(cadenceNote('Any time')).toMatch(/no deadline/i);
    expect(cadenceNote('')).toBe('');
  });

  it('points each category at a guide screen that resolves from Home', () => {
    for (const name of ['School District', 'Regional Center', 'IHSS', 'Insurance']) {
      const g = entityGuide({ name, action: 'x', time: 'Yearly' });
      expect(g, name).not.toBeNull();
      expect(resolvesFrom('Home', { screen: g!.screen })).toBe(true);
    }
    // A general entity has no dedicated guide — the card still offers Ask.
    expect(entityGuide({ name: 'Something else', action: 'x', time: '' })).toBeNull();
  });

  it('seeds a step-specific question naming the entity and the stage', () => {
    const q = entityStepQuestion(PHASE.entities[0], PHASE, 'Autism', 'Teddy');
    expect(q).toContain(PHASE.entities[0].name);
    expect(q).toContain(PHASE.label);
    expect(q).toContain('Teddy');
  });
});

describe('standing chip states a system fact, not step completion (adversary fix)', () => {
  it('names the system state — never "✓ In place" / "done"', () => {
    expect(standingLabel('School District', 'in_place')).toBe('IEP active');
    expect(standingLabel('Regional Center', 'in_place')).toBe('Regional Center active');
    expect(standingLabel('SSA', 'in_place')).toBe('SSI active');
    expect(standingLabel('IHSS', 'in_motion')).toBe('IHSS in progress');
    // Whatever it says, it must not claim the STEP is done.
    for (const s of ['in_place', 'in_motion'] as const) {
      expect(standingLabel('School District', s).toLowerCase()).not.toMatch(/in place|done|complete|✓/);
    }
  });

  it('does not put the IPP explainer on an Early Start (under-3) row', () => {
    expect(entityExplainer('Regional Center — Early Start intake → IFSP')).toMatch(/IFSP/);
    expect(entityExplainer('Regional Center — Early Start intake → IFSP')).not.toMatch(/\bIPP\b/);
  });

  it('does not put the conservatorship explainer on medical "adult" rows', () => {
    expect(entityExplainer('CCS → Adult programs')).toBeNull();
    expect(entityExplainer('Adult Neurology — Transfer from pediatric provider')).toBeNull();
    // A real guardianship row still gets it.
    expect(entityExplainer('Conservatorship or supported decision-making')).toMatch(/decision/i);
  });
});
