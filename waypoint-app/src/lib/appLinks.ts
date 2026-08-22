/**
 * Canonical Waypoint web links.
 *
 * Used to embed a "View in Waypoint" URL in things that leave the app —
 * Google Calendar event descriptions, most importantly — so a parent
 * looking at an event on their phone's calendar can tap straight back to
 * the action and update its status.
 *
 * The origin resolves in this order: an explicit EXPO_PUBLIC_WEB_URL, then
 * the browser's own origin when running on the web (so preview deployments
 * link to themselves), then the production domain. Localhost origins are
 * deliberately ignored — a link pasted into a real calendar event has to
 * work from someone else's device.
 */

export const DEFAULT_WEB_ORIGIN = 'https://waypointchild.com';

/** Marker line prefix, used to keep the link block idempotent. */
export const LINK_LABEL = 'View in Waypoint:';

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;

/** Trim a trailing slash so paths join cleanly. */
function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

/** True for an origin worth putting in front of someone else's eyes. */
export function isPublicOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  const match = /^https?:\/\/([^/:]+)/i.exec(origin.trim());
  if (!match) return false;
  return !LOCAL_HOSTS.test(match[1]);
}

/** The origin Waypoint links should point at. */
export function webOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL;
  if (isPublicOrigin(configured)) return normalizeOrigin(configured!.trim());

  const browserOrigin =
    typeof window !== 'undefined' ? (window as any)?.location?.origin : undefined;
  if (isPublicOrigin(browserOrigin)) return normalizeOrigin(browserOrigin);

  return DEFAULT_WEB_ORIGIN;
}

/** Deep link to one action's detail screen (matches the `actions/:actionId` route). */
export function actionUrl(actionId: string, origin: string = webOrigin()): string {
  return `${normalizeOrigin(origin)}/actions/${encodeURIComponent(actionId)}`;
}

/** Deep link to the Waypoint calendar. */
export function calendarUrl(origin: string = webOrigin()): string {
  return `${normalizeOrigin(origin)}/calendar`;
}

/** The two-line block appended to an external description. */
export function waypointLinkBlock(url: string): string {
  return `${LINK_LABEL} ${url}`;
}

/** Remove any previously embedded Waypoint link block. */
export function stripWaypointLink(notes: string): string {
  return notes
    .split('\n')
    .filter((line) => !line.trim().startsWith(LINK_LABEL))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

/**
 * Append the Waypoint link to a description, replacing any link already
 * there. Idempotent: re-saving an event that was created from Waypoint
 * doesn't stack up duplicate link lines.
 */
export function withWaypointLink(notes: string, url: string): string {
  const body = stripWaypointLink(notes ?? '');
  const block = waypointLinkBlock(url);
  return body ? `${body}\n\n${block}` : block;
}
