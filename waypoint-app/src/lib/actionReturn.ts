/**
 * The way BACK from one action to wherever it was opened from.
 *
 * ── Why a param, and not `goBack()` ────────────────────────────────────────
 * `ActionDetail` lives in the hidden **Tracker** stack, and four surfaces in
 * three other tabs open it: the Navigator's context pill ("Ask about this"),
 * Plan's own action rows, the Action Plan segment, and Home's triage card. A
 * `navigate` resolves to PARENTS, never siblings, so each of them names the
 * tab — and that is precisely why Back cannot find its way home again. From
 * the Tracker stack, `goBack()` means one of two things, neither of them "the
 * screen the parent was looking at":
 *
 *   - pop within the Tracker stack → `TrackerList`, the hidden tab's full
 *     action list, with nothing lit on the tab bar;
 *   - or, with nothing beneath, bubble to the tab navigator, whose default
 *     `backBehavior` ('firstRoute') lands on **Home**.
 *
 * A parent who tapped a pill in the middle of a conversation got neither the
 * conversation nor an explanation. So the caller SAYS where back goes, in a
 * param that travels with the action id, and `ActionDetailRoute` honours it.
 *
 * ── Why it is validated here ───────────────────────────────────────────────
 * A return target is a cross-stack navigate like any other, which means it
 * can be a dead tap — the failure this repo has shipped twice. So the target
 * is checked against the DECLARED graph (`routeGraph.ts`), not against a list
 * anyone copied by hand, and a target that would not land is discarded in
 * favour of the old behaviour rather than silently doing nothing. `ActionDetail`
 * is also deep-linkable (`actions/:actionId`), so `returnTo` can arrive as
 * anything at all; this treats it as untrusted input.
 *
 * Pure — no react-native, no navigation object — so it lives in the `logic`
 * vitest project and the rule can be tested without a navigator.
 */

import { ROUTE_GRAPH, resolvesFrom, type TabName } from '@/navigation/routeGraph';
import type { ActionLocale } from '@/lib/actionMeta';

/** Where Back goes: a tab, and the screen in that tab's stack. */
export interface ActionReturnTo {
  tab: TabName;
  screen: string;
}

/**
 * The tab whose stack registers `ActionDetail`. Every return navigate is made
 * FROM here, which is the argument `resolvesFrom` needs and the thing the
 * first guard in this repo got wrong.
 */
export const ACTION_DETAIL_TAB: TabName = 'Tracker';

/** The arguments for `navigation.navigate(tab, options)`, or null. */
export interface ActionReturnNavigation {
  tab: TabName;
  options: { screen: string; initial?: false };
}

/**
 * Turn a `returnTo` param into a navigate that will actually land, or null
 * when there is none to honour (and the caller should fall back to its own
 * `goBack`).
 *
 * No `params` are ever included. Returning to the Navigator must not re-send
 * `prefill`/`anchor`: that effect fires on the params arriving, so a round
 * trip carrying them would re-prefill the composer the parent had already
 * started editing — the same overwrite the prefill effect was fixed for.
 */
export function actionReturnNavigation(returnTo: unknown): ActionReturnNavigation | null {
  if (!returnTo || typeof returnTo !== 'object') return null;
  const { tab, screen } = returnTo as Partial<ActionReturnTo>;
  if (typeof tab !== 'string' || typeof screen !== 'string') return null;

  const stack = ROUTE_GRAPH[tab as TabName];
  if (!stack) return null;
  // The declared graph decides, from the tab ActionDetail actually lives in.
  if (!resolvesFrom(ACTION_DETAIL_TAB, { screen, tab })) return null;

  return {
    tab: tab as TabName,
    options: {
      screen,
      // `initial: false` keeps the stack's landing screen beneath the target,
      // which is right for a screen pushed INSIDE that stack and wrong for the
      // stack's own landing screen — there it would ask for a state with that
      // screen stacked on itself. The graph already knows which is which.
      ...(screen === stack.initial ? {} : { initial: false as const }),
    },
  };
}

function picker(locale: ActionLocale) {
  return <T,>(en: T, es: T, vi: T): T => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/**
 * The screen a parent gets when the action is gone — dismissed from the plan,
 * or deleted — while the chat or the plan row that points at it is still open.
 *
 * It used to be one bare grey sentence with no control of any kind, on a tab
 * bar with nothing lit: the only ways out were the OS back gesture and force
 * quitting. It states what happened without guessing which of the two it was,
 * says that nothing else moved, and offers the way back.
 */
export function actionUnavailableTitle(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'This action is no longer on your plan.',
    'Esta acción ya no está en su plan.',
    'Việc này không còn trong kế hoạch của quý vị.'
  );
}

export function actionUnavailableBody(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'It was removed, or taken off the plan. Nothing else has changed.',
    'Se eliminó o se quitó del plan. Nada más ha cambiado.',
    'Nó đã được xóa hoặc bỏ khỏi kế hoạch. Không có gì khác thay đổi.'
  );
}

/** The label on the way out of that screen. */
export function actionUnavailableBack(locale: ActionLocale = 'en'): string {
  return picker(locale)('← Back', '← Volver', '← Quay lại');
}
