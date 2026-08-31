/**
 * The web Google connect must pick its method from the account's real state,
 * decided BEFORE the redirect (a wrong pick 422s at the callback, past the
 * point anything can recover — the bug this fixes):
 *   - Google not yet linked  → linkIdentity
 *   - Google already linked   → signInWithOAuth (re-consent)
 * and it must carry the scopes the caller asked for (Calendar vs Gmail).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type OAuthArg = { provider: string; options: { scopes: string; queryParams: Record<string, string> } };
const h = vi.hoisted(() => ({
  identities: [] as Array<{ provider: string }>,
  linkIdentity: vi.fn(async (_a: OAuthArg) => ({ error: null as { message: string } | null })),
  signInWithOAuth: vi.fn(async (_a: OAuthArg) => ({ error: null as { message: string } | null })),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { setItem: vi.fn(async () => undefined), getItem: vi.fn(async () => null), removeItem: vi.fn(async () => undefined) },
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUserIdentities: vi.fn(async () => ({ data: { identities: h.identities }, error: null })),
      linkIdentity: h.linkIdentity,
      signInWithOAuth: h.signInWithOAuth,
    },
  },
}));

const identitiesRef = { get current() { return h.identities; }, set current(v: Array<{ provider: string }>) { h.identities = v; } };
const linkIdentity = h.linkIdentity;
const signInWithOAuth = h.signInWithOAuth;

import { connectGoogleWeb, connectGmailWeb, GMAIL_API_SCOPES, GOOGLE_API_SCOPES } from './googleAuth';

beforeEach(() => {
  identitiesRef.current = [];
  linkIdentity.mockClear();
  signInWithOAuth.mockClear();
});

describe('connectGoogleWeb / connectGmailWeb choose the right method for the account state', () => {
  it('links Google when no Google identity is present yet', async () => {
    identitiesRef.current = [{ provider: 'email' }];
    const r = await connectGmailWeb('/');
    expect(r.success).toBe(true);
    expect(linkIdentity).toHaveBeenCalledTimes(1);
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it('re-consents (signInWithOAuth) when a Google identity is already linked — never linkIdentity', async () => {
    identitiesRef.current = [{ provider: 'email' }, { provider: 'google' }];
    const r = await connectGmailWeb('/');
    expect(r.success).toBe(true);
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(linkIdentity).not.toHaveBeenCalled();
  });

  it('carries Gmail scopes on the Gmail connect and Calendar-only on the base connect', async () => {
    identitiesRef.current = [{ provider: 'google' }];

    await connectGmailWeb('/');
    const gmailOpts = signInWithOAuth.mock.calls[0][0] as { options: { scopes: string } };
    expect(gmailOpts.options.scopes).toContain('gmail.send');
    expect(gmailOpts.options.scopes).toContain('gmail.readonly');

    signInWithOAuth.mockClear();
    await connectGoogleWeb();
    const calOpts = signInWithOAuth.mock.calls[0][0] as { options: { scopes: string } };
    expect(calOpts.options.scopes).toContain('calendar');
    expect(calOpts.options.scopes).not.toContain('gmail');
  });

  it('always requests offline access + a consent prompt, so Google returns a refresh token', async () => {
    identitiesRef.current = [{ provider: 'google' }];
    await connectGmailWeb('/');
    const opts = signInWithOAuth.mock.calls[0][0] as { options: { queryParams: Record<string, string> } };
    expect(opts.options.queryParams.access_type).toBe('offline');
    expect(opts.options.queryParams.prompt).toBe('consent');
  });

  it('keeps the scope sets distinct (a real superset)', () => {
    expect(GMAIL_API_SCOPES).toEqual(expect.arrayContaining(GOOGLE_API_SCOPES));
    expect(GMAIL_API_SCOPES.length).toBeGreaterThan(GOOGLE_API_SCOPES.length);
  });
});
