/**
 * The owner's sign-up alert email (supabase/functions/_shared/signupNotify.ts).
 * The Edge Function has no CI; this pins the part that can be pinned.
 */
import { describe, expect, it } from 'vitest';
import {
  dashboardUsersUrl,
  providerLabel,
  renderSignupEmail,
} from '../../supabase/functions/_shared/signupNotify';

const base = {
  email: 'parent@example.com',
  provider: 'apple',
  createdAt: '2026-10-03T03:30:00Z',
  confirmed: false,
  capped: false,
  userId: '6f1c2a9e-1b2c-4d5e-8f90-123456789abc',
  dashboardUrl: 'https://supabase.com/dashboard/project/abcdefghijklmnopqrst/auth/users',
};

describe('renderSignupEmail', () => {
  it('names the account, sign-in method and user id', () => {
    const { subject, text, html } = renderSignupEmail(base);
    expect(subject).toBe('New Waypoint sign-up');
    expect(text).toContain('Account: parent@example.com');
    expect(text).toContain('Signed up with: Sign in with Apple');
    expect(text).toContain(`User ID: ${base.userId}`);
    expect(html).toContain('parent@example.com');
    expect(html).toContain(base.dashboardUrl);
  });

  it('says a sign-up, not an account, and whether the email is confirmed', () => {
    expect(renderSignupEmail(base).text).toContain('Someone just signed up for Waypoint.');
    expect(renderSignupEmail(base).text).toContain('Email confirmed: Not yet');
    expect(renderSignupEmail({ ...base, confirmed: true }).text).toContain('Email confirmed: Yes');
  });

  it('flags the hourly cap\'s last alert in the subject and body', () => {
    const plain = renderSignupEmail(base);
    expect(plain.subject).toBe('New Waypoint sign-up');
    expect(plain.text).not.toContain('paused');
    const capped = renderSignupEmail({ ...base, capped: true });
    expect(capped.subject).toBe('New Waypoint sign-up (alerts paused for the hour)');
    expect(capped.text).toContain('alerts are paused');
    expect(capped.html).toContain('alerts are paused');
  });

  it('escapes user-controlled values in the HTML body', () => {
    const { html } = renderSignupEmail({ ...base, email: '<img src=x onerror=alert(1)>@x.com' });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;@x.com');
  });

  it('says so when the account has no email (e.g. a hidden Apple relay that failed)', () => {
    const { text } = renderSignupEmail({ ...base, email: null });
    expect(text).toContain('Account: (no email on the account)');
  });

  it('omits the dashboard link when none is known', () => {
    const { text, html } = renderSignupEmail({ ...base, dashboardUrl: '' });
    expect(text).not.toContain('All users:');
    expect(html).not.toContain('<a ');
  });
});

describe('providerLabel', () => {
  it('names known providers and passes unknown ones through', () => {
    expect(providerLabel('email')).toBe('Email and password');
    expect(providerLabel('google')).toBe('Sign in with Google');
    expect(providerLabel('github')).toBe('github');
    expect(providerLabel(null)).toBe('Unknown');
  });
});

describe('dashboardUsersUrl', () => {
  it('builds the Users page link from a hosted project URL', () => {
    expect(dashboardUsersUrl('https://abcdefghijklmnopqrst.supabase.co')).toBe(
      'https://supabase.com/dashboard/project/abcdefghijklmnopqrst/auth/users',
    );
  });

  it('refuses to guess for a custom domain or local stack', () => {
    expect(dashboardUsersUrl('https://api.waypointchild.com')).toBe('');
    expect(dashboardUsersUrl('http://127.0.0.1:54321')).toBe('');
  });
});
