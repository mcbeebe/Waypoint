/**
 * The "Nothing to answer" write (065). Only an incoming row can be settled —
 * an outgoing letter never is — and it reports false when nothing changed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  error: null as { message: string } | null,
  matched: [{ id: 'r1' }] as { id: string }[],
  throws: false,
}));

vi.mock('@/lib/supabase', () => {
  const chain: any = {
    update: (v: unknown) => (h.calls.push(['update', v]), chain),
    eq: (c: string, v: unknown) => (h.calls.push(['eq', c, v]), chain),
    is: (c: string, v: unknown) => (h.calls.push(['is', c, v]), chain),
    select: (c: string) => (h.calls.push(['select', c]), chain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: h.error ? null : h.matched, error: h.error }).then(resolve),
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
  h.error = null;
  h.matched = [{ id: 'r1' }];
  h.throws = false;
});

describe('setReplySettled', () => {
  it('stamps settled_at on that incoming row only', async () => {
    expect(await setReplySettled('r1', true)).toBe(true);
    expect(h.calls[0]).toEqual(['from', 'communications']);
    const update = h.calls.find((c) => c[0] === 'update')![1] as { settled_at: string };
    expect(Object.keys(update)).toEqual(['settled_at']);
    expect(Number.isNaN(Date.parse(update.settled_at))).toBe(false);
    expect(h.calls).toContainEqual(['eq', 'id', 'r1']);
    expect(h.calls).toContainEqual(['eq', 'direction', 'incoming']);
    expect(h.calls).toContainEqual(['select', 'id']);
  });

  it('"needs an answer after all" clears it', async () => {
    expect(await setReplySettled('r1', false)).toBe(true);
    expect(h.calls.find((c) => c[0] === 'update')![1]).toEqual({ settled_at: null });
  });

  it('is false when nothing changed, the write failed, or the request threw', async () => {
    h.matched = [];
    expect(await setReplySettled('r1', true)).toBe(false);
    h.matched = [{ id: 'r1' }];
    h.error = { message: "Could not find the 'settled_at' column" };
    expect(await setReplySettled('r1', true)).toBe(false);
    h.error = null;
    h.throws = true;
    expect(await setReplySettled('r1', true)).toBe(false);
  });
});
