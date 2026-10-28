/**
 * The way BACK from one action to wherever it was opened from.
 *
 * ── Why a param, and not `goBack()` ────────────────────────────────────────
 * `ActionDetail` lives in the hidden **Tracker** stack, and four surfaces in
 * three other tabs open it: the Navigator's context pill ("Ask about this"),
 * Plan's rows, the Action Plan segment, and Home's triage card. A `navigate`
 * resolves to PARENTS, never siblings, so each of them names the tab — and
 * that is exactly why Back could not find its way home again. Every one of
 * those callers passes `initial: false`, so `TrackerList` sits beneath, so
 * `goBack()` pops to the hidden tab's full action list: not the screen the
 * parent was reading, and a tab bar with nothing lit. (With nothing beneath
 * it instead, `goBack()` bubbles to the tab navigator, whose default
 * `backBehavior` lands on Home. Neither is where the parent was.)
 *
 * So the caller SAYS where back goes, in a param that travels with the action
 * id, and `ActionDetailRoute` honours it.
 *
 * ── Why it is a string, and validated here ─────────────────────────────────
 * `"Tab/Screen"`, not an object: `ActionDetail` is deep-linkable
 * (`actions/:actionId`), and React Navigation serialises every non-path param
 * into the query string with `String(value)` — an object put
 * `?returnTo=[object Object]` in the address bar of the web build and lost the
 * context from any shared link.
 *
 * A return target is a cross-stack navigate like any other, which means it
 * can be a dead tap — the failure this repo has shipped twice, and a dead tap
 * on the way OUT of a screen is a parent stuck on it. So the target is checked
 * against the DECLARED graph (`routeGraph.ts`), not a list anyone copied by
 * hand, and anything that would not land is discarded in favour of the old
 * behaviour. A deep link can carry any string at all, so this is untrusted
 * input.
 *
 * Pure — no react-native, no navigation object — so it lives in the `logic`
 * vitest project and the rule can be tested without a navigator.
 */

import { ROUTE_GRAPH, resolvesFrom, type TabName } from '@/navigation/routeGraph';
import type { ActionLocale } from '@/lib/actionMeta';

/**
 * The tab whose stack registers `ActionDetail`. The invariant is asserted in
 * `actionReturn.test.ts` against the graph, because every sentence in this
 * file rests on it.
 */
export const ACTION_DETAIL_TAB: TabName = 'Tracker';

/** `"Tab/Screen"` — the serialisable form of "where Back goes". */
export function actionReturnTo(tab: TabName, screen: string): string {
  return `${tab}/${screen}`;
}

/**
 * The return targets the app actually uses, named once rather than typed out
 * at four call sites — a `returnTo` with a typo in it compiles, lints, passes
 * the ui suite and silently falls back to the broken `goBack`. Each of these
 * is checked against the route graph by a test.
 */
export const RETURN_TO_CHAT = actionReturnTo('Navigator', 'NavigatorMain');
export const RETURN_TO_PLAN = actionReturnTo('Calendar', 'PlanMain');
export const RETURN_TO_HOME = actionReturnTo('Home', 'HomeMain');
export const RETURN_TO_PROCESS_MAP = actionReturnTo('Home', 'ProcessMap');

/** The arguments for `navigation.navigate(tab, options)`. */
export interface ActionReturnNavigation {
  tab: TabName;
  options: { screen: string; pop: true; initial?: false };
}

/**
 * Turn a `returnTo` param into a navigate that will actually land, or null
 * when there is none to honour (and the caller should fall back to its own
 * `goBack`).
 *
 * No `params` are ever included. Returning to the Navigator must not re-send
 * `prefill`/`anchor`: that effect fires on the params arriving, so a round
 * trip carrying them would re-prefill the composer over a question the parent
 * had already started writing — the overwrite the prefill effect was fixed
 * for in the first place.
 */
export function actionReturnNavigation(returnTo: unknown): ActionReturnNavigation | null {
  if (typeof returnTo !== 'string') return null;
  const slash = returnTo.indexOf('/');
  if (slash <= 0) return null;
  const tab = returnTo.slice(0, slash);
  const screen = returnTo.slice(slash + 1);
  if (!screen) return null;

  const stack = ROUTE_GRAPH[tab as TabName];
  if (!stack) return null;
  // The declared graph decides whether this navigate would land.
  if (!resolvesFrom(tab as TabName, { screen })) return null;

  return {
    tab: tab as TabName,
    options: {
      screen,
      // Come BACK to the screen if that stack already holds one, instead of
      // pushing a second copy of it underneath the parent.
      pop: true,
      // `initial: false` keeps the stack's landing screen beneath the target,
      // which is right for a screen pushed INSIDE that stack and wrong for the
      // stack's own landing screen — there it would ask for a state with that
      // screen stacked on itself. The graph already knows which is which.
      ...(screen === stack.initial ? {} : { initial: false as const }),
    },
  };
}

/**
 * Screen options for `ActionDetail` when it was opened from another tab.
 *
 * The in-screen "← Back" is not the only way off this screen: the native
 * header draws its own chevron, and on iOS the edge-swipe does the same
 * thing. Both of them POP — to `TrackerList`, the hidden tab's action list —
 * so fixing only the button a parent might never use would leave the more
 * discoverable, platform-standard affordance going to the wrong place. When
 * the caller has named a way back, these two are turned off and the screen
 * has exactly one back control, which honours it.
 *
 * A visit from the Tracker list itself (no `returnTo`) keeps both: there the
 * chevron and the swipe pop to the list the parent genuinely came from.
 */
export function actionDetailBackOptions(
  returnTo: unknown
): { headerBackVisible?: false; gestureEnabled?: false } {
  if (!actionReturnNavigation(returnTo)) return {};
  return { headerBackVisible: false, gestureEnabled: false };
}

function picker(locale: ActionLocale) {
  return <T,>(en: T, es: T, vi: T): T => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/**
 * The screen a parent gets when the action is gone — dismissed from the plan,
 * or deleted — while the chat or the plan row that points at it is still open.
 *
 * It used to be one bare grey sentence with no control of its own, on a tab
 * bar with nothing lit: the only way on was the header chevron, into the
 * hidden tab's list. It states what happened without guessing which of the
 * two it was, says that nothing else moved, and offers the way back.
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

/**
 * NOT the same thing, and the difference matters: the action may be perfectly
 * fine and the fetch may simply have failed. Telling a parent on a dropped
 * connection that their action was removed from their plan is a false
 * statement about their plan, from the app that keeps it.
 */
export function actionLoadFailedTitle(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    "This didn't load.",
    'Esto no se cargó.',
    'Không tải được mục này.'
  );
}

export function actionLoadFailedBody(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'Your plan is unchanged — the connection dropped on the way. Try again in a moment.',
    'Su plan no ha cambiado: se perdió la conexión. Inténtelo de nuevo en un momento.',
    'Kế hoạch của quý vị không thay đổi — mất kết nối giữa đường. Vui lòng thử lại sau một chút.'
  );
}

export function actionLoadRetry(locale: ActionLocale = 'en'): string {
  return picker(locale)('Try again', 'Intentar de nuevo', 'Thử lại');
}

/** The label on the way out of either screen. */
export function actionUnavailableBack(locale: ActionLocale = 'en'): string {
  return picker(locale)('← Back', '← Volver', '← Quay lại');
}

/**
 * The same control, said aloud. The arrow is decoration: a screen reader
 * announcing "left arrow Back" is reading punctuation to someone who cannot
 * see it (same reason `actionAnchorA11y` exists in `actionAsk.ts`).
 */
export function actionUnavailableBackA11y(locale: ActionLocale = 'en'): string {
  return picker(locale)('Back', 'Volver', 'Quay lại');
}
