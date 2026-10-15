/**
 * The "Nothing to answer" write (065). Only an incoming row can be settled —
 * an outgoing letter never is — an existing settled_at is never moved, and it
 * reports false when the row is not in the asked-for state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  /** One response per awaited query, in order. */
  responses: [] as { data: unknown; error: { message: string } | null }[],
  throws: false,
}));

vi.mock('@/lib/supabase', () => {
  const next = () => Promise.resolve(h.responses.shift() ?? { data: null, error: null });
  const chain: any = {
    update: (v: unknown) => (h.calls.push(['update', v]), chain),
    eq: (c: string, v: unknown) => (h.calls.push(['eq', c, v]), chain),
    is: (c: string, v: unknown) => (h.calls.push(['is', c, v]), chain),
    not: (c: string, op: string, v: unknown) => (h.calls.push(['not', c, op, v]), chain),
    select: (c: string) => (h.calls.push(['select', c]), chain),
    maybeSingle: () => (h.calls.push(['maybeSingle']), next()),
    then: (resolve: (v: unknown) => unknown) => next().then(resolve),
  };
  return {
    supabase: {
      from: (t: string) => {
        if (h.throws) throw new Error('offline');
        h.calls.push(['from', t]);
        return chain;
      },
    },
  };
});

import { setReplySettled } from './useCommunications';

beforeEach(() => {
  h.calls = [];
  h.responses = [];
  h.throws = false;
});

describe('setReplySettled', () => {
  it('stamps settled_at on that incoming row only, and only if it was unsettled', async () => {
    h.responses = [{ data: [{ id: 'r1' }], error: null }];
    expect(await setReplySettled('r1', true)).toBe(true);
    const update = h.calls.find((c) => c[0] === 'update')![1] as { settled_at: string };
    expect(Object.keys(update)).toEqual(['settled_at']);
    expect(Number.isNaN(Date.parse(update.settled_at))).toBe(false);
    expect(h.calls).toContainEqual(['eq', 'id', 'r1']);
    expect(h.calls).toContainEqual(['eq', 'direction', 'incoming']);
    expect(h.calls).toContainEqual(['is', 'settled_at', null]);
  });

  it('an already-settled row is left as it was and counts as done (an import’s stamp never moves)', async () => {
    h.responses = [{ data: [], error: null }, { data: { id: 'r1' }, error: null }];
    expect(await setReplySettled('r1', true)).toBe(true);
    expect(h.calls.filter((c) => c[0] === 'update')).toHaveLength(1);
    expect(h.calls).toContainEqual(['not', 'settled_at', 'is', null]);
  });

  it('a row that is not ours to see is a failure, not a success', async () => {
    h.responses = [{ data: [], error: null }, { data: null, error: null }];
    expect(await setReplySettled('r1', true)).toBe(false);
  });

  it('"needs an answer after all" clears it', async () => {
    h.responses = [{ data: [{ id: 'r1' }], error: null }];
    expect(await setReplySettled('r1', false)).toBe(true);
    expect(h.calls.find((c) => c[0] === 'update')![1]).toEqual({ settled_at: null });
  });

  it('is false when the write failed (e.g. before 065) or the request threw', async () => {
    h.responses = [{ data: null, error: { message: "Could not find the 'settled_at' column" } }];
    expect(await setReplySettled('r1', true)).toBe(false);
    h.throws = true;
    expect(await setReplySettled('r1', true)).toBe(false);
  });
});
