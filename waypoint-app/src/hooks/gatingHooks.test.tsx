/**
 * The four hooks everything else waits on.
 *
 * `useAuth` → `useProfile` → `useFamily` resolve in that order before the app
 * renders anything, and `family.id` then gates Home's whole fan-out
 * (useActions, useRequests, useTriage, useCommunications, useDeadlines,
 * useAppointments). `useEntitlement` decides which tier a family is served.
 *
 * All four had NO tests, and `netRetry` — written for exactly this, and adopted
 * by 19 leaf hooks — was wired into none of them. The retry policy was
 * inverted: the leaves recovered from a dropped packet and the spine did not.
 *
 * What these tests pin, in order of how badly it failed:
 *
 *  1. `useAuth` could hang the ENTIRE APP on the splash screen, forever. Its
 *     `getSession().then(...)` had no `.catch`, and `loading` gates
 *     App.tsx's `<LoadingScreen />` with no other exit. One rejected promise —
 *     AsyncStorage, or the token refresh it does over the network — and the
 *     only recovery was force-quitting.
 *  2. `useFamily` threw away the membership read's error. A co-parent whose
 *     lookup blipped became indistinguishable from someone who belongs to no
 *     family, and App.tsx reads that state to route people into "create your
 *     own family" — the one thing a joined co-parent must never be shown.
 *  3. `useProfile` and `useEntitlement` fall back deliberately ('family' and
 *     FREE). Those postures are CORRECT and are unchanged here — these tests
 *     exist to hold them in place while proving a blip no longer triggers them.
 *
 * The retry logic under test is the real `retryQuery`; only its sleep is
 * neutralised, so attempt counting and transient-error detection are genuinely
 * exercised rather than stubbed away.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  /** Queued results per table; each call shifts one. */
  queue: {} as Record<string, Array<{ data: unknown; error: { message: string } | null }>>,
  calls: {} as Record<string, number>,
  /** getSession behaviour: 'ok' | 'reject' | 'transient-then-ok' */
  sessionMode: 'ok' as string,
  sessionCalls: 0,
  user: { id: 'user-1' } as { id: string } | null,
}));

function nextFor(table: string) {
  h.calls[table] = (h.calls[table] ?? 0) + 1;
  const q = h.queue[table];
  if (!q || q.length === 0) return { data: null, error: null };
  return q.length === 1 ? q[0] : q.shift()!;
}

vi.mock('@/lib/supabase', () => {
  const makeBuilder = (table: string) => {
    const b: Record<string, unknown> = {};
    const self = () => b;
    Object.assign(b, {
      select: self,
      eq: self,
      order: self,
      limit: self,
      insert: self,
      update: self,
      is: self,
      in: self,
      maybeSingle: () => Promise.resolve(nextFor(table)),
      single: () => Promise.resolve(nextFor(table)),
      then: (res: (v: unknown) => unknown) => Promise.resolve(nextFor(table)).then(res),
    });
    return b;
  };
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      auth: {
        getUser: () => Promise.resolve({ data: { user: h.user } }),
        getSession: () => {
          h.sessionCalls++;
          if (h.sessionMode === 'reject') {
            return Promise.reject(new Error('Load failed'));
          }
          if (h.sessionMode === 'transient-then-ok' && h.sessionCalls < 2) {
            return Promise.resolve({
              data: { session: null },
              error: { message: 'Failed to fetch' },
            });
          }
          return Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null });
        },
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    },
  };
});

// Real retry logic, instant sleeps — so attempt counting and transient
// detection are genuinely under test, not stubbed.
vi.mock('@/lib/netRetry', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('@/lib/netRetry');
  return {
    ...actual,
    retryQuery: (
      run: Parameters<typeof actual.retryQuery>[0],
      opts?: Parameters<typeof actual.retryQuery>[1]
    ) => actual.retryQuery(run, { ...opts, sleep: () => Promise.resolve() }),
  };
});

vi.mock('@/lib/flags', () => ({ FLAGS: { paywall: true } }));

import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { useFamily } from './useFamily';
import { useEntitlement } from './useEntitlement';

const TRANSIENT = { message: 'Load failed' };

beforeEach(() => {
  h.queue = {};
  h.calls = {};
  h.sessionMode = 'ok';
  h.sessionCalls = 0;
  h.user = { id: 'user-1' };
});

async function mount(ui: React.ReactElement) {
  await act(async () => {
    render(ui);
  });
}

// ─── 1. useAuth: the app-hang ───────────────────────────────────────────────

function AuthProbe() {
  const { loading, session } = useAuth();
  return <span data-testid="s">{loading ? 'LOADING' : session ? 'in' : 'out'}</span>;
}

describe('useAuth always stops loading — the app cannot park on the splash screen', () => {
  it('resolves to signed-out when getSession REJECTS', async () => {
    // The regression: no `.catch` meant loading stayed true forever and
    // App.tsx rendered <LoadingScreen /> with no way out but force-quit.
    h.sessionMode = 'reject';
    await mount(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).not.toBe('LOADING'));
    expect(screen.getByTestId('s').textContent).toBe('out');
  });

  it('retries a transient failure and then restores the session', async () => {
    h.sessionMode = 'transient-then-ok';
    await mount(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('in'));
    // Proves the retry actually ran rather than the first call happening to win.
    expect(h.sessionCalls).toBeGreaterThan(1);
  });

  it('signs in normally when nothing is wrong', async () => {
    await mount(<AuthProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('in'));
    expect(h.sessionCalls).toBe(1);
  });
});

// ─── 2. useFamily: a blip is not the same as "you have no family" ───────────

function FamilyProbe() {
  const { family, loading, error } = useFamily();
  return (
    <span data-testid="s">
      {loading ? 'LOADING' : error ? `ERR:${error}` : family ? `fam:${family.id}` : 'NONE'}
    </span>
  );
}

describe('useFamily retries, and never reports a blip as absence', () => {
  it('retries a transient owner-read and succeeds', async () => {
    h.queue.families = [
      { data: null, error: TRANSIENT },
      { data: { id: 'fam-1' }, error: null },
    ];
    await mount(<FamilyProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('fam:fam-1'));
    expect(h.calls.families).toBe(2);
  });

  it('reports a failed MEMBERSHIP read as an error, not as "no family"', async () => {
    // The co-parent bug: this error was destructured away, so the hook fell
    // through to setFamily(null). App.tsx reads that as "not onboarded" and
    // routes them to create their own family — destroying the share.
    h.queue.families = [{ data: null, error: null }]; // owns none
    h.queue.family_members = [{ data: null, error: { message: 'permission denied' } }];
    await mount(<FamilyProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toMatch(/^ERR:/));
    expect(screen.getByTestId('s').textContent).not.toBe('NONE');
  });

  it('still resolves a genuine co-parent through membership', async () => {
    h.queue.families = [
      { data: null, error: null }, // owns none
      { data: { id: 'shared-9' }, error: null }, // the shared family
    ];
    h.queue.family_members = [{ data: { family_id: 'shared-9' }, error: null }];
    await mount(<FamilyProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('fam:shared-9'));
  });

  it('still reports genuine absence as absence', async () => {
    h.queue.families = [{ data: null, error: null }];
    h.queue.family_members = [{ data: null, error: null }];
    await mount(<FamilyProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('NONE'));
  });

  it('never puts a raw platform error on screen', async () => {
    h.queue.families = [{ data: null, error: { message: 'TypeError: Load failed' } }];
    await mount(<FamilyProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toMatch(/^ERR:/));
    expect(screen.getByTestId('s').textContent).not.toMatch(/TypeError/);
  });
});

// ─── 3. The deliberate fallbacks survive — but only a REAL failure hits them ─

function ProfileProbe() {
  const { role, loading } = useProfile('user-1');
  return <span data-testid="s">{loading ? 'LOADING' : String(role)}</span>;
}

describe('useProfile keeps its fail-to-family posture, after retrying', () => {
  it('retries a transient read rather than dropping staff into the parent shell', async () => {
    h.queue.profiles = [
      { data: null, error: TRANSIENT },
      { data: { role: 'facilitator' }, error: null },
    ];
    await mount(<ProfileProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('facilitator'));
    expect(h.calls.profiles).toBe(2);
  });

  it('STILL falls back to family when the failure is real — posture unchanged', async () => {
    h.queue.profiles = [{ data: null, error: { message: 'permission denied' } }];
    await mount(<ProfileProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('family'));
  });
});

function EntitlementProbe() {
  const { isPremium, loading } = useEntitlement('fam-1');
  return <span data-testid="s">{loading ? 'LOADING' : isPremium ? 'premium' : 'free'}</span>;
}

describe('useEntitlement keeps its fail-free posture, after retrying', () => {
  it('does not downgrade a paying family over a dropped packet', async () => {
    const live = [
      { sponsor_type: 'self', status: 'active', period_start: '2000-01-01', period_end: null },
    ];
    h.queue.entitlements = [
      { data: null, error: TRANSIENT },
      { data: live, error: null },
    ];
    await mount(<EntitlementProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('premium'));
    expect(h.calls.entitlements).toBe(2);
  });

  it('STILL falls back to free when the failure is real — posture unchanged', async () => {
    h.queue.entitlements = [{ data: null, error: { message: 'permission denied' } }];
    await mount(<EntitlementProbe />);
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('free'));
  });
});
