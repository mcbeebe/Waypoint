/**
 * "Loading" must cover the family's own load (E3). The Premium gate and the
 * inline guard both fail open while entitlements resolve, so a paying family
 * is never shown a paywall during startup. The hook used to resolve Free the
 * moment it ran with no family id — before the family had loaded — and then
 * stay "not loading" while the real lookup ran, so a paying family who
 * tapped a Premium action in that window was sent to Pricing. It also let
 * whichever lookup finished last win, even one for an older id.
 *
 * The paywall flag is forced on here: it is off in the shipped build while
 * the owner dogfoods, which is the only reason this never reached a family.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  tables: [] as string[],
  queries: [] as { familyId: string; resolve: (v: unknown) => void }[],
}));

vi.mock('@/lib/flags', () => ({ FLAGS: { paywall: true } }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      h.tables.push(table);
      return {
        select: () => ({
          eq: (_col: string, familyId: string) =>
            new Promise((resolve) => h.queries.push({ familyId, resolve })),
        }),
      };
    },
  },
}));

import { useEntitlement } from './useEntitlement';

const ACTIVE = { data: [{ sponsor_type: 'self', status: 'active', period_start: '2000-01-01', period_end: null }], error: null };
const NONE = { data: [], error: null };

type Props = { id: string | undefined; familyLoading: boolean };
const mount = (initial: Props) =>
  renderHook(({ id, familyLoading }: Props) => useEntitlement(id, familyLoading), { initialProps: initial });

describe('useEntitlement — loading spans the family load', () => {
  beforeEach(() => {
    h.tables = [];
    h.queries = [];
  });

  it('stays loading, not Free, while the family is still loading', async () => {
    const { result } = mount({ id: undefined, familyLoading: true });
    await act(async () => {});
    expect(result.current.loading).toBe(true);
    expect(h.queries).toHaveLength(0);
  });

  it('stays loading from the moment the id arrives until the lookup answers', async () => {
    const { result, rerender } = mount({ id: undefined, familyLoading: true });
    await act(async () => {});
    rerender({ id: 'fam1', familyLoading: false });
    // Loading on the very render the id arrives — no frame of Free.
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(h.queries).toHaveLength(1));
    expect(h.tables).toEqual(['entitlements']);
    expect(h.queries[0].familyId).toBe('fam1');
    expect(result.current.loading).toBe(true);

    await act(async () => h.queries[0].resolve(ACTIVE));
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(true);
  });

  it('a new family (created after an empty load) is loading until its own lookup answers', async () => {
    const { result, rerender } = mount({ id: undefined, familyLoading: false });
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(false);

    rerender({ id: 'fam1', familyLoading: false });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(h.queries).toHaveLength(1));
    await act(async () => h.queries[0].resolve(ACTIVE));
    expect(result.current.isPremium).toBe(true);
  });

  it('resolves Free when the family finished loading and there is none', async () => {
    const { result, rerender } = mount({ id: undefined, familyLoading: true });
    await act(async () => {});
    rerender({ id: undefined, familyLoading: false });
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(h.queries).toHaveLength(0);
  });

  it('still fails free on a lookup error', async () => {
    const { result } = mount({ id: 'fam1', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(1));
    await act(async () => h.queries[0].resolve({ data: null, error: { message: 'offline' } }));
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(false);
  });

  it('a family reload with the same id does not reopen loading or re-query', async () => {
    const { result, rerender } = mount({ id: 'fam1', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(1));
    await act(async () => h.queries[0].resolve(ACTIVE));
    rerender({ id: 'fam1', familyLoading: true });
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(true);
    rerender({ id: 'fam1', familyLoading: false });
    await act(async () => {});
    expect(h.queries).toHaveLength(1);
  });
});

describe('useEntitlement — only the newest lookup answers', () => {
  beforeEach(() => {
    h.tables = [];
    h.queries = [];
  });

  it("an older family's late answer neither ends loading nor sets the tier", async () => {
    const { result, rerender } = mount({ id: 'famA', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(1));
    rerender({ id: 'famB', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(2));

    // A's lookup lands while B's is still in flight.
    await act(async () => h.queries[0].resolve(ACTIVE));
    expect(result.current.loading).toBe(true);

    await act(async () => h.queries[1].resolve(NONE));
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(false);
  });

  it('a refetch after purchase wins over the slower startup lookup', async () => {
    const { result } = mount({ id: 'fam1', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(1));

    let done: Promise<void> | undefined;
    act(() => {
      done = result.current.refetch();
    });
    await waitFor(() => expect(h.queries).toHaveLength(2));
    // The refetch (after the purchase) answers Premium first…
    await act(async () => {
      h.queries[1].resolve(ACTIVE);
      await done;
    });
    expect(result.current.isPremium).toBe(true);
    // …and the startup lookup, from before the purchase, lands last.
    await act(async () => h.queries[0].resolve(NONE));
    expect(result.current.isPremium).toBe(true);
  });
});
