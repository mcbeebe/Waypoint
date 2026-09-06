/**
 * Family Sharing B2 — what the owner is told about delivery must be true.
 * A card that says "sent" for an email that never left — or that hides a
 * failure behind an older success — is the failure mode this phase exists
 * to prevent.
 */
import { describe, it, expect } from 'vitest';
import {
  deliveryState, describeSendFailure, isValidInviteEmail, joinLinkFor, parseSendError, shortDate,
} from './inviteDelivery';

const NOW = new Date('2026-09-02T12:00:00Z');
const FUTURE = '2026-09-16T12:00:00Z';
const PAST = '2026-08-01T12:00:00Z';

describe('deliveryState', () => {
  it('reports sent only when the row says it went out', () => {
    expect(deliveryState({ sent_at: '2026-09-02T10:00:00Z', send_error: null, expires_at: FUTURE }, NOW))
      .toEqual({ kind: 'sent', at: '2026-09-02T10:00:00Z' });
  });
  it('a present send_error is the LATEST attempt and outranks an older success', () => {
    // The function nulls send_error on success, so if it is set, the last try failed.
    const s = deliveryState({ sent_at: '2026-09-02T10:00:00Z', send_error: 'send_failed:Domain not verified', expires_at: FUTURE }, NOW);
    expect(s.kind).toBe('failed');
    expect(s.kind === 'failed' && s.text).toBe("The email didn't send (Domain not verified).");
  });
  it('an expired invite is expired whatever was sent', () => {
    expect(deliveryState({ sent_at: '2026-08-01T10:00:00Z', send_error: null, expires_at: PAST }, NOW).kind).toBe('expired');
  });
  it('is unsent when nothing has happened', () => {
    expect(deliveryState({ sent_at: null, send_error: null, expires_at: FUTURE }, NOW)).toEqual({ kind: 'unsent' });
  });
  it('reads the same vocabulary the server writes', () => {
    const s = deliveryState({ sent_at: null, send_error: 'delivery_not_configured', expires_at: FUTURE }, NOW);
    expect(s.kind === 'failed' && s.text).toMatch(/Copy link/);
  });
});

describe('parseSendError', () => {
  it('splits code:reason and tolerates a bare code', () => {
    expect(parseSendError('send_failed:provider 422')).toEqual({ code: 'send_failed', reason: 'provider 422' });
    expect(parseSendError('rate_limited')).toEqual({ code: 'rate_limited' });
    expect(parseSendError(null)).toBeNull();
  });
});

describe('describeSendFailure', () => {
  it('names the by-hand path when delivery is not configured', () => {
    expect(describeSendFailure('delivery_not_configured')).toMatch(/Copy link/);
    expect(describeSendFailure('delivery_not_configured', 'migration 057 not applied')).toMatch(/057/);
  });
  it('rate limits point at tomorrow or the link', () => {
    expect(describeSendFailure('rate_limited')).toMatch(/tomorrow/);
  });
  it('always points at Resend for the unknown case', () => {
    expect(describeSendFailure(undefined)).toMatch(/Resend/);
  });
});

describe('isValidInviteEmail', () => {
  it('accepts one plain address', () => {
    expect(isValidInviteEmail('jordan@example.com')).toBe(true);
    expect(isValidInviteEmail('  Jordan.Lee+kids@example.co.uk ')).toBe(true);
  });
  it('refuses lists, display-name form, and junk — the accept RPC compares verbatim', () => {
    expect(isValidInviteEmail('a@b.com, c@d.com')).toBe(false);
    expect(isValidInviteEmail('Jordan <jordan@example.com>')).toBe(false);
    expect(isValidInviteEmail('jordan')).toBe(false);
    expect(isValidInviteEmail('')).toBe(false);
    expect(isValidInviteEmail('a@' + 'b'.repeat(260) + '.com')).toBe(false);
  });
});

describe('joinLinkFor', () => {
  it("builds the link on the app's canonical origin and encodes the token", () => {
    expect(joinLinkFor('8f3c-abc')).toBe('https://waypointchild.com/join?token=8f3c-abc');
    expect(joinLinkFor('a b')).toBe('https://waypointchild.com/join?token=a%20b');
  });
});

describe('shortDate', () => {
  it('renders a short month-day, and nothing for junk', () => {
    expect(shortDate('2026-09-02T10:00:00Z')).toMatch(/^Sep [12]$/); // TZ-tolerant
    expect(shortDate('not a date')).toBe('');
  });
});
