import { describe, it, expect } from 'vitest';
import {
  entityCategory,
  entityPriority,
  entityToAction,
  phaseToActions,
  phaseQuestion,
} from './journeyActions';
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
