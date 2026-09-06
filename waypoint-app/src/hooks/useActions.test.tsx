/**
 * `useActions`, rendered — the query loop and the reopen timestamps.
 *
 * ## The loop
 *
 * `ActionsScreen` built its status filter inline:
 *
 *     const statusFilter = activeFilter === 'all' ? undefined : [activeFilter];
 *
 * A fresh array literal on every render. That array was in `fetchActions`'s
 * `useCallback` dependencies, `fetchActions` was in the load effect's, and the
 * effect calls `setActions` — which re-renders the caller, which builds another
 * fresh array. Selecting **To Do**, **In Progress**, **Done** or **Dismissed**
 * put the Action Plan into an unbounded Supabase query loop on every phone, and
 * the `'all'` branch's stable `undefined` is the only reason the default view
 * was quiet. Measured against this hook before the fix: **2 queries with no
 * filter, 54,554 in one second with one.**
 *
 * The mocked hook in the screen tests could not see it, so the regression lives
 * here, against the real hook, and counts queries rather than asserting on
 * internals.
 *
 * ## The timestamps
 *
 * `updateStatus` stamped `completed_at` on completion and never cleared it, so
 * a reopened step still carried the date it was finished — visible in the
 * detail screen's Timeline, and averaged into `action_stats`. Survivable while
 * reopening meant a deliberate swipe; not once the status control is one tap.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  selects: 0,
  updates: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
  /** Every `.in(column, values)` the hook asked for — so a hook that stopped
   *  looping by dropping the filter fails instead of passing. */
  ins: [] as { column: string; values: unknown[] }[],
}));

vi.mock('@/lib/supabase', () => {
  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    select: () => {
      h.selects++;
      return builder;
    },
    insert: () => builder,
    update: (data: Record<string, unknown>) => {
      h.updates.push(data);
      return builder;
    },
    eq: () => builder,
    is: () => builder,
    in: (column: string, values: unknown[]) => {
      h.ins.push({ column, values });
      return builder;
    },
    limit: () => builder,
    order: () => builder,
    single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
    // Thenable, so `await query` resolves like a PostgREST builder does.
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: [...h.rows], error: null }).then(res),
  });
  return { supabase: { from: () => builder } };
});

vi.mock('@/lib/netRetry', () => ({
  retryQuery: (fn: () => unknown) => Promise.resolve(fn()),
  friendlyErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { useActions } from './useActions';

/**
 * Mirrors `ActionPlanBody` exactly: the filter value is built in the SAME
 * component that renders from the hook's state. Building it in a parent that
 * never re-renders hides the bug, which is how it survived this long.
 */
function Probe({ filtered, memoized }: { filtered: boolean; memoized: boolean }) {
  const inline = filtered ? ['not_started'] : undefined;
  const memo = React.useMemo(
    () => (filtered ? ['not_started'] : undefined),
    [filtered]
  );
  const { actions } = useActions({
    familyId: 'fam1',
    statusFilter: (memoized ? memo : inline) as never,
  });
  return <span>{actions.length}</span>;
}

/** Let the effects settle — a loop keeps firing well past the first tick. */
async function settle(ms = 400) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

beforeEach(() => {
  h.selects = 0;
  h.updates.length = 0;
  h.ins.length = 0;
  h.rows = [];
});

describe('selecting a status filter does not loop', () => {
  it('queries a bounded number of times with no filter (the control)', async () => {
    render(<Probe filtered={false} memoized={false} />);
    await settle();
    // One actions fetch + one stats fetch, and nothing further.
    expect(h.selects).toBeLessThan(10);
  });

  it('queries a bounded number of times when the caller passes a FRESH array each render', async () => {
    // This is the exact shape that produced 54,554 queries in one second.
    render(<Probe filtered memoized={false} />);
    await settle();
    expect(h.selects).toBeLessThan(10);
  });

  it('is no worse when the caller memoizes, so both defences hold', async () => {
    render(<Probe filtered memoized />);
    await settle();
    expect(h.selects).toBeLessThan(10);
  });

  it('still applies the filter it was given', async () => {
    // A hook that stopped looping by IGNORING the filter would pass every
    // count assertion above and be badly broken. This asserts on the query the
    // hook actually built — deleting the `.in()` from useActions fails here,
    // which the earlier version of this test did not.
    h.rows = [{ id: 'a1', status: 'not_started' }];
    render(<Probe filtered memoized={false} />);
    await settle(150);
    expect(await screen.findByText('1')).toBeTruthy();
    expect(h.ins).toContainEqual({ column: 'status', values: ['not_started'] });
  });

  it('asks for no status filter at all when none was given', async () => {
    render(<Probe filtered={false} memoized={false} />);
    await settle(150);
    expect(h.ins.filter((i) => i.column === 'status')).toEqual([]);
  });

  it('passes every status through, in a stable order, for a multi-status filter', async () => {
    // The fix keys the fetch on a sorted, joined string. If that round-trip
    // ever dropped or reordered a status the query would silently narrow.
    function Multi() {
      const { actions } = useActions({
        familyId: 'fam1',
        statusFilter: ['in_progress', 'not_started'] as never,
      });
      return <span>{actions.length}</span>;
    }
    render(<Multi />);
    await settle(150);
    expect(h.ins).toContainEqual({ column: 'status', values: ['in_progress', 'not_started'] });
  });
});

// ─── Reopening a step ───────────────────────────────────────────────────────

function StatusProbe({ onReady }: { onReady: (fn: ReturnType<typeof useActions>) => void }) {
  const api = useActions({ familyId: 'fam1' });
  React.useEffect(() => {
    onReady(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.updateStatus]);
  return null;
}

async function statusApi() {
  let api!: ReturnType<typeof useActions>;
  render(<StatusProbe onReady={(a) => { api = a; }} />);
  await settle(100);
  return api;
}

describe('the terminal timestamps are set OR cleared, never just set', () => {
  it('stamps completed_at when a step is finished', async () => {
    const api = await statusApi();
    await act(async () => { await api.updateStatus('a1', 'completed'); });
    const patch = h.updates.at(-1)!;
    expect(patch.status).toBe('completed');
    expect(patch.completed_at).toEqual(expect.any(String));
  });

  it('clears completed_at when the step is reopened', async () => {
    // The bug: a reopened step kept the date it was finished, so the detail
    // screen's Timeline showed a live step as "Completed Aug 20" and
    // action_stats averaged over rows that were not complete.
    const api = await statusApi();
    await act(async () => { await api.updateStatus('a1', 'not_started'); });
    const patch = h.updates.at(-1)!;
    expect(patch.status).toBe('not_started');
    expect(patch.completed_at).toBeNull();
    expect(patch.dismissed_at).toBeNull();
    expect(patch.dismissed_reason).toBeNull();
  });

  it('clears completed_at when a finished step is dismissed instead', async () => {
    const api = await statusApi();
    await act(async () => { await api.updateStatus('a1', 'dismissed', 'not needed'); });
    const patch = h.updates.at(-1)!;
    expect(patch.dismissed_at).toEqual(expect.any(String));
    expect(patch.dismissed_reason).toBe('not needed');
    expect(patch.completed_at).toBeNull();
  });

  it('clears a stale dismissal when a dismissed step is completed', async () => {
    const api = await statusApi();
    await act(async () => { await api.updateStatus('a1', 'completed'); });
    const patch = h.updates.at(-1)!;
    expect(patch.dismissed_at).toBeNull();
    expect(patch.dismissed_reason).toBeNull();
  });

  it('moving straight to In Progress clears both, so no terminal date survives', async () => {
    const api = await statusApi();
    await act(async () => { await api.updateStatus('a1', 'in_progress'); });
    const patch = h.updates.at(-1)!;
    expect(patch.completed_at).toBeNull();
    expect(patch.dismissed_at).toBeNull();
  });
});

// ─── A row that leaves the filtered view ────────────────────────────────────

function FilteredProbe() {
  const statusFilter = React.useMemo(() => ['not_started'] as never, []);
  const api = useActions({ familyId: 'fam1', statusFilter });
  React.useEffect(() => {
    filteredApi = api;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.updateStatus, api.actions]);
  return <span>{api.actions.map((a) => `${a.id}:${a.status}`).join(',')}</span>;
}
let filteredApi: ReturnType<typeof useActions>;

describe('an optimistic status change respects the active filter', () => {
  it('drops a step that no longer matches the filter it is being shown under', async () => {
    // The pill says "To Do"; completing the step left it sitting in that list
    // with "Done" selected on the card underneath. The refetch loop used to
    // paper over it by overwriting local state thousands of times a second.
    h.rows = [{ id: 'a1', status: 'not_started', title: 'Step' }];
    render(<FilteredProbe />);
    await settle(200);
    expect(screen.getByText('a1:not_started')).toBeTruthy();

    await act(async () => { await filteredApi.updateStatus('a1', 'completed'); });
    await settle(100);
    expect(screen.queryByText(/a1:/)).toBeNull();
  });

  it('keeps a step whose new status still matches', async () => {
    h.rows = [{ id: 'a1', status: 'not_started', title: 'Step' }];
    render(<FilteredProbe />);
    await settle(200);
    await act(async () => { await filteredApi.updateStatus('a1', 'not_started'); });
    await settle(100);
    expect(screen.getByText('a1:not_started')).toBeTruthy();
  });
});
