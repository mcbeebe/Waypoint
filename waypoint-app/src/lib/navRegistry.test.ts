/**
 * Nothing-is-lost guard for the Home rebuild.
 *
 * Every destination the redesigned surfaces offer has to resolve to a screen
 * that is actually registered — a `navigate` bubbles to PARENTS, never to a
 * sibling stack, so a route registered only under Home is a silent dead tap
 * from the Tools or Plan tab. That defect shipped once (the Plan tab's
 * agency-clock rows) and is what this file exists to prevent.
 *
 * Update BOTH this list and `navigation/MainTabs.tsx` when a screen moves.
 */
import { describe, it, expect } from 'vitest';
import { accountMenuItems } from './accountMenu';
import { getLearnLibrary } from './learnLibrary';
import { getAllTools } from './toolsCatalog';

/** Registered in the Home stack AND the Tools stack (destinationScreens). */
const SHARED_DESTINATIONS = new Set([
  'Journey', 'JourneyPhase', 'ProcessMap', 'SdpJourney', 'EscalationLadder',
  'ResourceStack', 'EligibilityResult', 'FundedOffer', 'RequestTracker',
  'RequestCase', 'Pricing', 'Agencies', 'Reimbursables', 'Expenses', 'TaxReport',
  'Insights', 'Documents', 'DocumentAnalysis', 'IEPHub', 'Letters',
  'EmailAnalyzer', 'CommunicationLog', 'Providers', 'Services', 'Insurance',
  'HealthRecords', 'FamilySharing', 'ProviderPortal',
]);

/** Tab-level route names on the bottom bar (visible or registered-but-hidden). */
const TABS: Record<string, Set<string>> = {
  Home: new Set(['HomeMain', ...SHARED_DESTINATIONS]),
  Tools: new Set(['ToolsMain', ...SHARED_DESTINATIONS]),
  Navigator: new Set(['NavigatorMain', 'Resources', 'Blog']),
  Tracker: new Set(['TrackerList', 'ActionDetail']),
  Calendar: new Set(['PlanMain', 'CalendarMain']),
  Profile: new Set(['ProfileMain']),
};

function resolves(screen: string, tab?: string): boolean {
  if (tab) return TABS[tab]?.has(screen) ?? false;
  // No tab named: it must be reachable in whichever stack the caller sits in,
  // which for every caller here is Home or Tools — both hold the shared set.
  return SHARED_DESTINATIONS.has(screen) || screen === 'Profile';
}

describe('the avatar menu reaches everything the Profile tab held', () => {
  it('names a real destination for every item', () => {
    for (const item of accountMenuItems()) {
      expect(resolves(item.screen), `${item.key} → ${item.screen}`).toBe(true);
    }
  });

  it('keeps Profile itself reachable now that it left the bar', () => {
    expect(accountMenuItems().some((i) => i.screen === 'Profile')).toBe(true);
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
  it('points every path and article at a registered screen', () => {
    const lib = getLearnLibrary();
    for (const p of lib.paths) {
      expect(resolves(p.target.screen, p.target.tab), `path ${p.key}`).toBe(true);
    }
    for (const a of lib.articles) {
      expect(resolves(a.target.screen, a.target.tab), `article ${a.key}`).toBe(true);
    }
  });
});

describe('every tool resolves from BOTH stacks that show tool rows', () => {
  it('registers each tool destination in Home and in Tools', () => {
    for (const tool of getAllTools('en')) {
      const { screen, tab } = tool.route;
      if (tab) {
        expect(TABS[tab]?.has(screen), `${tool.key} → ${tab}/${screen}`).toBe(true);
      } else {
        // No tab means "the stack I am in" — and tool rows render in both.
        expect(TABS.Home.has(screen), `${tool.key} → Home/${screen}`).toBe(true);
        expect(TABS.Tools.has(screen), `${tool.key} → Tools/${screen}`).toBe(true);
      }
    }
  });
});
