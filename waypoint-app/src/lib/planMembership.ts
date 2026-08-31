/**
 * Plan membership (owner, Aug 31 2026) — "is this journey step already on the
 * plan for THIS child?"
 *
 * The journey "＋" adds a step by a deterministic, child-INDEPENDENT title
 * (`entityToAction` → `"{entity}: {action}"`, same for two siblings). It used
 * to track "added" in local component state, which reset on remount — so the ＋
 * reverted and re-added a duplicate.
 *
 * This is the pure reconciliation the journey uses, and it MUST match the key
 * `createAction`'s dedup uses so the UI and the insert agree: an OPEN action,
 * `source: 'system'`, scoped to the same child. Otherwise a sibling's identical
 * title (or a manual/AI action of the same name) would mask the ＋ for a child
 * who doesn't actually have the step. A completed or dismissed action does not
 * count as on-plan (a recurring step can come back).
 *
 * Pure — no react-native, no supabase — so the invariant is unit-testable.
 */
import type { Action, ActionStatus } from '@/types/database';

/** Statuses that count as an OPEN plan item — the same set the dedup matches. */
const OPEN: ReadonlySet<ActionStatus> = new Set<ActionStatus>(['not_started', 'in_progress']);

type MembershipAction = Pick<Action, 'title' | 'status' | 'source' | 'child_id'>;

/** Do two child ids refer to the same scope? (null === null, the family scope.) */
function sameChild(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? null) === (b ?? null);
}

/**
 * Titles of the family's `system` actions that are OPEN for `childId` — the set
 * the journey uses to show "on your plan" and skip a re-add. Scoped to child +
 * source so it agrees with `createAction`'s dedup exactly.
 */
export function onPlanTitles(actions: MembershipAction[], childId: string | null | undefined): Set<string> {
  const titles = new Set<string>();
  for (const a of actions) {
    if (a.source === 'system' && OPEN.has(a.status) && sameChild(a.child_id, childId)) {
      titles.add(a.title);
    }
  }
  return titles;
}
