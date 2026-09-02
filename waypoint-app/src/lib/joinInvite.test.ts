/**
 * Family Sharing B3 — the join link's pure logic.
 * A token that fails to parse is a co-parent who taps an email and lands
 * nowhere; a mis-mapped RPC error is a wrong screen. Both are cheap to pin.
 */
import { describe, it, expect } from 'vitest';
import { extractJoinToken, isInviteError, joinStateFromError, joinStateFromPreview } from './joinInvite';

const T = '8f3c2b1a-4d5e-4f60-9a7b-1c2d3e4f5a6b';

describe('extractJoinToken', () => {
  it('reads the token from every URL shape the platforms hand us', () => {
    expect(extractJoinToken(`https://waypointchild.com/join?token=${T}`)).toBe(T);
    expect(extractJoinToken(`https://www.waypointchild.com/join/?token=${T}`)).toBe(T);
    expect(extractJoinToken(`waypoint:///join?token=${T}`)).toBe(T);
    expect(extractJoinToken(`waypoint://join?token=${T}`)).toBe(T);
    expect(extractJoinToken(`exp://192.168.1.2:8081/--/join?token=${T}`)).toBe(T);
    expect(extractJoinToken(`https://waypointchild.com/join#token=${T}`)).toBe(T);
    expect(extractJoinToken(`https://waypointchild.com/join?utm=x&token=${T}&y=1`)).toBe(T);
  });

  it('decodes a percent-encoded token', () => {
    expect(extractJoinToken(`https://waypointchild.com/join?token=${encodeURIComponent(T)}`)).toBe(T);
  });

  it('is null for anything that is not a join link', () => {
    expect(extractJoinToken(null)).toBeNull();
    expect(extractJoinToken('')).toBeNull();
    expect(extractJoinToken('https://waypointchild.com/')).toBeNull();
    expect(extractJoinToken(`https://waypointchild.com/plan?token=${T}`)).toBeNull();
    expect(extractJoinToken(`https://waypointchild.com/joined?token=${T}`)).toBeNull();
    expect(extractJoinToken('https://waypointchild.com/join')).toBeNull();
    expect(extractJoinToken('https://waypointchild.com/join?token=')).toBeNull();
  });

  it('refuses a token that is not token-shaped', () => {
    expect(extractJoinToken('https://waypointchild.com/join?token=abc')).toBeNull();
    expect(extractJoinToken("https://waypointchild.com/join?token=<script>alert(1)</script>")).toBeNull();
    expect(extractJoinToken(`https://waypointchild.com/join?token=${'x'.repeat(201)}`)).toBeNull();
    expect(extractJoinToken('https://waypointchild.com/join?token=%E0%A4%A')).toBeNull();
  });
});

describe('joinStateFromError', () => {
  it('maps each RPC message to its screen state', () => {
    expect(joinStateFromError('invite_expired')).toBe('expired');
    expect(joinStateFromError('invite_already_used')).toBe('already_used');
    expect(joinStateFromError('invite_email_mismatch')).toBe('email_mismatch');
    expect(joinStateFromError('not_signed_in')).toBe('not_signed_in');
    expect(joinStateFromError('invite_not_found')).toBe('not_found');
    expect(joinStateFromError('invite_email_unverified')).toBe('email_unverified');
  });

  it('tolerates Postgres wrapping and case', () => {
    expect(joinStateFromError('ERROR: invite_expired (P0001)')).toBe('expired');
    expect(joinStateFromError('Invite_Email_Mismatch')).toBe('email_mismatch');
  });

  it('turns anything unrecognised into a retryable unavailable — never a false "revoked"', () => {
    expect(joinStateFromError(undefined)).toBe('unavailable');
    expect(joinStateFromError('')).toBe('unavailable');
    expect(joinStateFromError('network request failed')).toBe('unavailable');
    // PostgREST when migration 054 has not been applied yet:
    expect(joinStateFromError('Could not find the function public.preview_family_invitation(p_token) in the schema cache'))
      .toBe('unavailable');
  });
});

describe('isInviteError', () => {
  it('separates the messages 054 raises on purpose from infrastructure failures', () => {
    expect(isInviteError('invite_expired')).toBe(true);
    expect(isInviteError('not_signed_in')).toBe(true);
    expect(isInviteError('ERROR: invite_email_unverified')).toBe(true);
    expect(isInviteError('network request failed')).toBe(false);
    expect(isInviteError('Could not find the function public.accept_family_invitation')).toBe(false);
    expect(isInviteError(undefined)).toBe(false);
  });
});

describe('joinStateFromPreview', () => {
  it('narrows the preview state and refuses surprises', () => {
    expect(joinStateFromPreview('pending')).toBe('pending');
    expect(joinStateFromPreview('expired')).toBe('expired');
    expect(joinStateFromPreview('already_used')).toBe('already_used');
    expect(joinStateFromPreview('joined')).toBe('joined');
    expect(joinStateFromPreview('not_found')).toBe('not_found');
    expect(joinStateFromPreview('email_mismatch')).toBe('not_found');
    expect(joinStateFromPreview(undefined)).toBe('not_found');
    expect(joinStateFromPreview(42)).toBe('not_found');
  });
});
