/**
 * Keeping the action plan honest when the profile changes.
 *
 * When a parent marks "Regional Center: Active" or "Active IEP", the steps
 * telling them to start those processes are done — leaving them open makes
 * the plan feel stale and wrong. These rules find those now-obsolete items
 * so they can be closed with a visible reason (never silently deleted).
 *
 * System-seeded actions are regenerated wholesale by reseedStarterPlan;
 * this catches the ones the parent saved from an AI chat, which nothing
 * else would ever revisit. Manually-created actions are always left alone —
 * those are the parent's own, not ours to close.
 *
 * Pure rules — no react-native imports — so they stay unit-testable.
 */

export interface ReconcileIntake {
  /** children.rc_status */
  rcStatus?: string | null;
  /** children.iep_status */
  iepStatus?: string | null;
  /** families.insurance_carrier */
  insurance?: string | null;
}

export interface ReconcilableAction {
  id: string;
  title: string;
  status: string;
  source: string;
}

export interface ActionClosure {
  id: string;
  title: string;
  /** Shown to the parent and stored in dismissed_reason */
  reason: string;
}

interface ObsolescenceRule {
  applies: (intake: ReconcileIntake) => boolean;
  /** Titles this rule retires */
  matches: RegExp;
  reason: string;
}

/**
 * Deliberately narrow patterns: they only match "go start this process"
 * steps, never the follow-through work that stays relevant after the door
 * is open (e.g. "Prepare for your IEP meeting" survives an active IEP).
 */
export const OBSOLESCENCE_RULES: ObsolescenceRule[] = [
  {
    applies: (i) => i.iepStatus === 'active',
    matches:
      /(request|ask for|start|initiate|submit).{0,40}\b(504 plan|iep evaluation|iep assessment|special education (evaluation|assessment)|assessment plan|speech\/language iep)/i,
    reason: 'Closed automatically — your profile says the IEP is active.',
  },
  {
    applies: (i) => i.rcStatus === 'active',
    matches:
      /((call|contact|apply to|apply for|refer|request).{0,40}\bregional center\b.{0,40}(referral|intake|application|eligibility|services|assessment)?|regional center (referral|intake|application)|early start referral)/i,
    reason: 'Closed automatically — your profile says Regional Center services are active.',
  },
  {
    applies: (i) => i.insurance === 'medicaid' || i.insurance === 'both',
    matches: /apply for medi-?cal/i,
    reason: 'Closed automatically — your profile says you already have Medi-Cal.',
  },
];

/** Only untouched suggestions are auto-closed — never the parent's own items. */
const CLOSEABLE_SOURCES = new Set(['system', 'ai_navigator']);

/**
 * Which open actions the profile has made obsolete.
 * Nothing in progress, completed, or manually created is ever returned.
 */
export function findObsoleteActions(
  actions: ReconcilableAction[],
  intake: ReconcileIntake
): ActionClosure[] {
  const active = OBSOLESCENCE_RULES.filter((r) => r.applies(intake));
  if (active.length === 0) return [];

  const out: ActionClosure[] = [];
  for (const action of actions) {
    if (action.status !== 'not_started') continue;
    if (!CLOSEABLE_SOURCES.has(action.source)) continue;
    const rule = active.find((r) => r.matches.test(action.title));
    if (rule) out.push({ id: action.id, title: action.title, reason: rule.reason });
  }
  return out;
}

/**
 * Apply the closures against Supabase. Best-effort: a failure here never
 * blocks the profile save that triggered it.
 *
 * The supabase import is deferred so this module stays loadable in tests
 * (the client pulls in react-native, whose Flow syntax vitest can't parse).
 */
export async function closeObsoleteActions(
  familyId: string,
  intake: ReconcileIntake
): Promise<ActionClosure[]> {
  if (!familyId) return [];
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase
      .from('actions')
      .select('id, title, status, source')
      .eq('family_id', familyId)
      .eq('status', 'not_started');

    const closures = findObsoleteActions((data ?? []) as ReconcilableAction[], intake);
    if (closures.length === 0) return [];

    const now = new Date().toISOString();
    await Promise.all(
      closures.map((c) =>
        supabase
          .from('actions')
          .update({ status: 'dismissed', dismissed_at: now, dismissed_reason: c.reason })
          .eq('id', c.id)
      )
    );
    return closures;
  } catch {
    return [];
  }
}
