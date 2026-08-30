/**
 * Every screen a family can reach deserves a URL.
 *
 * On web this is what makes browser back, bookmarks and a shared link work,
 * and `npm run build:web` is not a CI gate — so nothing else catches a URL
 * that stops resolving. Two have already shipped broken: `/tools` became a
 * dead bookmark one release after it was introduced, and screens registered
 * in a second stack produced unroutable paths.
 */
import { describe, it, expect } from 'vitest';
import { MAIN_LINKING } from './linking';
import { ROUTE_GRAPH } from './routeGraph';
import type { TabName } from './routeGraph';

/**
 * Screens deliberately left without a URL: they need state a link cannot
 * carry (an object passed in params), so a bookmark could only ever land on
 * an error.
 */
const INTENTIONALLY_PATHLESS = new Set([
  'Thread',          // takes a thread object
  'DocumentAnalysis',// takes an uploaded document
  'SdpJourney',      // reached from the Journey it belongs to
  'ResourceStack',   // reached from the Journey it belongs to
  'RequestCase',     // needs a request id the family cannot know
]);

describe('the linking config matches the navigator', () => {
  it('gives a path to every registered screen, or names it pathless', () => {
    for (const [tab, stack] of Object.entries(ROUTE_GRAPH)) {
      const declared = MAIN_LINKING.screens[tab];
      expect(declared, `tab ${tab} has no linking entry`).toBeTruthy();
      for (const screen of stack.screens) {
        if (INTENTIONALLY_PATHLESS.has(screen)) continue;
        // Community screens only exist behind the flag.
        if (screen === 'Forum' || screen === 'Messages') continue;
        expect(
          Object.prototype.hasOwnProperty.call(declared.screens, screen),
          `${tab}/${screen} has no URL`
        ).toBe(true);
      }
    }
  });

  it('never gives a path to a screen the navigator does not register', () => {
    for (const [tab, declared] of Object.entries(MAIN_LINKING.screens)) {
      const stack = ROUTE_GRAPH[tab as TabName];
      expect(stack, `linking declares unknown tab ${tab}`).toBeTruthy();
      for (const screen of Object.keys(declared.screens)) {
        // Community screens are registered only when the flag is on.
        if (screen === 'Forum' || screen === 'Messages') continue;
        expect(stack.screens, `${tab}/${screen} is linkable but unregistered`).toContain(screen);
      }
    }
  });

  it('opens each stack on the route the navigator opens it on', () => {
    for (const [tab, declared] of Object.entries(MAIN_LINKING.screens)) {
      if (!declared.initialRouteName) continue;
      expect(declared.initialRouteName, `${tab}`).toBe(ROUTE_GRAPH[tab as TabName].initial);
    }
  });

  it('never gives two screens the same URL', () => {
    const seen = new Map<string, string>();
    for (const [tab, declared] of Object.entries(MAIN_LINKING.screens)) {
      for (const [screen, path] of Object.entries(declared.screens)) {
        if (path === '') continue; // the Home root
        expect(seen.has(path), `${path} is both ${seen.get(path)} and ${tab}/${screen}`).toBe(false);
        seen.set(path, `${tab}/${screen}`);
      }
    }
  });

  it('keeps the URLs earlier releases shipped', () => {
    // A family may have bookmarked or been sent any of these.
    const promised: Record<string, string> = {
      Home: 'HomeMain', Navigator: 'NavigatorMain', Calendar: 'PlanMain', Tools: 'ToolsMain',
    };
    expect(MAIN_LINKING.screens.Tools.screens.ToolsMain).toBe('tools');
    expect(MAIN_LINKING.screens.Calendar.screens.CalendarMain).toBe('calendar');
    expect(MAIN_LINKING.screens.Home.screens.Expenses).toBe('expenses');
    expect(MAIN_LINKING.screens.Home.screens.TaxReport).toBe('tax-report');
    expect(MAIN_LINKING.screens.Home.screens.Profile).toBe('profile');
    expect(MAIN_LINKING.screens.Tracker.screens.TrackerList).toBe('actions');
    for (const [tab, screen] of Object.entries(promised)) {
      expect(MAIN_LINKING.screens[tab].screens[screen]).toBeDefined();
    }
  });
});
