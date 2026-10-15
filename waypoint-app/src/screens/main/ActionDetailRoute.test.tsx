/**
 * The route wrapper for one action, rendered — Back, and the action that is
 * gone (`Roadmap/Action-Ask-Plan.md`, open item 3).
 *
 * Both of these were wrong in production while every gate was green, because
 * neither could be reached by a test: the wrapper was an inline function in
 * `MainTabs.tsx`, a file that imports every screen in the app. A parent who
 * crossed tabs to read one action — the Navigator's "Ask about this" pill, a
 * Plan row — tapped "← Back" and did not come back; and if the action had
 * been dismissed or deleted meanwhile, they got one grey sentence with no
 * control of any kind on a tab bar with nothing lit.
 *
 * The navigation object here is a fake, not the global mock: this screen gets
 * its navigator from PROPS, and what it does with `canGoBack` is half the
 * behaviour.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({
  actions: [] as any[],
  loading: false,
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', regional_center: null } }),
  useChildren: () => ({ children: [] }),
  useDiagnoses: () => ({ diagnoses: [] }),
}));
vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({
    actions: h.actions,
    loading: h.loading,
    error: null,
    stats: null,
    updateStatus: vi.fn(),
    toggleStep: vi.fn(),
    updateAction: vi.fn(),
    createAction: vi.fn(),
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useContacts', () => ({ useContacts: () => ({ contacts: [] }) }));
vi.mock('@/hooks/useActionNotes', () => ({
  useActionNotes: () => ({ notes: [], supported: true, error: null, addNote: vi.fn(), deleteNote: vi.fn() }),
}));
vi.mock('@/lib/googleCalendar', () => ({
  getCalendarEvent: async () => null,
  updateCalendarEvent: async () => ({ ok: true }),
}));
vi.mock('@/lib/gmail', () => ({
  gmailStatus: async () => ({ connected: false, gmail: false, email: null }),
  gmailSend: async () => ({ ok: true }),
}));

import ActionDetailRoute from './ActionDetailRoute';
import { resolvesFrom } from '@/navigation/routeGraph';
import { ACTION_DETAIL_TAB } from '@/lib/actionReturn';

const ACTION = {
  id: 'a1',
  family_id: 'fam1',
  child_id: null as string | null,
  title: 'Apply for Medi-Cal',
  description: null,
  category: 'benefits',
  priority: 'high',
  status: 'not_started',
  script: null,
  steps: null,
  due_date: null,
  depends_on: null,
  google_event_id: null,
  local_id: null,
  synced_at: null,
  deadline_warning_days: 7,
  follow_up_key: null,
  source: 'ai_navigator',
  created_at: new Date().toISOString(),
};

/** The navigator as the route actually receives it: from props. */
function fakeNav(canGoBack: boolean) {
  return {
    navigate: vi.fn(),
    goBack: vi.fn(),
    canGoBack: () => canGoBack,
    setOptions: vi.fn(),
    setParams: vi.fn(),
    addListener: () => () => {},
  };
}

/** The pill's own return target, and Plan's. */
const TO_CHAT = { tab: 'Navigator', screen: 'NavigatorMain' };

function open(params: Record<string, unknown>, canGoBack = true) {
  const navigation = fakeNav(canGoBack);
  render(<ActionDetailRoute route={{ params }} navigation={navigation} />);
  return navigation;
}

const back = () => screen.getByText('← Back');

beforeEach(() => {
  h.actions = [ACTION];
  h.loading = false;
});

describe('getting back from one action', () => {
  it('returns to the conversation the pill came from, not to a tab', () => {
    const nav = open({ actionId: 'a1', returnTo: TO_CHAT });
    fireEvent.click(back());

    expect(nav.goBack).not.toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledTimes(1);
    const [tab, options] = nav.navigate.mock.calls[0] as [string, { screen: string }];
    // Asserted against the declared graph, from the tab ActionDetail lives
    // in — a return target is a cross-stack navigate and can be a dead tap.
    expect(resolvesFrom(ACTION_DETAIL_TAB, { screen: options.screen, tab })).toBe(true);
    expect(tab).toBe('Navigator');
    expect(options.screen).toBe('NavigatorMain');
  });

  it('hands back no params, so the composer is not re-seeded', () => {
    const nav = open({ actionId: 'a1', returnTo: TO_CHAT });
    fireEvent.click(back());
    const [, options] = nav.navigate.mock.calls[0] as [string, Record<string, unknown>];
    // Returning with `prefill`/`anchor` would re-fire the arrival effect over
    // a question the parent had already started writing.
    expect(options.params).toBeUndefined();
  });

  it('still just pops when the action was opened from the Tracker list', () => {
    const nav = open({ actionId: 'a1' });
    fireEvent.click(back());
    expect(nav.goBack).toHaveBeenCalledTimes(1);
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('falls back to the list for a deep link that opened this as the root', () => {
    const nav = open({ actionId: 'a1' }, false);
    fireEvent.click(back());
    expect(nav.navigate).toHaveBeenCalledWith('TrackerList');
  });

  it('ignores a return target that would not land', () => {
    // ActionDetail is deep-linkable, so this can arrive from outside the app.
    // The parent must not be left pressing a button that does nothing.
    const nav = open({ actionId: 'a1', returnTo: { tab: 'Navigator', screen: 'ActionDetail' } });
    fireEvent.click(back());
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('the action is gone', () => {
  beforeEach(() => {
    // Dismissed from the plan, or deleted, while a chat anchored to it was
    // still open — the pill points at it for the life of the conversation.
    h.actions = [];
  });

  it('says so, and offers the way back it was given', () => {
    const nav = open({ actionId: 'a1', returnTo: TO_CHAT });
    expect(screen.getByText(/no longer on your plan/i)).toBeTruthy();

    fireEvent.click(back());
    const [tab, options] = nav.navigate.mock.calls[0] as [string, { screen: string }];
    expect(resolvesFrom(ACTION_DETAIL_TAB, { screen: options.screen, tab })).toBe(true);
    expect(tab).toBe('Navigator');
  });

  it('is never a dead end, even with no return target at all', () => {
    const nav = open({ actionId: 'gone' });
    // The whole defect: one sentence, and no control. This is the control.
    fireEvent.click(back());
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  it('says that nothing else moved', () => {
    open({ actionId: 'gone' });
    expect(screen.getByText(/Nothing else has changed/i)).toBeTruthy();
  });

  it('waits for the load before claiming anything is missing', () => {
    // An empty list mid-fetch is not a deleted action. Saying so while the
    // actions are still arriving would flash "no longer on your plan" at
    // every parent who opened one on a slow connection.
    h.loading = true;
    open({ actionId: 'a1' });
    expect(screen.queryByText(/no longer on your plan/i)).toBeNull();
  });
});
