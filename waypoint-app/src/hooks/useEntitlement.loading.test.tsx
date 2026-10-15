/**
 * "Loading" must cover the family's own load (E3). The Premium gate and the
 * inline guard both fail open while entitlements resolve, so a paying family
 * is never shown a paywall during startup. The hook used to resolve Free the
 * moment it ran with no family id — before the family had loaded — and then
 * stay "not loading" while the real lookup ran, so a paying family who
 * tapped a Premium action in that window was sent to Pricing.
 *
 * The paywall flag is forced on here: it is off in the shipped build while
 * the owner dogfoods, which is the only reason this never reached a family.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  queries: [] as { familyId: string; resolve: (v: unknown) => void; reject: (e: unknown) => void }[],
}));

vi.mock('@/lib/flags', () => ({ FLAGS: { paywall: true } }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_col: string, familyId: string) =>
          new Promise((resolve, reject) => h.queries.push({ familyId, resolve, reject })),
      }),
    }),
  },
}));

import { useEntitlement } from './useEntitlement';

const ACTIVE = [{ sponsor_type: 'self', status: 'active', period_start: '2000-01-01', period_end: null }];

type Props = { id: string | undefined; familyLoading: boolean };
const mount = (initial: Props) =>
  renderHook(({ id, familyLoading }: Props) => useEntitlement(id, familyLoading), { initialProps: initial });

describe('useEntitlement — loading spans the family load', () => {
  beforeEach(() => {
    h.queries = [];
  });

  it('stays loading, not Free, while the family is still loading', async () => {
    const { result } = mount({ id: undefined, familyLoading: true });
    // Let the mount effect run.
    await act(async () => {});
    expect(result.current.loading).toBe(true);
    expect(h.queries).toHaveLength(0);
  });

  it('stays loading from the moment the id arrives until the lookup answers', async () => {
    const { result, rerender } = mount({ id: undefined, familyLoading: true });
    await act(async () => {});
    rerender({ id: 'fam1', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(1));
    // The window the bug lived in: id known, query in flight.
    expect(result.current.loading).toBe(true);

    await act(async () => h.queries[0].resolve({ data: ACTIVE, error: null }));
    expect(result.current.loading).toBe(false);
    expect(result.current.isPremium).toBe(true);
  });

  it('re-enters loading when it first ran with the family already settled to none', async () => {
    // Without the familyLoading hint (legacy call shape), an id-less first run
    // resolves Free — but a later id must still reopen the loading window.
    const { result, rerender } = mount({ id: undefined, familyLoading: false });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPremium).toBe(false);

    rerender({ id: 'fam1', familyLoading: false });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(h.queries).toHaveLength(1));
    await act(async () => h.queries[0].resolve({ data: ACTIVE, error: null }));
    expect(result.current.isPremium).toBe(true);
  });

  it('resolves Free when the family finished loading and there is none', async () => {
    const { result, rerender } = mount({ id: undefined, familyLoading: true });
    await act(async () => {});
    rerender({ id: undefined, familyLoading: false });
    await waitFor(() => expect(result.current.loading).toBe(false));
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

  it('a refetch after purchase updates the tier without a loading flash', async () => {
    const { result } = mount({ id: 'fam1', familyLoading: false });
    await waitFor(() => expect(h.queries).toHaveLength(1));
    await act(async () => h.queries[0].resolve({ data: [], error: null }));
    expect(result.current.isPremium).toBe(false);

    let done: Promise<void> | undefined;
    act(() => {
      done = result.current.refetch();
    });
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(h.queries).toHaveLength(2));
    await act(async () => {
      h.queries[1].resolve({ data: ACTIVE, error: null });
      await done;
    });
    expect(result.current.isPremium).toBe(true);
  });
});
