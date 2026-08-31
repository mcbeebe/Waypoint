import { describe, it, expect } from 'vitest';
import {
  getActionTools,
  getToolDoors,
  getAllTools,
  searchTools,
  searchToolsForHome,
  searchPlaceholder,
  requestsBadge,
  replyBadge,
  lettersDescription,
} from './toolsCatalog';
import { resolvesFrom } from '@/navigation/routeGraph';

/**
 * Screens the catalog may route to. Mirrors HomeStackParamList (Home
 * stack) plus the tab-nested destinations the tools area supports —
 * update BOTH this list and navigation.ts when a screen moves.
 */
const HOME_STACK_SCREENS = new Set([
  'Journey', 'ProcessMap', 'SdpJourney', 'EscalationLadder', 'ResourceStack',
  'EligibilityResult', 'FundedOffer', 'RequestTracker', 'Pricing', 'Agencies',
  'Reimbursables', 'Insights', 'Documents', 'IEPHub', 'Letters',
  'EmailAnalyzer', 'CommunicationLog', 'Providers', 'Services', 'Insurance',
  'HealthRecords', 'FamilySharing', 'ProviderPortal',
  // Moved out of the Calendar tab in the Home rebuild (phase 3): Plan is
  // about obligations, and Tools → Money already listed these.
  'Expenses', 'TaxReport',
]);
const TAB_SCREENS: Record<string, Set<string>> = {
  Navigator: new Set(['Resources', 'Blog']),
  Calendar: new Set(['PlanMain', 'CalendarMain']),
};

describe('toolsCatalog routes', () => {
  it('every route points at a real screen', () => {
    for (const t of getAllTools('en')) {
      if (t.route.tab) {
        expect(
          TAB_SCREENS[t.route.tab]?.has(t.route.screen),
          `${t.key} → ${t.route.tab}/${t.route.screen}`
        ).toBe(true);
      } else {
        expect(
          HOME_STACK_SCREENS.has(t.route.screen),
          `${t.key} → ${t.route.screen}`
        ).toBe(true);
      }
    }
  });

  it('keys are unique across actions and doors', () => {
    const keys = getAllTools('en').map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('doors are the four agreed groups, in order', () => {
    expect(getToolDoors('en').map((d) => d.key)).toEqual([
      'understand', 'money', 'records', 'more',
    ]);
  });
});

describe('stress-test copy decisions hold', () => {
  it('no idiom labels: Clocks and Paper Trail are gone from titles', () => {
    for (const t of getAllTools('en')) {
      expect(t.label).not.toMatch(/clock/i);
      expect(t.label.toLowerCase()).not.toContain('paper trail');
    }
    // "Paper Trail" survives only as flavor in the description (owner call #1)
    const sent = getActionTools('en').find((t) => t.key === 'sent_received')!;
    expect(sent.description.toLowerCase()).toContain('paper trail');
  });

  it('the Letters row claims the "they said no" moment', () => {
    const letters = getActionTools('en')[0];
    expect(letters.description.toLowerCase()).toContain('said no');
    expect(letters.description.toLowerCase()).not.toContain('legal clock');
  });

  it('door previews describe what is actually behind the door', () => {
    const doors = getToolDoors('en');
    const money = doors.find((d) => d.key === 'money')!;
    const understand = doors.find((d) => d.key === 'understand')!;
    // The preview still speaks needs...
    expect(money.contents).toContain('Diapers');
    expect(understand.contents).toContain('Eligibility');
    // ...but no longer advertises guides that moved to Learn — those would be
    // dead ends behind the door. (Search still reaches them: ToolsArea falls
    // through to searchLearn, pinned in learnLibrary.test.)
    expect(money.contents).not.toContain('IHSS');
    expect(understand.contents).not.toMatch(/School|Transition/);
  });
});

describe('searchTools', () => {
  it('plain caregiver words find the right tool', () => {
    expect(searchTools('they said no').map((t) => t.key)).toContain('letters');
    expect(searchTools('diapers').map((t) => t.key)).toContain('rc_funding');
    expect(searchTools('stroller').map((t) => t.key)).toContain('rc_funding');
    expect(searchTools('paper trail').map((t) => t.key)).toContain('sent_received');
    // 'journey' left the Tools catalog when Journey became a bottom tab, and
    // the 'how it works' / benefits-stack guides moved to the Learn tab.
    expect(searchTools('diapers').map((t) => t.key)).toContain('rc_funding');
  });

  it('is accent-insensitive and works in Spanish', () => {
    expect(searchTools('pañales', 'es').map((t) => t.key)).toContain('rc_funding');
    expect(searchTools('panales', 'es').map((t) => t.key)).toContain('rc_funding');
  });

  it('empty query returns nothing', () => {
    expect(searchTools('  ')).toEqual([]);
  });
});

describe('age-aware search placeholder', () => {
  it('speaks Early Start to toddler parents and transition to teen parents', () => {
    expect(searchPlaceholder(2)).toContain('Early Start');
    expect(searchPlaceholder(15)).toContain('transition');
    expect(searchPlaceholder(7)).toContain('diapers');
    expect(searchPlaceholder(null)).toContain('diapers');
  });
});

describe('badges carry dates and direction, never bare counts or demo data', () => {
  const now = new Date('2026-08-26T12:00:00');
  const req = (over: Record<string, string>) => ({
    status: 'requested' as const,
    request_type: 'ipp_meeting' as const,
    requested_on: '2026-08-20',
    ...over,
  });

  it('no open requests → no badge (never demo data)', () => {
    expect(requestsBadge([], 'en', now)).toBeNull();
    expect(requestsBadge([req({ status: 'granted' })], 'en', now)).toBeNull();
  });

  it('overdue beats everything and turns red', () => {
    // ipp_meeting = 30-day clock; requested 40 days ago → overdue
    const b = requestsBadge([req({ requested_on: '2026-07-01' })], 'en', now)!;
    expect(b.text).toBe('1 overdue');
    expect(b.tone).toBe('danger');
  });

  it('a near deadline shows the day, not a count', () => {
    // 30-day clock requested Aug 1 → due Aug 31, 5 days out from Aug 26
    const b = requestsBadge([req({ requested_on: '2026-08-01' })], 'en', now)!;
    expect(b.text).toMatch(/^due /);
    expect(b.tone).toBe('warning');
  });

  it('open requests with a distant or no statutory clock read as waiting', () => {
    const b = requestsBadge(
      [req({ request_type: 'other', requested_on: '2026-08-20' })],
      'en',
      now
    )!;
    expect(b.text).toBe('1 waiting');
  });

  it('reply badge has direction; letters row teaches newcomers', () => {
    expect(replyBadge(false)).toBeNull();
    expect(replyBadge(true)!.text).toBe('1 new reply');
    expect(lettersDescription(false)).toContain('first request');
    expect(lettersDescription(true)).toContain('Said no on the phone');
  });
});

describe('locale parity', () => {
  for (const locale of ['es', 'vi'] as const) {
    it(locale, () => {
      const en = getAllTools('en');
      const other = getAllTools(locale);
      expect(other.map((t) => t.key)).toEqual(en.map((t) => t.key));
      expect(other.map((t) => t.route)).toEqual(en.map((t) => t.route));
      expect(other.map((t) => t.icon)).toEqual(en.map((t) => t.icon));
      expect(other.map((t) => t.label)).not.toEqual(en.map((t) => t.label));
      const enDoors = getToolDoors('en');
      const otherDoors = getToolDoors(locale);
      expect(otherDoors.map((d) => d.key)).toEqual(enDoors.map((d) => d.key));
      expect(otherDoors.map((d) => d.tools.length)).toEqual(
        enDoors.map((d) => d.tools.length)
      );
    });
  }
});

describe('searchToolsForHome — natural-language tool search for the composer', () => {
  it('surfaces the IEP analyzer for "help me read my son’s IEP"', () => {
    const hits = searchToolsForHome('Help me read my sons IEP');
    expect(hits.length).toBeGreaterThan(0);
    // The dedicated analyzer should rank first (label + terms both hit).
    expect(hits[0].key).toBe('analyze_iep');
  });

  it('drops stop words so a full sentence still finds the tool', () => {
    // Without stopword dropping, the strict AND match would return nothing.
    expect(searchToolsForHome('I need help understanding the IEP').some((t) => t.key === 'analyze_iep')).toBe(true);
    expect(searchToolsForHome('analizar mi IEP', 'es').some((t) => t.key === 'analyze_iep')).toBe(true);
  });

  it('returns nothing for a query with no real terms', () => {
    expect(searchToolsForHome('help me please')).toEqual([]);
    expect(searchToolsForHome('  ')).toEqual([]);
  });

  it('the analyzer routes somewhere that resolves from Home', () => {
    const analyzer = getAllTools().find((t) => t.key === 'analyze_iep')!;
    expect(analyzer.route.screen).toBe('Documents');
    // No tab → Home stack; Documents is a Home destination.
    expect(resolvesFrom('Home', { screen: analyzer.route.screen, tab: analyzer.route.tab })).toBe(true);
  });
});
