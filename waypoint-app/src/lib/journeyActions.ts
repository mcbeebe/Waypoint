/**
 * Turning a journey phase into things a parent can actually do.
 *
 * Each phase lists the entities to work with ("Regional Center — Early
 * Start intake → IFSP development — 45 days"). This maps those to action
 * plan items and to a question the Navigator can answer in context.
 *
 * Pure module — no react-native imports — so it stays unit-testable.
 */

import type { JourneyEntity, JourneyPhase } from '@/data/types';
import type { ActionCategory, ActionPriority } from '@/types/database';

/** Which part of the system an entity belongs to. */
export function entityCategory(entityName: string): ActionCategory {
  const n = entityName.toLowerCase();
  if (/regional center|early start|service coordinator|ipp|dds/.test(n)) return 'regional_center';
  if (/school|iep|district|504|sped|teacher|dor|department of rehab/.test(n)) return 'iep';
  if (/insurance|aba|health plan|hmo|ppo/.test(n)) return 'insurance';
  if (/medi-?cal|ssi|ihss|benefits|social security|calable|able account|conservator/.test(n))
    return 'benefits';
  if (/pediatrician|doctor|ccs|medical|therapy|therapist|clinic|hospital|dentist/.test(n))
    return 'medical';
  if (/attorney|legal|rights|advocate|due process/.test(n)) return 'legal';
  return 'general';
}

/** A tight deadline in the entity's `time` field earns a higher priority. */
export function entityPriority(time: string): ActionPriority {
  const t = time.toLowerCase();
  if (/immediate|now|urgent|asap|this week/.test(t)) return 'urgent';
  const days = t.match(/(\d+)\s*day/);
  if (days && Number(days[1]) <= 45) return 'high';
  if (/ongoing|annual|yearly|as needed/.test(t)) return 'low';
  return 'medium';
}

export interface JourneyActionDraft {
  title: string;
  description: string;
  category: ActionCategory;
  priority: ActionPriority;
}

/** One plan item from one entity, carrying the phase as context. */
export function entityToAction(
  entity: JourneyEntity,
  phase: JourneyPhase,
  childName?: string | null
): JourneyActionDraft {
  const who = childName ? `${childName}'s` : 'your child’s';
  return {
    title: `${entity.name}: ${entity.action}`,
    description: [
      `From ${who} journey — ${phase.label} (ages ${phase.age}).`,
      entity.time ? `Typical timing: ${entity.time}.` : '',
      '',
      phase.milestone ? `Milestone for this stage: ${phase.milestone}` : '',
      phase.alert ? `Watch out: ${phase.alert}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    category: entityCategory(entity.name),
    priority: entityPriority(entity.time ?? ''),
  };
}

/** Every entity in a phase, as plan items. */
export function phaseToActions(
  phase: JourneyPhase,
  childName?: string | null
): JourneyActionDraft[] {
  return phase.entities.map((e) => entityToAction(e, phase, childName));
}

/**
 * The direct lever behind a journey entity row — the letter or screen one
 * tap away, so the map is operable in place instead of read-only. Null
 * means "no single lever": the caller falls back to the phase's
 * next-steps screen (which adds items to the plan).
 */
export type EntityLever =
  | { type: 'letter'; template: string }
  | { type: 'screen'; screen: string };

export function entityLever(entity: JourneyEntity): EntityLever | null {
  const text = `${entity.name} ${entity.action}`.toLowerCase();
  const category = entityCategory(entity.name);

  if (category === 'regional_center') {
    if (/ipp/.test(text)) return { type: 'letter', template: 'ipp_review_request' };
    // Intake, Early Start, eligibility — the system map is the lever
    return { type: 'screen', screen: 'ProcessMap' };
  }
  if (category === 'iep') {
    if (/assessment|eval|504/.test(text)) return { type: 'letter', template: 'assessment_request' };
    return { type: 'letter', template: 'iep_email' };
  }
  if (category === 'insurance') return { type: 'screen', screen: 'Insurance' };
  if (category === 'benefits') return { type: 'screen', screen: 'Agencies' };
  if (category === 'medical') return { type: 'screen', screen: 'Providers' };
  return null;
}

/** A question that gets the Navigator answering about this exact stage. */
export function phaseQuestion(
  phase: JourneyPhase,
  journeyTitle: string,
  childName?: string | null
): string {
  const who = childName ?? 'my child';
  return (
    `${who} is in the "${phase.label}" stage (ages ${phase.age}) of the ${journeyTitle} journey. ` +
    `What should I be doing right now, what deadlines apply, and what do families commonly miss at this stage?`
  );
}
