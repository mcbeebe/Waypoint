/**
 * What a parent is told when the step they just tapped is gated behind
 * another one that is not finished yet.
 *
 * Two screens say it — the tracker's card control and swipe buttons
 * (`ActionsScreen`), and the detail screen's status control
 * (`ActionDetailRoute`) — and both said it in English only, in an app whose
 * action copy is otherwise trilingual. It is also the only feedback either
 * tap gives: the status does not move, so a parent who cannot read the toast
 * is left with a control that appears not to work.
 *
 * ── Tone ───────────────────────────────────────────────────────────────────
 * The sentence states the ORDER, never a failure. "Complete X first" is said
 * of the plan, not of the parent, and the second clause gives the reason —
 * the step builds on the other one — so the lock reads as how the process
 * works rather than as a refusal. Same rule as `homeTriage`: state the
 * status, not an actor who fell short.
 *
 * Pure — the dependency title is passed in — so it lives in the `logic`
 * vitest project.
 */

import type { ActionLocale } from '@/lib/actionMeta';

function picker(locale: ActionLocale) {
  return <T,>(en: T, es: T, vi: T): T => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/**
 * The lock, with the step it waits on named.
 *
 * The title is a parent's own words (or the Navigator's) and is quoted rather
 * than run into the sentence, so a title that is itself a sentence cannot be
 * misread as part of this one.
 */
export function actionLockedBy(dependencyTitle: string, locale: ActionLocale = 'en'): string {
  return picker(locale)(
    `Complete "${dependencyTitle}" first — this step builds on it.`,
    `Primero complete "${dependencyTitle}": este paso se basa en ese.`,
    `Hãy hoàn thành "${dependencyTitle}" trước — bước này dựa vào việc đó.`
  );
}

/**
 * The same lock when the step it waits on is not in the loaded list — the row
 * was deleted after this one was created, or a filtered fetch left it out.
 * There is nothing truthful to name, so the sentence says only that the order
 * exists.
 */
export function actionLockedByUnknown(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'This step unlocks after its previous step.',
    'Este paso se desbloquea después del paso anterior.',
    'Bước này sẽ mở sau khi hoàn thành bước trước.'
  );
}

/** One step's dependency, as either screen can see it. */
export interface ActionDependencyState {
  /** `action.depends_on` — the id of the step this one builds on, if any. */
  dependsOn: string | null;
  /** That step's title, when the loaded list holds the row. */
  dependencyTitle?: string;
  /** Whether that step is done. A row that is not loaded is NOT done. */
  dependencyCompleted: boolean;
}

/**
 * The lock for one step, or null when it is free to move — predicate and
 * sentence together, so the two screens cannot disagree about either.
 *
 * They did. `ActionsScreen` locked on `!completedIds.has(depends_on)`, which
 * treats a dependency whose row is not loaded as unfinished; the detail
 * screen's guard required the row to be FOUND, so a step whose dependency had
 * been deleted was drawn with a padlock in the tracker and could be marked
 * Done from the detail screen one tap later. Not loaded is not finished: the
 * app cannot see that the step was done, and telling a parent it was would be
 * a claim about their plan that nothing supports.
 */
export function actionLockMessage(
  state: ActionDependencyState,
  locale: ActionLocale = 'en'
): string | null {
  if (!state.dependsOn) return null;
  if (state.dependencyCompleted) return null;
  return state.dependencyTitle
    ? actionLockedBy(state.dependencyTitle, locale)
    : actionLockedByUnknown(locale);
}
