/**
 * Family Sharing B3 — the join link, as pure logic.
 *
 * A co-parent arrives on `…/join?token=<uuid>` (email link, or a link the
 * owner shared by hand). Three things have to be right and are easy to get
 * wrong, so they live here, pure and tested:
 *
 *   1. Pulling the token out of whatever URL shape the platform hands us
 *      (https://waypointchild.com/join?token=…, waypoint:///join?token=…,
 *      exp://…/--/join?token=…), and refusing garbage.
 *   2. Mapping the accept/preview RPC's short error messages (migration 054)
 *      to the screen states the mockups define.
 *   3. Remembering the token across a sign-in: a signed-out person who taps
 *      the link must come back to Join after signing in, not lose it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Where a not-yet-signed-in join token waits for the sign-in to finish. */
export const PENDING_JOIN_KEY = 'waypoint.pendingJoinToken';

/** The states the Join screen can be in (see the 007 mockups). */
export type JoinState =
  | 'pending'        // a live invite this account can accept
  | 'expired'        // link is older than 14 days
  | 'already_used'   // someone else accepted it
  | 'email_mismatch' // sent to a different address than the one signed in
  | 'not_found'      // no such invite (bad or revoked token)
  | 'not_signed_in';

/** Invitation tokens are gen_random_uuid()::text — url-safe, 36 chars. Accept
 *  a little slack so a future base64url token still passes; refuse junk. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{8,200}$/;

/**
 * Extract a join token from a URL, or null when the URL is not a join link.
 * The path must contain a `join` segment; the token rides in `?token=` or
 * `#token=`. Anything that fails the token shape is treated as no token.
 */
export function extractJoinToken(url: string | null | undefined): string | null {
  if (!url) return null;
  // The path segment before any query/fragment must end in /join (or be
  // "join" at the root of a custom scheme like waypoint:///join).
  const beforeQuery = url.split(/[?#]/)[0];
  if (!/(^|\/)join\/?$/i.test(beforeQuery)) return null;
  const m = /[?#&]token=([^&#\s]+)/i.exec(url);
  if (!m) return null;
  let raw = m[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return TOKEN_SHAPE.test(raw) ? raw : null;
}

/**
 * Map an RPC failure to a screen state. The functions in migration 054 raise
 * exactly these short messages; anything else (network, an unexpected DB
 * error) is reported as `not_found` so the person gets a clear "this link
 * doesn't work" instead of a raw error.
 */
export function joinStateFromError(message: string | null | undefined): JoinState {
  const m = (message ?? '').toLowerCase();
  if (m.includes('not_signed_in')) return 'not_signed_in';
  if (m.includes('invite_expired')) return 'expired';
  if (m.includes('invite_already_used')) return 'already_used';
  if (m.includes('invite_email_mismatch')) return 'email_mismatch';
  return 'not_found';
}

/** The preview RPC's `state` field, narrowed. */
export function joinStateFromPreview(state: unknown): JoinState {
  switch (state) {
    case 'pending':
    case 'expired':
    case 'already_used':
    case 'not_found':
      return state;
    default:
      return 'not_found';
  }
}

export async function stashPendingJoin(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_JOIN_KEY, token);
  } catch {
    // Storage can be unavailable (private mode); the in-memory state still
    // carries the token for this session.
  }
}

export async function readPendingJoin(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(PENDING_JOIN_KEY);
    return v && TOKEN_SHAPE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export async function clearPendingJoin(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_JOIN_KEY);
  } catch {
    // nothing to do
  }
}
