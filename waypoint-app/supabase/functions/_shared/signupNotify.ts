/**
 * The owner's new-sign-up alert email (notify-signup Edge Function, migration
 * 061). Pure so the vitest suite can pin it — the function itself has no CI.
 *
 * Carries only what the owner needs to notice a sign-up: the account email,
 * how they signed in, and when. Never child, diagnosis, or family details —
 * the alert fires on the auth insert, before any of that exists, and it
 * should stay that way if this is ever moved later in the flow.
 */

export interface SignupAlertInput {
  email: string | null;
  provider: string | null;
  /** ISO-8601 timestamp from auth.users.created_at. */
  createdAt: string;
  userId: string;
  /** Supabase dashboard link to the Users page, or '' when unknown. */
  dashboardUrl: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const PROVIDER_NAMES: Record<string, string> = {
  email: 'Email and password',
  apple: 'Sign in with Apple',
  google: 'Sign in with Google',
};

/** Human name for a Supabase auth provider id; unknown ids pass through. */
export function providerLabel(provider: string | null): string {
  if (!provider) return 'Unknown';
  return PROVIDER_NAMES[provider] ?? provider;
}

/**
 * Formats an instant in California time, where the families (and the owner)
 * are — explicit timeZone, so the Edge runtime's UTC clock cannot shift it.
 */
export function pacificTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    // Explicit fields: dateStyle/timeStyle throw when combined with timeZoneName.
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(d);
}

/**
 * Supabase dashboard Users page for a project, from its API URL
 * (`https://<ref>.supabase.co`). Returns '' for anything else (custom domain,
 * local stack) rather than guessing a link.
 */
export function dashboardUsersUrl(supabaseUrl: string): string {
  const m = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/.exec(supabaseUrl.trim());
  return m ? `https://supabase.com/dashboard/project/${m[1]}/auth/users` : '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Builds the alert email. Every user-controlled value is HTML-escaped. */
export function renderSignupEmail(input: SignupAlertInput): RenderedEmail {
  const email = input.email?.trim() || '(no email on the account)';
  const rows: [string, string][] = [
    ['Account', email],
    ['Signed up with', providerLabel(input.provider)],
    ['When', pacificTime(input.createdAt)],
    ['User ID', input.userId],
  ];

  const text = [
    'Someone just created a Waypoint account.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'If they came from the site, where from is saved to families.first_touch after sign-up.',
    ...(input.dashboardUrl ? ['', `All users: ${input.dashboardUrl}`] : []),
  ].join('\n');

  const html = `<p>Someone just created a Waypoint account.</p>
<table cellpadding="4" style="border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="color:#555">${escapeHtml(k)}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`).join('\n')}
</table>
<p style="color:#555">If they came from the site, where from is saved to <code>families.first_touch</code> after sign-up.</p>${
    input.dashboardUrl ? `\n<p><a href="${escapeHtml(input.dashboardUrl)}">See all users in Supabase</a></p>` : ''
  }`;

  return { subject: 'New Waypoint sign-up', text, html };
}
