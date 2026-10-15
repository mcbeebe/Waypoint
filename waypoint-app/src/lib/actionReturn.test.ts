/**
 * The way back from one action (`Roadmap/Action-Ask-Plan.md`, open item 3).
 *
 * Every assertion about where a navigate lands is read off `routeGraph.ts`,
 * never off a list of route names typed into this file. That is not style:
 * the first guard against dead taps in this repo WAS such a list, and it
 * certified nine of them, because a hand-copied list encodes what its author
 * believed. A return target is a cross-stack navigate like any other, so it
 * can be a dead tap too — and a dead tap on the way OUT of a screen is a
 * parent stuck on it.
 */

import { describe, it, expect } from 'vitest';
import {
  actionReturnNavigation,
  actionDetailBackOptions,
  actionUnavailableTitle,
  actionUnavailableBody,
  actionUnavailableBack,
  actionUnavailableBackA11y,
  actionLoadFailedTitle,
  actionLoadFailedBody,
  actionLoadRetry,
  ACTION_DETAIL_TAB,
  RETURN_TO_CHAT,
  RETURN_TO_PLAN,
  RETURN_TO_HOME,
  RETURN_TO_PROCESS_MAP,
} from './actionReturn';
import { ROUTE_GRAPH } from '@/navigation/routeGraph';
import type { ActionLocale } from '@/lib/actionMeta';

describe('the one fact everything here rests on', () => {
  it('ActionDetail really does live in the Tracker stack', () => {
    // Every sentence in actionReturn.ts — and the whole reason a return
    // target is needed at all — assumes this. Move the screen and this fails
    // here, rather than silently turning Back into a dead tap in production.
    expect(ROUTE_GRAPH[ACTION_DETAIL_TAB].screens).toContain('ActionDetail');
    // And that it is a tab with no button, which is why landing on its own
    // list strands a parent: nothing on the bar is lit.
    expect(ROUTE_GRAPH[ACTION_DETAIL_TAB].visible).toBe(false);
  });
});

describe('the return targets the app ships', () => {
  /**
   * The real value from each of the four call sites, checked against the
   * graph. A `returnTo` with a typo in it compiles, lints, and falls back to
   * the broken `goBack` in silence — so these constants, not literals at the
   * call sites, are what the app uses, and this is what catches the typo.
   */
  const SHIPPED: Array<[string, string, string]> = [
    ['the chat the pill came from', RETURN_TO_CHAT, 'Navigator'],
    ['Plan, from its rows and its Action Plan segment', RETURN_TO_PLAN, 'Calendar'],
    ["Home's triage card", RETURN_TO_HOME, 'Home'],
    ['the process map', RETURN_TO_PROCESS_MAP, 'Home'],
  ];

  for (const [what, value, tab] of SHIPPED) {
    it(`lands on ${what}`, () => {
      const back = actionReturnNavigation(value);
      expect(back, `${value} would not land`).not.toBeNull();
      expect(back!.tab).toBe(tab);
      // The screen is registered in that tab's stack — the graph's word, not
      // this file's.
      expect(ROUTE_GRAPH[back!.tab].screens).toContain(back!.options.screen);
    });
  }

  it('serialises into a URL without becoming garbage', () => {
    // This route is deep-linkable (`actions/:actionId`), and React Navigation
    // puts every non-path param in the query string with String(value). An
    // object produced `?returnTo=[object Object]`, which both uglified the
    // address bar on web and lost the context from any shared link.
    for (const [, value] of SHIPPED) {
      expect(String(value)).toBe(value);
      expect(encodeURIComponent(value)).not.toContain('%5Bobject');
    }
  });
});

describe('where Back goes', () => {
  it('comes back to the screen instead of pushing a second copy of it', () => {
    // Without `pop`, a navigate only reuses a route that is the stack's
    // CURRENT one — otherwise it pushes. Returning to PlanMain while the
    // Calendar stack sat on CalendarMain would then stack a second PlanMain
    // under the parent, and their next Back would land on the first one.
    expect(actionReturnNavigation(RETURN_TO_PLAN)!.options.pop).toBe(true);
  });

  it('carries NO params — a round trip must not re-seed the composer', () => {
    // `prefill`/`anchor` fire an effect on arrival. Handing them back would
    // overwrite the question the parent had already started typing, which is
    // the exact defect the prefill effect was fixed for in the first build.
    expect(Object.keys(actionReturnNavigation(RETURN_TO_CHAT)!.options).sort()).toEqual([
      'pop',
      'screen',
    ]);
  });

  it("keeps a stack's landing screen beneath a pushed one, and not beneath itself", () => {
    // ProcessMap is pushed inside the Home stack: HomeMain belongs underneath.
    expect(actionReturnNavigation(RETURN_TO_PROCESS_MAP)!.options.initial).toBe(false);
    expect(ROUTE_GRAPH.Home.initial).not.toBe('ProcessMap');
    // NavigatorMain IS its stack's landing screen; asking for it on top of
    // itself asks the navigator for a state with one screen stacked twice.
    expect(actionReturnNavigation(RETURN_TO_CHAT)!.options.initial).toBeUndefined();
    expect(ROUTE_GRAPH.Navigator.initial).toBe('NavigatorMain');
  });

  it('refuses a target that would not land, rather than tapping into nothing', () => {
    // A real screen, in the wrong stack: the Navigator stack does not
    // register ActionDetail. This is the shape that has shipped a dead tap
    // twice in this repo.
    expect(ROUTE_GRAPH.Navigator.screens).not.toContain('ActionDetail');
    expect(actionReturnNavigation('Navigator/ActionDetail')).toBeNull();
    // A tab that does not exist, and a screen no stack registers.
    expect(actionReturnNavigation('Trackr/TrackerList')).toBeNull();
    expect(actionReturnNavigation('Home/HomeMainn')).toBeNull();
  });

  it('refuses anything that is not a target at all', () => {
    // A deep link can put any string in this param, so it is untrusted
    // input: whatever arrives, the caller falls back to its own goBack
    // instead of throwing on the way out of a screen.
    const junk = [
      undefined,
      null,
      '',
      'Navigator',
      'Navigator/',
      '/NavigatorMain',
      42,
      [],
      {},
      { tab: 'Navigator', screen: 'NavigatorMain' },
      '[object Object]',
    ];
    for (const value of junk) {
      expect(actionReturnNavigation(value as unknown), String(value)).toBeNull();
    }
  });
});

describe('the screen chrome, when another tab opened the action', () => {
  it('leaves exactly one back control — the one that honours returnTo', () => {
    // The native header draws its own chevron and iOS adds an edge-swipe, and
    // BOTH pop: to the hidden Tracker tab's action list. Fixing only the
    // in-body button would leave the more discoverable, platform-standard
    // affordance going to the wrong place.
    expect(actionDetailBackOptions(RETURN_TO_CHAT)).toEqual({
      headerBackVisible: false,
      gestureEnabled: false,
    });
  });

  it('keeps both when the parent came from the Tracker list itself', () => {
    // There, popping is exactly right — and a screen whose only back control
    // is in the body is worse than one with the platform's.
    expect(actionDetailBackOptions(undefined)).toEqual({});
    // A target that would not land is no target: the screen falls back to
    // goBack, so it must keep the controls that do that.
    expect(actionDetailBackOptions('Navigator/ActionDetail')).toEqual({});
  });
});

describe('the two states that are not the action', () => {
  const LOCALES: ActionLocale[] = ['en', 'es', 'vi'];
  const ALL = [
    actionUnavailableTitle,
    actionUnavailableBody,
    actionLoadFailedTitle,
    actionLoadFailedBody,
    actionLoadRetry,
    actionUnavailableBack,
    actionUnavailableBackA11y,
  ];

  it('are said in all three languages', () => {
    for (const copy of ALL) {
      const said = LOCALES.map((l) => copy(l));
      for (const s of said) expect(s.length).toBeGreaterThan(0);
      // Actually translated, not the English string three times — a parent
      // who tapped a Vietnamese pill should not land on an English dead end.
      expect(new Set(said).size, copy.name).toBe(3);
    }
  });

  it('never tell a parent their action was removed when the fetch simply failed', () => {
    // `useActions` reports both states the same way — an empty list — and the
    // difference is the whole point: one is a fact about their plan, the
    // other is a fact about the network.
    for (const locale of LOCALES) {
      expect(actionLoadFailedTitle(locale)).not.toBe(actionUnavailableTitle(locale));
      expect(actionLoadFailedBody(locale)).not.toBe(actionUnavailableBody(locale));
    }
    // And it says the plan is untouched, in so many words.
    expect(actionLoadFailedBody('en')).toMatch(/unchanged/i);
    expect(actionLoadFailedBody('es')).toMatch(/no ha cambiado/i);
    expect(actionLoadFailedBody('vi')).toMatch(/không thay đổi/i);
  });

  it('blame nobody — not the agency, and not the parent — in any language', () => {
    // Same rule as the seeded sentence (`actionAsk.test.ts`): state the
    // status, never an actor who failed. A parent reaching the gone screen
    // may well have dismissed the action themselves, and does not need
    // telling. One regex per language, because an English-only guard cannot
    // see a Spanish accusation.
    const banned: Record<ActionLocale, RegExp> = {
      en: /you (deleted|removed|dismissed)|your (mistake|fault)|they (deleted|removed)|no longer available/i,
      es: /usted (lo |la )?(eliminó|quitó|borró)|su (error|culpa)|ellos (eliminaron|quitaron)/i,
      vi: /quý vị đã (xóa|bỏ)|lỗi của quý vị|họ đã (xóa|bỏ)/i,
    };
    for (const locale of LOCALES) {
      const said = `${actionUnavailableTitle(locale)} ${actionUnavailableBody(locale)} ${actionLoadFailedTitle(locale)} ${actionLoadFailedBody(locale)}`;
      expect(said, locale).not.toMatch(banned[locale]);
    }
  });

  it('says the back control aloud without reading the arrow out', () => {
    for (const locale of LOCALES) {
      expect(actionUnavailableBack(locale)).toContain('←');
      // A screen reader announcing "left arrow Back" is reading punctuation
      // to someone who cannot see it.
      expect(actionUnavailableBackA11y(locale)).not.toContain('←');
    }
  });
});
