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
import type {
  ActionCategory,
  ActionPriority,
  BenefitStatus,
  IepStatus,
  RcStatus,
} from '@/types/database';

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

/**
 * The child's live standing with an entity — so the journey map agrees with
 * the Resource Stack instead of contradicting it (owner feedback, Aug 2026:
 * "the data should flow through"). Null = unknown, keep the generic prompt.
 */
export type EntityStanding = 'in_place' | 'in_motion';

export interface EntityStandings {
  rcStatus?: RcStatus | null;
  iepStatus?: IepStatus | null;
  mediCalStatus?: BenefitStatus | null;
  ihssStatus?: BenefitStatus | null;
  ssiStatus?: BenefitStatus | null;
  /** A deeming request is already sent and tracked (upgrades unknown → in motion). */
  mediCalRequested?: boolean;
}

export function entityStanding(
  entityName: string,
  s: EntityStandings
): EntityStanding | null {
  const n = entityName.toLowerCase();
  const benefit = (b?: BenefitStatus | null, requested?: boolean): EntityStanding | null =>
    b === 'active' ? 'in_place' : b === 'applied' || requested ? 'in_motion' : null;
  if (/medi-?cal/.test(n)) return benefit(s.mediCalStatus, s.mediCalRequested);
  if (/ihss/.test(n)) return benefit(s.ihssStatus);
  if (/ssi|ssa|social security/.test(n)) return benefit(s.ssiStatus);
  if (/regional center|early start/.test(n))
    return s.rcStatus === 'active' ? 'in_place' : s.rcStatus === 'applied' ? 'in_motion' : null;
  if (/school|district|iep\b/.test(n))
    return s.iepStatus === 'active' ? 'in_place' : s.iepStatus === 'eval_done' ? 'in_motion' : null;
  return null;
}

/**
 * A chip label for a standing that names the SYSTEM state as a fact ("IEP
 * active", "Regional Center in progress") rather than "✓ In place" — which,
 * placed on a specific next-step card, wrongly reads as "this step is done"
 * (a false claim on deadline-bearing steps like a transition IEP). A factual
 * system-state label is true regardless of what the step asks the family to do.
 */
export function standingLabel(entityName: string, standing: EntityStanding): string {
  const n = entityName.toLowerCase();
  const sys = /medi-?cal/.test(n)
    ? 'Medi-Cal'
    : /ihss/.test(n)
      ? 'IHSS'
      : /\bssi\b|\bssa\b|social security/.test(n)
        ? 'SSI'
        : /regional center|early start/.test(n)
          ? 'Regional Center'
          : /school|district|iep\b/.test(n)
            ? 'IEP'
            : 'This';
  return standing === 'in_place' ? `${sys} active` : `${sys} in progress`;
}

/**
 * The "learn more" a step card expands to (owner request, Aug 2026). Derived,
 * not hand-authored per map instance: a keyword lookup on the entity name gives
 * a specific plain-language "why this matters", falling back to a category-level
 * line, then to null. So one small table covers every entity across every
 * journey map. English, matching the (currently English-only) journey content.
 */
const ENTITY_EXPLAINERS: { match: RegExp; why: string }[] = [
  { match: /\biep\b|school district|504/, why: 'The IEP is the school’s binding plan for your child. It is reviewed every year and fully reassessed every three years — each review is your opening to update goals and add or protect services.' },
  // Early Start (under-3) is built on an IFSP, not an IPP — match it first so
  // the 0–3 Regional Center row doesn't get the IPP explainer by mistake.
  { match: /early start|ifsp|birth ?to ?three/, why: 'Early Start is Regional Center services for children under three, organized around an IFSP — the Individualized Family Service Plan. Reviews keep it matched to how fast your child is changing at this age.' },
  { match: /\bipp\b|regional center|service coordinator/, why: 'The IPP is your Regional Center service plan. Reviewing it keeps goals current and is how new or increased funding gets written in — services flow from what the IPP lists.' },
  { match: /insurance|health plan|authoriz|re-?auth/, why: 'Insurers re-authorize therapies on a clock. A lapsed authorization can pause services mid-stream, so tracking the renewal date protects the hours your child already has.' },
  { match: /ihss/, why: 'IHSS hours are reassessed every year. Documenting your child’s needs before the review is how you protect the hours you have — and make the case for more.' },
  { match: /calable|able account/, why: 'A CalABLE account lets your child save without losing benefits eligibility. There is no deadline — but opening one early is the first concrete step of long-term financial planning.' },
  { match: /medi-?cal/, why: 'Medi-Cal is the coverage many other supports build on. Keeping it active — and renewing on time — keeps the layers above it in place.' },
  { match: /\bssi\b|social security|\bssa\b/, why: 'SSI is a monthly benefit for eligible children and, at 18, is re-determined against adult criteria. Knowing that timing avoids a gap in income and the Medi-Cal that can come with it.' },
  // Guardianship only — narrowed from a broad /18|adult|transition/, which was
  // catching medical "Adult neurology / CCS → adult programs" rows.
  { match: /conservator|guardianship|supported decision/, why: 'Turning 18 changes who can legally make decisions. Conservatorship — or a lighter alternative like supported decision-making — takes months to arrange, so families start well before the birthday.' },
];

export function entityExplainer(entityName: string): string | null {
  const n = entityName.toLowerCase();
  return ENTITY_EXPLAINERS.find((e) => e.match.test(n))?.why ?? null;
}

/** Plain-language read of the entity's cadence, from its `time` field. */
export function cadenceNote(time: string): string {
  const t = (time ?? '').toLowerCase();
  if (!t.trim()) return '';
  if (/any ?time|as needed/.test(t)) return 'No deadline — do it whenever you’re ready.';
  if (/(\d+)\s*day/.test(t)) return `There’s a clock on this: ${time}. The date you act is what starts it.`;
  if (/3 ?yr|triennial|three year/.test(t)) return `Comes around on a schedule: ${time}.`;
  if (/year|annual/.test(t)) return `This comes back every year (${time}) — worth a standing reminder.`;
  if (/ongoing|every/.test(t)) return `Recurring: ${time}. Track the next date so it doesn’t lapse.`;
  return `Typical timing: ${time}.`;
}

/** The Learn guide most relevant to a step, so "learn more" can go deeper.
 *  Category-based, pointing only at screens that resolve from the Home stack. */
export function entityGuide(entity: JourneyEntity): { screen: string; params?: Record<string, string>; label: string } | null {
  switch (entityCategory(entity.name)) {
    case 'regional_center':
      return { screen: 'ProcessMap', params: { system: 'rc' }, label: 'How the Regional Center works' };
    case 'iep':
      return { screen: 'ProcessMap', params: { system: 'school' }, label: 'How the school system works' };
    case 'benefits':
      return { screen: 'ResourceStack', label: 'Money and benefits, layer by layer' };
    case 'insurance':
      return { screen: 'Insurance', label: 'Your insurance details' };
    default:
      return null;
  }
}

/** A question that seeds the Navigator about ONE step, not the whole stage. */
export function entityStepQuestion(
  entity: JourneyEntity,
  phase: JourneyPhase,
  journeyTitle: string,
  childName?: string | null
): string {
  const who = childName ?? 'my child';
  return (
    `For ${who}, in the "${phase.label}" stage of the ${journeyTitle} journey: ` +
    `the step is "${entity.name} — ${entity.action}"${entity.time ? ` (${entity.time})` : ''}. ` +
    `What exactly should I do, what’s the deadline, and what do families commonly miss on this one?`
  );
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
