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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const h = vi.hoisted(() => ({
  actions: [] as any[],
  loading: false,
  error: null as string | null,
  refetch: (() => {}) as any,
  updateAction: (() => {}) as any,
  updateStatus: (() => {}) as any,
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
    error: h.error,
    stats: null,
    updateStatus: h.updateStatus,
    toggleStep: vi.fn(),
    updateAction: h.updateAction,
    createAction: vi.fn(),
    refetch: h.refetch,
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
import { ROUTE_GRAPH } from '@/navigation/routeGraph';
import { RETURN_TO_CHAT } from '@/lib/actionReturn';
import { actionLockedBy } from '@/lib/actionLock';
import { statusActionLabel } from '@/lib/actionMeta';
import { I18nProvider } from '@/i18n';
import { ToastProvider } from '@/components/Toast';

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

function open(params: Record<string, unknown>, canGoBack = true) {
  const navigation = fakeNav(canGoBack);
  const view = render(<ActionDetailRoute route={{ params }} navigation={navigation} />);
  return Object.assign(navigation, { view });
}

const back = () => screen.getByText('← Back');

beforeEach(() => {
  h.actions = [ACTION];
  h.loading = false;
  h.error = null;
  h.refetch = vi.fn();
  h.updateAction = vi.fn();
  h.updateStatus = vi.fn();
});

describe('getting back from one action', () => {
  it('returns to the conversation the pill came from, not to a tab', () => {
    const nav = open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
    fireEvent.click(back());

    expect(nav.goBack).not.toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledTimes(1);
    const [tab, options] = nav.navigate.mock.calls[0] as [string, { screen: string; pop?: boolean }];
    expect(tab).toBe('Navigator');
    expect(options.screen).toBe('NavigatorMain');
    // The graph's word, not this file's, that the chat is reachable that way.
    expect(ROUTE_GRAPH.Navigator.screens).toContain(options.screen);
    // And a return, not a second copy of the chat pushed under the parent.
    expect(options.pop).toBe(true);
  });

  it('hands back no params, so the composer is not re-seeded', () => {
    const nav = open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
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
    const nav = open({ actionId: 'a1', returnTo: 'Navigator/ActionDetail' });
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
    const nav = open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
    expect(screen.getByText(/no longer on your plan/i)).toBeTruthy();

    fireEvent.click(back());
    const [tab, options] = nav.navigate.mock.calls[0] as [string, { screen: string }];
    expect(tab).toBe('Navigator');
    expect(ROUTE_GRAPH.Navigator.screens).toContain(options.screen);
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

/**
 * Back is a `navigate` to another tab, not a `pop`, so this screen is NOT
 * unmounted when the parent leaves it — and `ActionDetailScreen` holds nine
 * pieces of draft state. An adversary pass caught the consequence: one
 * action's half-typed next step was still in the box when the next action
 * opened, and tapping Add wrote it onto that action's checklist.
 */
describe('one action never carries its drafts into the next', () => {
  const OTHER = { ...ACTION, id: 'a2', title: 'Request an IEP assessment' };
  const stepBox = () => screen.getByPlaceholderText('Add a next step…') as HTMLInputElement;

  it('clears a half-typed next step when a different action opens', () => {
    h.actions = [ACTION, OTHER];
    const nav = open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
    fireEvent.change(stepBox(), { target: { value: 'Ask about retroactive coverage' } });

    // The parent goes back to the conversation, then opens the other action:
    // the SAME mounted route, new params.
    fireEvent.click(back());
    nav.view.rerender(
      <ActionDetailRoute route={{ params: { actionId: 'a2' } }} navigation={nav} />
    );

    expect(screen.getByText('Request an IEP assessment')).toBeTruthy();
    expect(stepBox().value).toBe('');
  });

  it('and so cannot write one action\'s step onto another', () => {
    h.actions = [ACTION, OTHER];
    const nav = open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
    fireEvent.change(stepBox(), { target: { value: 'Ask about retroactive coverage' } });
    nav.view.rerender(
      <ActionDetailRoute route={{ params: { actionId: 'a2' } }} navigation={nav} />
    );

    // Nothing to submit, so nothing is submitted — the add control is
    // disabled on an empty draft.
    fireEvent.click(screen.getByLabelText('Add step'));
    expect(h.updateAction).not.toHaveBeenCalled();
  });

  it('keeps the draft while the parent is still on that same action', () => {
    // The reset must key on the action, not fire on every render — losing a
    // half-typed step to a refetch would be its own defect.
    h.actions = [ACTION, OTHER];
    const nav = open({ actionId: 'a1' });
    fireEvent.change(stepBox(), { target: { value: 'Call the county' } });
    nav.view.rerender(
      <ActionDetailRoute route={{ params: { actionId: 'a1' } }} navigation={nav} />
    );
    expect(stepBox().value).toBe('Call the county');
  });
});

/**
 * `useActions` reports a failed fetch and a deleted action the same way: an
 * empty list. Telling a parent on a dropped connection that their action was
 * removed from their plan is a false statement about their plan, made by the
 * app that keeps it.
 */
describe('the fetch failed, which is not the same as the action being gone', () => {
  beforeEach(() => {
    h.actions = [];
    h.error = 'network request failed';
  });

  it('says the plan is unchanged, not that the action was removed', () => {
    open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
    expect(screen.getByText(/didn't load/i)).toBeTruthy();
    expect(screen.queryByText(/no longer on your plan/i)).toBeNull();
    expect(screen.getByText(/unchanged/i)).toBeTruthy();
  });

  it('offers the retry, and still offers the way back', () => {
    const nav = open({ actionId: 'a1', returnTo: RETURN_TO_CHAT });
    fireEvent.click(screen.getByLabelText('Try again'));
    expect(h.refetch).toHaveBeenCalled();

    fireEvent.click(back());
    expect(nav.navigate.mock.calls[0][0]).toBe('Navigator');
  });
});

/**
 * The dependency lock, from the detail screen's own status control.
 *
 * `ActionsScreen` has the same guard and said the same English-only sentence;
 * both now come from `actionLock`. The toast is the only feedback the tap
 * gives — the status does not move — so for a parent who cannot read it the
 * control simply appears not to work.
 */
describe('a step that builds on an unfinished one', () => {
  const GATE = { ...ACTION, id: 'gate', title: 'Gate step', status: 'not_started' };
  const BLOCKED = { ...ACTION, id: 'blocked', title: 'Blocked step', depends_on: 'gate' };

  function openIn(locale: 'en' | 'es' | 'vi') {
    const navigation = fakeNav(true);
    render(
      <I18nProvider initialLocale={locale}>
        <ToastProvider>
          <ActionDetailRoute route={{ params: { actionId: 'blocked' } }} navigation={navigation} />
        </ToastProvider>
      </I18nProvider>
    );
    return navigation;
  }

  beforeEach(() => {
    h.actions = [GATE, BLOCKED];
  });

  it('says why, naming the step it waits on, in the family\'s language', () => {
    for (const locale of ['es', 'vi'] as const) {
      openIn(locale);
      fireEvent.click(
        screen.getByLabelText(`Blocked step: ${statusActionLabel('completed', locale)}`)
      );
      expect(screen.getByText(actionLockedBy('Gate step', locale)), locale).toBeTruthy();
      cleanup();
    }
  });

  it('and still refuses the change', () => {
    // The copy fix must not have moved the guard: the toast is INSTEAD of the
    // write, not after it.
    openIn('es');
    fireEvent.click(screen.getByLabelText(`Blocked step: ${statusActionLabel('completed', 'es')}`));
    expect(screen.getByText(actionLockedBy('Gate step', 'es'))).toBeTruthy();
    expect(h.updateStatus).not.toHaveBeenCalled();
  });

  it('lets the step through once the one it waits on is done', () => {
    h.actions = [{ ...GATE, status: 'completed' }, BLOCKED];
    openIn('es');
    fireEvent.click(screen.getByLabelText(`Blocked step: ${statusActionLabel('completed', 'es')}`));
    expect(h.updateStatus).toHaveBeenCalledWith('blocked', 'completed', undefined);
  });
});
