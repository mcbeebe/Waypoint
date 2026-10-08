/**
 * Read state across the two screens that each hold the trail (062): a reply
 * opened in the paper trail stays read on Home even when Home's refetch beats
 * the write to the database — the "quick Back" race.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  rows: [] as any[],
  updates: [] as unknown[],
  writeFails: false,
}));

vi.mock('@/lib/supabase', () => {
  const select = () => {
    const chain: any = {
      eq: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: h.rows.map((r) => ({ ...r })), error: null }),
    };
    return chain;
  };
  const update = (v: unknown) => {
    h.updates.push(v);
    // The write is still in flight: the database keeps read_at null.
    const chain: any = {
      eq: () => chain,
      is: () => chain,
      select: () => chain,
      then: (r: any) => Promise.resolve(h.writeFails ? { data: null, error: { message: 'offline' } } : { data: [{ id: 'r1' }], error: null }).then(r),
    };
    return chain;
  };
  return { supabase: { from: () => ({ select, update }) } };
});

import { useCommunications, resetSessionReads } from './useCommunications';

const reply = (over: Record<string, unknown> = {}) => ({
  id: 'r1', family_id: 'fam1', direction: 'incoming', kind: 'email', subject: 'Re: IPP',
  gmail_thread_id: 't1', occurred_at: '2026-10-08T17:01:09Z', sent_at: '2026-10-08T17:01:09Z',
  read_at: null, ...over,
});

beforeEach(() => {
  resetSessionReads();
  h.updates = [];
  h.writeFails = false;
  h.rows = [reply()];
});

describe('useCommunications read state', () => {
  it("a reply opened on one screen stays read on another screen's refetch", async () => {
    const trail = renderHook(() => useCommunications('fam1'));
    const home = renderHook(() => useCommunications('fam1'));
    await waitFor(() => expect(trail.result.current.communications).toHaveLength(1));
    await waitFor(() => expect(home.result.current.communications).toHaveLength(1));

    await act(async () => {
      await trail.result.current.markRead('r1');
    });
    expect(trail.result.current.communications[0].read_at).toBeTruthy();
    expect(h.updates).toHaveLength(1);

    // Home comes back into focus and re-reads; the database still says null.
    await act(async () => {
      await home.result.current.refetch();
    });
    expect(home.result.current.communications[0].read_at).toBeTruthy();
  });

  it('a write that failed is not remembered — the reply is new again on the next load', async () => {
    h.writeFails = true;
    const trail = renderHook(() => useCommunications('fam1'));
    await waitFor(() => expect(trail.result.current.communications).toHaveLength(1));
    await act(async () => {
      expect(await trail.result.current.markRead('r1')).toBe(false);
    });
    const home = renderHook(() => useCommunications('fam1'));
    await waitFor(() => expect(home.result.current.communications).toHaveLength(1));
    expect(home.result.current.communications[0].read_at).toBeNull();
  });

  it('opening it again writes nothing; a pre-062 row is never written', async () => {
    const trail = renderHook(() => useCommunications('fam1'));
    await waitFor(() => expect(trail.result.current.communications).toHaveLength(1));
    await act(async () => {
      await trail.result.current.markRead('r1');
      await trail.result.current.markRead('r1');
    });
    expect(h.updates).toHaveLength(1);

    resetSessionReads();
    h.updates = [];
    const { read_at: _drop, ...pre062 } = reply({ id: 'r2' });
    void _drop;
    h.rows = [pre062];
    const old = renderHook(() => useCommunications('fam1'));
    await waitFor(() => expect(old.result.current.communications).toHaveLength(1));
    await act(async () => {
      expect(await old.result.current.markRead('r2')).toBe(false);
    });
    expect(h.updates).toHaveLength(0);
    expect('read_at' in old.result.current.communications[0]).toBe(false);
  });
});
