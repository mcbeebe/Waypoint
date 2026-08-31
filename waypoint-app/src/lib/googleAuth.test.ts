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
    })),
  },
}));

import { connectGoogleWeb, connectGmailWeb, GMAIL_API_SCOPES, GOOGLE_API_SCOPES } from './googleAuth';

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
