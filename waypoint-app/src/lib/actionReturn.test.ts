/**
 * The way back from one action (`Roadmap/Action-Ask-Plan.md`, open item 3).
 *
 * Every assertion here is read off `routeGraph.ts`, never off a list of route
 * names typed into this file. That is not style: the first guard against dead
 * taps in this repo WAS such a list, and it certified nine of them, because a
 * hand-copied list encodes what its author believed. A return target is a
 * cross-stack navigate like any other, so it can be a dead tap too — and a
 * dead tap on the way OUT of a screen is a parent stuck on it.
 */

import { describe, it, expect } from 'vitest';
import {
  actionReturnNavigation,
  actionUnavailableTitle,
  actionUnavailableBody,
  actionUnavailableBack,
  ACTION_DETAIL_TAB,
} from './actionReturn';
import { ROUTE_GRAPH, resolvesFrom, type TabName } from '@/navigation/routeGraph';
import type { ActionLocale } from '@/lib/actionMeta';

describe('where Back goes', () => {
  it('honours the conversation the pill came from', () => {
    const back = actionReturnNavigation({ tab: 'Navigator', screen: 'NavigatorMain' });
    expect(back).not.toBeNull();
    expect(back!.tab).toBe('Navigator');
    expect(back!.options.screen).toBe('NavigatorMain');
    // The navigate the route wrapper will make, checked the way every other
    // cross-stack call in this app is checked.
    expect(resolvesFrom(ACTION_DETAIL_TAB, { screen: back!.options.screen, tab: back!.tab })).toBe(
      true
    );
  });

  it('honours Plan, which opens an action from two of its own surfaces', () => {
    const back = actionReturnNavigation({ tab: 'Calendar', screen: 'PlanMain' });
    expect(back).not.toBeNull();
    expect(resolvesFrom(ACTION_DETAIL_TAB, { screen: back!.options.screen, tab: back!.tab })).toBe(
      true
    );
  });

  it('carries NO params — a round trip must not re-seed the composer', () => {
    const back = actionReturnNavigation({ tab: 'Navigator', screen: 'NavigatorMain' });
    // `prefill`/`anchor` fire an effect on arrival. Handing them back would
    // overwrite the question the parent had already started typing, which is
    // the exact defect the prefill effect was fixed for in the first build.
    expect(Object.keys(back!.options).sort()).toEqual(['screen']);
  });

  it("keeps a stack's landing screen beneath a pushed one, and not beneath itself", () => {
    // ProcessMap is pushed inside the Home stack: HomeMain belongs underneath.
    const pushed = actionReturnNavigation({ tab: 'Home', screen: 'ProcessMap' });
    expect(pushed!.options.initial).toBe(false);
    // NavigatorMain IS its stack's landing screen; asking for it on top of
    // itself asks the navigator for a state with one screen stacked twice.
    expect(
      actionReturnNavigation({ tab: 'Navigator', screen: 'NavigatorMain' })!.options.initial
    ).toBeUndefined();
    // Read off the graph, so a changed `initial` cannot leave this stale.
    expect(ROUTE_GRAPH.Navigator.initial).toBe('NavigatorMain');
    expect(ROUTE_GRAPH.Home.initial).not.toBe('ProcessMap');
  });

  it('refuses a target that would not land, rather than tapping into nothing', () => {
    // A real screen, in the wrong stack: the Navigator stack does not register
    // ActionDetail, so this navigate would resolve nowhere. This is the shape
    // that has shipped a dead tap twice.
    expect(resolvesFrom('Navigator', { screen: 'ActionDetail', tab: 'Navigator' })).toBe(false);
    expect(actionReturnNavigation({ tab: 'Navigator', screen: 'ActionDetail' })).toBeNull();
    // A tab that does not exist.
    expect(actionReturnNavigation({ tab: 'Trackr', screen: 'TrackerList' })).toBeNull();
    // A screen no stack registers.
    expect(actionReturnNavigation({ tab: 'Home', screen: 'HomeMainn' })).toBeNull();
  });

  it('refuses anything that is not a target at all', () => {
    // ActionDetail is deep-linkable (`actions/:actionId`), so `returnTo` is
    // untrusted input: whatever arrives, the caller falls back to its own
    // goBack instead of throwing on the way out of a screen.
    for (const junk of [undefined, null, '', 'Navigator', 42, [], {}, { tab: 'Navigator' }, { screen: 'NavigatorMain' }, { tab: 'Navigator', screen: 7 }]) {
      expect(actionReturnNavigation(junk as unknown)).toBeNull();
    }
  });

  it('every tab in the graph can be returned to by its own landing screen', () => {
    // The mechanism is not pill-specific: any tab that opens one action can
    // name itself. A tab added to the graph gets this for free.
    for (const tab of Object.keys(ROUTE_GRAPH) as TabName[]) {
      const back = actionReturnNavigation({ tab, screen: ROUTE_GRAPH[tab].initial });
      expect(back, `${tab} cannot be returned to`).not.toBeNull();
    }
  });
});

describe('the action that is gone', () => {
  const LOCALES: ActionLocale[] = ['en', 'es', 'vi'];

  it('says what happened, and what did not, in all three languages', () => {
    for (const locale of LOCALES) {
      expect(actionUnavailableTitle(locale).length).toBeGreaterThan(0);
      expect(actionUnavailableBody(locale).length).toBeGreaterThan(0);
      expect(actionUnavailableBack(locale).length).toBeGreaterThan(0);
    }
    // Actually translated, not the English string three times — a parent who
    // tapped a Vietnamese pill should not land on an English dead end.
    expect(new Set(LOCALES.map((l) => actionUnavailableTitle(l))).size).toBe(3);
    expect(new Set(LOCALES.map((l) => actionUnavailableBody(l))).size).toBe(3);
  });

  it('blames nobody — not the agency, and not the parent', () => {
    // Same rule as the seeded sentence (`actionAsk.test.ts`): state the status,
    // never an actor who failed. A parent reaching this screen may well have
    // dismissed the action themselves, and does not need telling.
    const banned = /you (deleted|removed|dismissed)|your mistake|they (deleted|removed)|no longer available/i;
    for (const locale of LOCALES) {
      expect(`${actionUnavailableTitle(locale)} ${actionUnavailableBody(locale)}`).not.toMatch(
        banned
      );
    }
  });
});
