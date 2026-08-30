/**
 * Nothing-is-lost guard for the Home rebuild.
 *
 * React Navigation resolves a `navigate` by walking to PARENTS, never to a
 * sibling stack. A target is reachable only if the CALLER's own stack
 * registers it, or the call names the tab that does. Twice now a surface
 * shipped taps that did nothing: the Plan tab's agency-clock rows, and all
 * nine of the Learn library's destinations.
 *
 * The first version of this file was a hand-copied list of route names, and
 * it certified those nine — it encoded what the author believed rather than
 * what the navigator does. It now reads `navigation/routeGraph.ts`, which
 * `MainTabs.tsx` builds the navigator from, so the two cannot drift.
 */
import { describe, it, expect } from 'vitest';
import { accountMenuItems } from './accountMenu';
import { getLearnLibrary, searchLearn } from './learnLibrary';
import { getAllTools } from './toolsCatalog';
import { HOME_DESTINATIONS, ROUTE_GRAPH, resolvesFrom, visibleTabs } from '@/navigation/routeGraph';
import type { TabName } from '@/navigation/routeGraph';

describe('the graph itself', () => {
  it('shows a parent exactly four tabs', () => {
    expect(visibleTabs()).toEqual(['Home', 'Navigator', 'Tools', 'Calendar']);
  });

  it('registers each stack’s initial route in that stack', () => {
    for (const [tab, stack] of Object.entries(ROUTE_GRAPH)) {
      expect(stack.screens, `${tab}`).toContain(stack.initial);
    }
  });

  it('never registers the same screen in two stacks', () => {
    // Double registration means two mounted copies and two URLs for one
    // screen, only one of which routes. Naming the tab is the alternative.
    const seen = new Map<string, string>();
    for (const [tab, stack] of Object.entries(ROUTE_GRAPH)) {
      for (const screen of stack.screens) {
        expect(seen.has(screen), `${screen} in ${seen.get(screen)} and ${tab}`).toBe(false);
        seen.set(screen, tab);
      }
    }
  });
});

describe('the avatar menu reaches everything the Profile tab held', () => {
  // The avatar is on Home, so its items resolve in the Home stack.
  const CALLER: TabName = 'Home';

  it('names a real destination for every item', () => {
    for (const item of accountMenuItems()) {
      expect(resolvesFrom(CALLER, item), `${item.key} → ${item.screen}`).toBe(true);
    }
  });

  it('keeps Profile itself reachable now that it left the bar', () => {
    expect(accountMenuItems().some((i) => i.screen === 'Profile')).toBe(true);
    expect(HOME_DESTINATIONS).toContain('Profile');
  });

  it('offers the same items in every language', () => {
    const en = accountMenuItems('en');
    for (const loc of ['es', 'vi'] as const) {
      const other = accountMenuItems(loc);
      expect(other.map((i) => i.key)).toEqual(en.map((i) => i.key));
      expect(other.map((i) => i.screen)).toEqual(en.map((i) => i.screen));
      other.forEach((i, n) => expect(i.label).not.toBe(en[n].label));
    }
  });
});

describe('the Learn library never offers a dead tap', () => {
  // LearnPanel renders inside the Ask stack, which registers none of these.
  const CALLER: TabName = 'Navigator';

  it('names an explicit tab on every target', () => {
    const lib = getLearnLibrary();
    for (const target of [...lib.paths, ...lib.articles].map((e) => e.target)) {
      expect(target.tab, `${target.screen} has no tab`).toBeTruthy();
    }
  });

  it('resolves every path and article from the stack it is rendered in', () => {
    const lib = getLearnLibrary();
    for (const p of lib.paths) {
      expect(resolvesFrom(CALLER, p.target), `path ${p.key}`).toBe(true);
    }
    for (const a of lib.articles) {
      expect(resolvesFrom(CALLER, a.target), `article ${a.key}`).toBe(true);
    }
  });

  it('gives a glossary answer no target at all, so it is read and not tapped', () => {
    for (const hit of searchLearn('what is an IPP')) {
      if (hit.kind === 'glossary') expect(hit.target).toBeUndefined();
    }
  });
});

describe('every tool resolves from both surfaces that show tool rows', () => {
  it('lands from Home and from the Tools tab', () => {
    for (const tool of getAllTools('en')) {
      // Both surfaces navigate with `tab ?? 'Home'`, so a route with no tab
      // is a Home-stack route reached by name.
      const target = { screen: tool.route.screen, tab: tool.route.tab ?? 'Home' };
      expect(resolvesFrom('Home', target), `${tool.key} from Home`).toBe(true);
      expect(resolvesFrom('Tools', target), `${tool.key} from Tools`).toBe(true);
    }
  });
});

describe('a bare screen name only works inside its own stack', () => {
  it('does not resolve a Home screen from the Ask stack', () => {
    // This is the defect that shipped: the assertion that would have caught it.
    expect(resolvesFrom('Navigator', { screen: 'ProcessMap' })).toBe(false);
    expect(resolvesFrom('Navigator', { screen: 'ProcessMap', tab: 'Home' })).toBe(true);
  });

  it('does not resolve a Home screen from the Tools stack', () => {
    expect(resolvesFrom('Tools', { screen: 'Letters' })).toBe(false);
    expect(resolvesFrom('Tools', { screen: 'Letters', tab: 'Home' })).toBe(true);
  });

  it('refuses a screen that is registered nowhere', () => {
    expect(resolvesFrom('Home', { screen: 'Learn' })).toBe(false);
  });
});
