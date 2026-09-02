/**
 * The web Google connect must pick its method from the account's real state,
 * read from the LOCAL session (not a network call) and decided BEFORE the
 * redirect — a wrong pick 422s at the callback, past the point anything can
 * recover (the bug this fixes):
 *   - Google not yet linked  → linkIdentity
 *   - Google already linked   → signInWithOAuth (re-consent, login_hint pinned)
 * and it must carry the UNION of already-granted + requested scopes, so the
 * Calendar-only base connect can never narrow an existing Gmail grant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type OAuthArg = { provider: string; options: { scopes: string; queryParams: Record<string, string> } };
const h = vi.hoisted(() => ({
  identities: [] as Array<{ provider: string; identity_data?: { email?: string } }>,
  storedScopes: null as string | null,
  linkIdentity: vi.fn(async (_a: OAuthArg) => ({ error: null as { message: string } | null })),
  signInWithOAuth: vi.fn(async (_a: OAuthArg) => ({ error: null as { message: string } | null })),
  upsert: vi.fn(async (_row: Record<string, unknown>) => ({ error: null })),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { setItem: vi.fn(async () => undefined), getItem: vi.fn(async () => null), removeItem: vi.fn(async () => undefined) },
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: { identities: h.identities } } } })),
      linkIdentity: h.linkIdentity,
      signInWithOAuth: h.signInWithOAuth,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: h.storedScopes === null ? null : { scopes: h.storedScopes } })),
      })),
      upsert: h.upsert,
    })),
  },
}));

import { connectGoogleWeb, connectGmailWeb, resolveScopes, GMAIL_API_SCOPES, GOOGLE_API_SCOPES } from './googleAuth';

const linkIdentity = h.linkIdentity;
const signInWithOAuth = h.signInWithOAuth;

beforeEach(() => {
  h.identities = [];
  h.storedScopes = null;
  linkIdentity.mockClear();
  signInWithOAuth.mockClear();
});

describe('connectGoogleWeb / connectGmailWeb choose the right method for the account state', () => {
  it('links Google when no Google identity is present yet', async () => {
    h.identities = [{ provider: 'email' }];
    const r = await connectGmailWeb('/');
    expect(r.success).toBe(true);
    expect(linkIdentity).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('re-consents (signInWithOAuth) — never linkIdentity — when Google is already linked, pinning the account', async () => {
    h.identities = [{ provider: 'email' }, { provider: 'google', identity_data: { email: 'parent@gmail.com' } }];
    const r = await connectGmailWeb('/');
    expect(r.success).toBe(true);
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(linkIdentity).not.toHaveBeenCalled();
    const opts = signInWithOAuth.mock.calls[0][0].options;
    expect(opts.queryParams.login_hint).toBe('parent@gmail.com'); // avoids an accidental account switch
  });

  it('never narrows scopes: a Calendar-only connect keeps an existing Gmail grant', async () => {
    h.identities = [{ provider: 'google', identity_data: { email: 'p@gmail.com' } }];
    h.storedScopes = GMAIL_API_SCOPES.join(' '); // already Gmail-connected
    await connectGoogleWeb(); // the base (Calendar-only) button
    const opts = signInWithOAuth.mock.calls[0][0].options;
    expect(opts.scopes).toContain('gmail.send'); // union preserves Gmail
    expect(opts.scopes).toContain('gmail.readonly');
    expect(opts.scopes).toContain('calendar');
  });

  it('carries Gmail scopes on a first Gmail connect', async () => {
    h.identities = [{ provider: 'email' }]; // first-time link
    await connectGmailWeb('/');
    const opts = linkIdentity.mock.calls[0][0].options;
    expect(opts.scopes).toContain('gmail.send');
    expect(opts.scopes).toContain('gmail.readonly');
  });

  it('always requests offline access + a consent prompt, so Google returns a refresh token', async () => {
    h.identities = [{ provider: 'google', identity_data: { email: 'p@gmail.com' } }];
    await connectGmailWeb('/');
    const opts = signInWithOAuth.mock.calls[0][0].options;
    expect(opts.queryParams.access_type).toBe('offline');
    expect(opts.queryParams.prompt).toBe('consent');
  });

  it('keeps the scope sets distinct (Gmail is a real superset of the base)', () => {
    expect(GMAIL_API_SCOPES).toEqual(expect.arrayContaining(GOOGLE_API_SCOPES));
    expect(GMAIL_API_SCOPES.length).toBeGreaterThan(GOOGLE_API_SCOPES.length);
  });
});


/**
 * The bug this pins, observed live on Sep 2 2026: a Gmail connect succeeded,
 * and minutes later the stored scopes were Calendar-only again — `connected_at`
 * days old, `updated_at` seconds old. `captureGoogleTokens` runs on EVERY auth
 * event carrying provider tokens, Supabase keeps `provider_refresh_token` in
 * the persisted session, so it runs again on the next app load — by which
 * point the one-shot requested-scopes note is gone, and the old fallback wrote
 * Calendar over the Gmail grant. Home then said "Gmail not connected" forever.
 */
describe('resolveScopes never narrows an existing grant', () => {
  const CAL = GOOGLE_API_SCOPES.join(' ');

  beforeEach(() => {
    h.storedScopes = null;
    vi.unstubAllGlobals();
  });

  it('re-capture with the note already consumed PRESERVES Gmail (the live bug)', async () => {
    h.storedScopes = GMAIL_API_SCOPES.join(' ');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const out = await resolveScopes(null, null); // no token, note consumed
    expect(out).toContain('gmail.send');
    expect(out).toContain('gmail.readonly');
    expect(out).not.toBe(CAL);
  });

  it('records what Google actually GRANTED, not what we asked for', async () => {
    // Asked for Gmail; Google granted Calendar only (restricted scope withheld).
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ scope: 'https://www.googleapis.com/auth/calendar' }),
    })));
    const out = await resolveScopes('tok', GMAIL_API_SCOPES.join(' '));
    expect(out).toBe('https://www.googleapis.com/auth/calendar');
    expect(out).not.toContain('gmail.send'); // must not claim Gmail
  });

  it('stores the Gmail grant when Google confirms it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ scope: GMAIL_API_SCOPES.join(' ') }),
    })));
    const out = await resolveScopes('tok', GMAIL_API_SCOPES.join(' '));
    expect(out).toContain('gmail.send');
  });

  it('widens stored scopes by what this consent asked for when Google is unreachable', async () => {
    h.storedScopes = CAL;
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const out = await resolveScopes('tok', GMAIL_API_SCOPES.join(' '));
    expect(out).toContain('calendar');
    expect(out).toContain('gmail.send');
  });

  it('falls back to the base Calendar connection only for a brand-new row', async () => {
    h.storedScopes = null;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    expect(await resolveScopes(null, null)).toBe(CAL);
  });
});
