/**
 * The shared Action Plan tracker, rendered.
 *
 * What this pins (owner request, Sep 2 2026): "the newly created items should
 * be identified and flagged in the list (need a created date)". Merging the
 * Plan tab's Action Plan segment into this one component (PR #180) dropped the
 * "Added <date>" line the Plan-only row used to render, and the focus view —
 * next 3 doable steps, rest collapsed — can hide a step a parent saved
 * seconds ago behind "Show everything". Both are behaviours a logic test
 * cannot see, so they are asserted against the real component here.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({ family: { id: 'fam1', regional_center: null } }),
  useChildren: () => ({ children: [{ id: 'c1', first_name: 'Teddy', is_primary: true }] }),
  useDiagnoses: () => ({ diagnoses: [] }),
}));

const h = vi.hoisted(() => ({
  actions: [] as any[],
  updateStatus: (() => {}) as any,
  updateAction: (() => {}) as any,
}));
vi.mock('@/hooks/useActions', () => ({
  useActions: () => ({
    actions: h.actions,
    loading: false,
    error: null,
    stats: null,
    updateStatus: h.updateStatus,
    updateAction: h.updateAction,
    createAction: vi.fn(),
    refetch: vi.fn(),
  }),
}));

import ActionsScreen from './ActionsScreen';
import { navigateCalls } from '../../../vitest.setup.ui';

/**
 * A fixed local noon, so "2 hours ago" is always the SAME calendar day.
 *
 * Without this the suite failed for two hours out of every twenty-four: at
 * 00:49 local, `hoursAgo(2)` lands on yesterday, `formatAddedOn` correctly
 * says "Added yesterday", and the assertion for "Added today" below blows up.
 * It was red on `main` in exactly that window — a real flake, not a change
 * this file made.
 */
const NOON = new Date(2026, 8, 3, 12, 0, 0).getTime();

const hoursAgo = (n: number) => new Date(NOON - n * 3600_000).toISOString();

function action(over: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    family_id: 'fam1',
    title: 'Ask the Regional Center for a speech assessment',
    description: null,
    category: 'regional_center',
    priority: 'medium',
    status: 'not_started',
    steps: null,
    script: null,
    due_date: null,
    depends_on: null,
    google_event_id: null,
    local_id: null,
    synced_at: null,
    deadline_warning_days: 7,
    follow_up_key: null,
    created_at: hoursAgo(2),
    ...over,
  };
}

beforeEach(() => {
  h.actions = [];
  h.updateStatus = vi.fn();
  h.updateAction = vi.fn();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOON);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('a step that just landed in the plan', () => {
  it('is flagged New and dated', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('Added today')).toBeTruthy();
  });

  it('drops the New flag once it is more than a day old, but keeps the date', () => {
    h.actions = [action({ created_at: hoursAgo(72) })];
    render(<ActionsScreen />);
    expect(screen.queryByText('New')).toBeNull();
    expect(screen.getByText(/^Added /)).toBeTruthy();
  });

  it('is not flagged New once it is done — the flag is about what to look at next', () => {
    h.actions = [action({ status: 'completed' })];
    render(<ActionsScreen />);
    expect(screen.queryByText('New')).toBeNull();
  });

  it('shows no added line at all rather than "Invalid Date"', () => {
    h.actions = [action({ created_at: 'not-a-timestamp' })];
    render(<ActionsScreen />);
    expect(screen.queryByText(/Added/)).toBeNull();
  });
});

describe('the focus view and brand-new items', () => {
  /** Four low-priority items ahead of it would push a new item out of the top 3. */
  const filler = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      action({
        id: `old${i}`,
        title: `Older step ${i}`,
        priority: 'urgent',
        created_at: hoursAgo(200 + i),
      })
    );

  it('shows a just-saved step even when the next-3 view would collapse it', () => {
    h.actions = [
      ...filler(4),
      action({ id: 'fresh', title: 'Just saved from an answer', priority: 'low', created_at: hoursAgo(0.05) }),
    ];
    render(<ActionsScreen />);
    // Focus mode is on (filter "All", not expanded) — without the carve-out
    // this row would sit behind "Show everything".
    expect(screen.getByText('Just saved from an answer')).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('caps the carve-out, so onboarding does not render the whole wall', () => {
    // generateStarterPlan emits SEVEN actions inserted in one batch, so
    // without a cap a brand-new account spent its first 24 hours looking at
    // the entire plan in the view that exists to prevent exactly that.
    h.actions = Array.from({ length: 7 }, (_, i) =>
      action({ id: `s${i}`, title: `Starter step ${i}`, created_at: hoursAgo(0.05) })
    );
    render(<ActionsScreen />);
    const shown = Array.from({ length: 7 }, (_, i) =>
      screen.queryByText(`Starter step ${i}`)
    ).filter(Boolean);
    expect(shown.length).toBeLessThanOrEqual(5); // next 3 + at most 2 fresh
    expect(screen.getByText(/Show everything \(\d+ more\)/)).toBeTruthy();
  });

  it('never offers "Show everything (0 more)"', () => {
    // A live button that does nothing: the toggle keyed on list length while
    // its label counted what was hidden, which the carve-out could zero out.
    h.actions = Array.from({ length: 4 }, (_, i) =>
      action({ id: `s${i}`, title: `Step ${i}`, created_at: hoursAgo(0.05) })
    );
    render(<ActionsScreen />);
    expect(screen.queryByText(/\(0 more\)/)).toBeNull();
  });

  it('does not surface a brand-new step the parent cannot act on yet', () => {
    // The focus view has never shown a locked step; the carve-out must not
    // start, or "your next steps" includes one that is not yet a step.
    h.actions = [
      ...filler(4),
      action({ id: 'gate', title: 'Gate', status: 'not_started', created_at: hoursAgo(300) }),
      action({
        id: 'fresh',
        title: 'Blocked but brand new',
        priority: 'low',
        depends_on: 'gate',
        created_at: hoursAgo(0.05),
      }),
    ];
    render(<ActionsScreen />);
    expect(screen.queryByText('Blocked but brand new')).toBeNull();
  });

  it('still collapses the old ones, so the focus view stays a focus view', () => {
    h.actions = [
      ...filler(6),
      action({ id: 'fresh', title: 'Just saved from an answer', priority: 'low', created_at: hoursAgo(0.05) }),
    ];
    render(<ActionsScreen />);
    expect(screen.getByText('Just saved from an answer')).toBeTruthy();
    expect(screen.queryByText('Older step 5')).toBeNull();
    expect(screen.getByText(/Show everything/)).toBeTruthy();
  });
});

// ─── Marking a step in progress or done, from the list ──────────────────────

describe('the status control on a card', () => {
  /**
   * What this replaces: a 28pt circle that CYCLED To Do → In Progress → Done.
   * Done was two taps from To Do, the tap target was well under the 44 this
   * repo sets as its own floor, and its label ("Change status from To Do") said
   * nothing about where a tap would land.
   */
  it('offers all three states directly, so Done is one tap from To Do', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText(/^Ask the Regional Center.*Mark as Done$/));
    expect(h.updateStatus).toHaveBeenCalledWith('a1', 'completed');
  });

  it('goes to In Progress in one tap too', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText(/Mark as In Progress$/));
    expect(h.updateStatus).toHaveBeenCalledWith('a1', 'in_progress');
  });

  it('announces the current state as selected, and does not re-write it', () => {
    h.actions = [action({ status: 'in_progress' })];
    render(<ActionsScreen />);
    const current = screen.getByLabelText(/In Progress — current status$/);
    expect(current.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(current);
    expect(h.updateStatus).not.toHaveBeenCalled();
  });

  it('names the step it belongs to, so a screen reader in a list knows which', () => {
    h.actions = [action(), action({ id: 'a2', title: 'Second step' })];
    render(<ActionsScreen />);
    expect(screen.getByLabelText('Second step: Mark as Done')).toBeTruthy();
  });

  it('refuses to complete a step that is locked behind an unfinished one', () => {
    // The card's old circle checked the dependency lock and the swipe buttons
    // did not — so a step drawn with a padlock could still be swiped to Done.
    // Both paths go through one guard now, and the control is far easier to hit.
    h.actions = [
      action({ id: 'gate', title: 'Gate step', status: 'not_started' }),
      action({ id: 'blocked', title: 'Blocked step', depends_on: 'gate' }),
    ];
    render(<ActionsScreen />);
    // The focus view never shows a locked step, so open the full list first.
    fireEvent.click(screen.getByText(/Show everything/));
    fireEvent.click(screen.getByLabelText('Blocked step: Mark as Done'));
    expect(h.updateStatus).not.toHaveBeenCalled();
  });

  it('still lets an unlocked step through', () => {
    h.actions = [
      action({ id: 'gate', title: 'Gate step', status: 'completed' }),
      action({ id: 'open', title: 'Open step', depends_on: 'gate' }),
    ];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Open step: Mark as Done'));
    expect(h.updateStatus).toHaveBeenCalledWith('open', 'completed');
  });
});

// ─── Choosing a priority from the list ─────────────────────────────────────

describe('the priority picker on a card', () => {
  it('is collapsed until the badge is tapped', () => {
    h.actions = [action({ priority: 'high' })];
    render(<ActionsScreen />);
    expect(screen.queryByLabelText(/Set priority to Urgent$/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/priority High\. Tap to change\.$/));
    expect(screen.getByLabelText(/Set priority to Urgent$/)).toBeTruthy();
  });

  it('writes the chosen priority and closes', () => {
    h.actions = [action({ priority: 'high' })];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText(/priority High\. Tap to change\.$/));
    fireEvent.click(screen.getByLabelText(/Set priority to Urgent$/));
    expect(h.updateAction).toHaveBeenCalledWith('a1', { priority: 'urgent' });
    expect(screen.queryByLabelText(/Set priority to Urgent$/)).toBeNull();
  });

  it('opens the picker rather than the detail screen', () => {
    // The badge used to sit INSIDE the open-detail press target. A tappable
    // control nested in a touchable that navigates is the shape that opens the
    // wrong screen — on react-native-web the outer handler fires either way.
    h.actions = [action({ priority: 'high' })];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText(/priority High\. Tap to change\.$/));
    expect(navigateCalls).toHaveLength(0);
  });

  it('still reaches the detail screen from "Details"', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText(/^Open details for /));
    expect(navigateCalls).toHaveLength(1);
    expect(navigateCalls[0].args).toEqual(['ActionDetail', { actionId: 'a1' }]);
  });
});

// ─── Sorting and filtering ─────────────────────────────────────────────────

describe('sorting the plan', () => {
  const dated = () => [
    action({ id: 'urgentLate', title: 'Urgent but far off', priority: 'urgent', due_date: '2026-12-01', created_at: hoursAgo(300) }),
    action({ id: 'lowSoon', title: 'Low but due tomorrow', priority: 'low', due_date: '2026-09-04', created_at: hoursAgo(200) }),
  ];

  it('defaults to Suggested — priority first, as the plan has always been', () => {
    h.actions = dated();
    render(<ActionsScreen />);
    const html = document.body.innerHTML;
    expect(html.indexOf('Urgent but far off')).toBeLessThan(html.indexOf('Low but due tomorrow'));
  });

  it('puts the soonest deadline first when sorted by Due date', () => {
    h.actions = dated();
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Sort: Due date'));
    const html = document.body.innerHTML;
    expect(html.indexOf('Low but due tomorrow')).toBeLessThan(html.indexOf('Urgent but far off'));
  });

  it('puts the most recently added first when sorted by Newest', () => {
    h.actions = [
      action({ id: 'old', title: 'Added long ago', created_at: hoursAgo(500) }),
      action({ id: 'new', title: 'Added moments ago', created_at: hoursAgo(0.1) }),
    ];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Sort: Newest'));
    const html = document.body.innerHTML;
    expect(html.indexOf('Added moments ago')).toBeLessThan(html.indexOf('Added long ago'));
  });

  it('reverses under Oldest', () => {
    h.actions = [
      action({ id: 'old', title: 'Added long ago', created_at: hoursAgo(500) }),
      action({ id: 'new', title: 'Added moments ago', created_at: hoursAgo(0.1) }),
    ];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Sort: Oldest'));
    const html = document.body.innerHTML;
    expect(html.indexOf('Added long ago')).toBeLessThan(html.indexOf('Added moments ago'));
  });

  it('shows the whole list once a sort is chosen, not the next 3', () => {
    // "Sort by due date" that still shows three of eight steps, in an order
    // the parent did not choose, reads as the sort being broken.
    h.actions = Array.from({ length: 8 }, (_, i) =>
      action({ id: `s${i}`, title: `Step ${i}`, created_at: hoursAgo(100 + i) })
    );
    render(<ActionsScreen />);
    expect(screen.queryByText('Step 7')).toBeNull(); // focus view, next 3 only
    fireEvent.click(screen.getByLabelText('Sort: Due date'));
    expect(screen.getByText('Step 7')).toBeTruthy();
    expect(screen.queryByText(/Show everything/)).toBeNull();
  });
});

describe('filtering the plan', () => {
  const mixed = () => [
    action({ id: 'u', title: 'Urgent one', priority: 'urgent', created_at: hoursAgo(100) }),
    action({ id: 'l', title: 'Low one', priority: 'low', created_at: hoursAgo(101) }),
  ];

  it('opens the filter sheet from the Filters button', () => {
    h.actions = mixed();
    render(<ActionsScreen />);
    expect(screen.queryByText('Deadline')).toBeNull();
    fireEvent.click(screen.getByLabelText('Filters'));
    expect(screen.getByText('Deadline')).toBeTruthy();
    expect(screen.getByText('Date added')).toBeTruthy();
  });

  it('narrows the list to the chosen priority and counts the filter', () => {
    h.actions = mixed();
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Filters'));
    fireEvent.click(screen.getByLabelText('Filters: Urgent'));
    fireEvent.click(screen.getByLabelText(/^Close filters$/));
    expect(screen.getByText('Urgent one')).toBeTruthy();
    expect(screen.queryByText('Low one')).toBeNull();
    expect(screen.getByLabelText('Filters — 1')).toBeTruthy();
  });

  it('says "no steps match" rather than "no actions yet" when a filter empties the list', () => {
    // Sending a parent with 27 steps to "ask the Navigator and save some" —
    // because they filtered to Urgent — reads as the app losing their work.
    h.actions = [action({ id: 'l', title: 'Low one', priority: 'low' })];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Filters'));
    fireEvent.click(screen.getByLabelText('Filters: Urgent'));
    fireEvent.click(screen.getByLabelText(/^Close filters$/));
    expect(screen.getByText('No steps match these filters')).toBeTruthy();
    expect(screen.queryByText('No actions yet')).toBeNull();
  });

  it('clears back to the whole plan', () => {
    h.actions = mixed();
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Filters'));
    fireEvent.click(screen.getByLabelText('Filters: Urgent'));
    fireEvent.click(screen.getByLabelText('Clear all'));
    fireEvent.click(screen.getByLabelText(/^Close filters$/));
    expect(screen.getByText('Low one')).toBeTruthy();
    expect(screen.getByLabelText('Filters')).toBeTruthy();
  });
});

// ─── Reachability ──────────────────────────────────────────────────────────

describe('every control in the chrome can be reached by name', () => {
  it('labels the status pills, which carried no role or label at all', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    for (const label of ['All', 'To Do', 'In Progress', 'Done', 'Dismissed']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('labels every sort option', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    for (const label of ['Suggested', 'Due date', 'Priority', 'Newest', 'Oldest']) {
      expect(screen.getByLabelText(`Sort: ${label}`)).toBeTruthy();
    }
  });

  it('marks the selected sort and status, so a screen reader knows the view', () => {
    h.actions = [action()];
    render(<ActionsScreen />);
    // aria-PRESSED, not aria-selected: react-native-web 0.19 drops the legacy
    // accessibilityState object entirely, and these are toggle buttons.
    expect(screen.getByLabelText('Sort: Suggested').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Sort: Newest').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByLabelText('All').getAttribute('aria-pressed')).toBe('true');
  });
});

// ─── What an adversarial review found, pinned ──────────────────────────────

describe('the card and the Overdue filter agree about "overdue"', () => {
  /**
   * The card said `new Date(due_date) < new Date()`, which parses a Postgres
   * `date` as UTC midnight — 17:00 the previous evening in California. The
   * filter reads the local calendar day. So a card badged "⚠️ Overdue"
   * vanished when the parent tapped Filters → Overdue, and the plan said
   * "No steps match these filters".
   */
  const dueToday = () => {
    const d = new Date(NOON);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return action({ id: 'today', title: 'Due today step', due_date: iso });
  };

  it('does not badge a step due TODAY as overdue', () => {
    h.actions = [dueToday()];
    render(<ActionsScreen />);
    expect(screen.queryByText(/Overdue/)).toBeNull();
  });

  it('anything the card badges Overdue survives the Overdue filter', () => {
    h.actions = [dueToday(), action({ id: 'late', title: 'Genuinely late step', due_date: '2026-08-01' })];
    render(<ActionsScreen />);
    expect(screen.getByText(/Overdue: Aug 1/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Filters'));
    fireEvent.click(screen.getByLabelText('Deadline: Overdue'));
    fireEvent.click(screen.getByLabelText(/^Close filters$/));

    expect(screen.getByText('Genuinely late step')).toBeTruthy();
    expect(screen.queryByText('Due today step')).toBeNull();
    expect(screen.queryByText('No steps match these filters')).toBeNull();
  });
});

describe('the focus toggle goes both ways', () => {
  it('comes back after expanding a small plan', () => {
    // 2 open + 1 done. Collapsed the toggle asked `hiddenCount > 0` (true);
    // expanded it asked `sortedActions.length > 3` (false) and vanished —
    // a one-way door out of the focus view for the rest of the session.
    h.actions = [
      action({ id: 'o1', title: 'Open one', created_at: hoursAgo(10) }),
      action({ id: 'o2', title: 'Open two', created_at: hoursAgo(11) }),
      action({ id: 'd1', title: 'Finished one', status: 'completed', created_at: hoursAgo(12) }),
    ];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByText(/Show everything/));
    expect(screen.getByText('Finished one')).toBeTruthy();
    expect(screen.getByText(/Focus on my next 3/)).toBeTruthy();

    fireEvent.click(screen.getByText(/Focus on my next 3/));
    expect(screen.queryByText('Finished one')).toBeNull();
  });
});

describe('a parent who has finished everything', () => {
  it('is not told the plan is empty', () => {
    // "No actions yet — ask the Navigator and save some steps" rendered
    // directly above "Show everything (5 more)".
    h.actions = Array.from({ length: 5 }, (_, i) =>
      action({ id: `c${i}`, title: `Finished ${i}`, status: 'completed', created_at: hoursAgo(50 + i) })
    );
    render(<ActionsScreen />);
    expect(screen.queryByText('No actions yet')).toBeNull();
    expect(screen.getByText('Nothing open right now')).toBeTruthy();
    // Two ways out, worded differently — the empty state's own button and the
    // toggle beneath it. They both said "Show everything" for one build.
    expect(screen.getByText('See my whole plan')).toBeTruthy();
    expect(screen.getByText(/Show everything \(5 more\)/)).toBeTruthy();
  });

  it('still gets the real empty state when the plan really is empty', () => {
    h.actions = [];
    render(<ActionsScreen />);
    expect(screen.getByText('No actions yet')).toBeTruthy();
  });
});

describe('a dismissed step says so out loud', () => {
  it('names the status in text, not only as opacity and a strikethrough', () => {
    // Both remaining cues were purely visual, and the strikethrough is shared
    // with "completed" — so a screen reader could not tell the two apart.
    h.actions = [
      action({ id: 'x', title: 'Dropped step', status: 'dismissed', dismissed_reason: 'school handled it' }),
    ];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByText('See my whole plan'));
    expect(screen.getByText(/^Dismissed — school handled it$/)).toBeTruthy();
  });

  it('says Dismissed even with no reason recorded', () => {
    h.actions = [action({ id: 'x', title: 'Dropped step', status: 'dismissed' })];
    render(<ActionsScreen />);
    fireEvent.click(screen.getByText('See my whole plan'));
    // Two: the status filter pill, which is always there, and the card's own
    // tag, which is what this pins. Drop the tag and this falls to one.
    expect(screen.getAllByText('Dismissed')).toHaveLength(2);
  });
});

describe('the filter sheet promises the count it will deliver', () => {
  it('offers the focus view count, not the whole plan, when no filter is set', () => {
    h.actions = Array.from({ length: 8 }, (_, i) =>
      action({ id: `s${i}`, title: `Step ${i}`, created_at: hoursAgo(100 + i) })
    );
    render(<ActionsScreen />);
    fireEvent.click(screen.getByLabelText('Filters'));
    // It read "Show 8 steps" and closing it rendered 3.
    expect(screen.getByLabelText('Show 3 steps')).toBeTruthy();
  });
});
