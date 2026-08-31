/**
 * Plan membership (owner, Aug 31 2026) — "is this step already on the plan?"
 *
 * The journey "＋" adds a step by a deterministic title (`entityToAction` →
 * `"{entity}: {action}"`). It used to track "added" in local component state,
 * which reset on remount — so the ＋ reverted and re-added a duplicate. This is
 * the pure reconciliation: the set of titles currently ON the plan, derived
 * from the real actions list, so the UI can show "on your plan" and skip a
 * re-add across mounts. A dismissed action does NOT count as on-plan (a step
 * set aside can be added again).
 *
 * Pure — no react-native, no supabase — so the invariant is unit-testable.
 */
import type { Action, ActionStatus } from '@/types/database';

/**
 * Statuses that count as an OPEN plan item — the same set `createAction`'s
 * dedup matches. A completed step is history, not an open item, so it doesn't
 * block re-adding a recurring task next cycle; a dismissed one never counts.
 */
const ON_PLAN: ReadonlySet<ActionStatus> = new Set<ActionStatus>(['not_started', 'in_progress']);

/** Titles of the family's actions that are currently open on the plan. */
export function onPlanTitles(actions: Pick<Action, 'title' | 'status'>[]): Set<string> {
  const titles = new Set<string>();
  for (const a of actions) {
    if (ON_PLAN.has(a.status)) titles.add(a.title);
  }
  return titles;
}
