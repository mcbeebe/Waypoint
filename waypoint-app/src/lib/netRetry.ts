/**
 * Transient network failures, handled like the everyday events they are.
 *
 * Phones lose connectivity constantly — a lift, a tunnel, a backgrounded
 * PWA. Supabase surfaces those as an error whose message is whatever the
 * platform's fetch threw ("Load failed" on Safari, "Failed to fetch" on
 * Chrome), which is meaningless to a parent and looks like the app broke.
 *
 * So: retry the blip, and if it persists say something a human can act on.
 *
 * Pure module — no react-native imports — so it stays unit-testable.
 */

/** Messages platforms use when the request never reached the server. */
const TRANSIENT_RE =
  /load failed|failed to fetch|network ?(request )?(error|failed)|networkerror|fetch failed|timeout|timed out|connection (lost|reset|refused|closed)|the request timed out|aborted/i;

function messageOf(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message ?? '');
  }
  return String(err);
}

/** True when the failure is a connectivity blip rather than a real rejection. */
export function isTransientNetworkError(err: unknown): boolean {
  return TRANSIENT_RE.test(messageOf(err));
}

/**
 * Plain-language version of an error, for anything a parent might read.
 * Raw JS error text ("TypeError: Load failed") never belongs on screen.
 */
export function friendlyErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const msg = messageOf(err).trim();
  if (!msg) return fallback;
  if (isTransientNetworkError(msg)) {
    return "Couldn't reach Waypoint — check your connection and try again.";
  }
  if (/jwt|token|not authenticated|unauthorized|401/i.test(msg)) {
    return 'Your session expired. Sign out and back in to continue.';
  }
  if (/row-level security|permission denied|403/i.test(msg)) {
    return "You don't have permission to change that.";
  }
  // A real database complaint is worth showing, minus the JS wrapper noise
  return msg.replace(/^(TypeError|Error):\s*/i, '');
}

interface QueryResult<T> {
  data: T;
  error: { message: string } | null;
}

export interface RetryOptions {
  /** Total tries, including the first (default 3) */
  attempts?: number;
  /** Delay before the first retry; doubles each time (default 400ms) */
  baseDelayMs?: number;
  /** Injected for tests */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Run a Supabase query, retrying only connectivity failures.
 *
 * Real errors (RLS, constraint violations, missing columns) come back on
 * the first try — retrying those would just delay an honest answer.
 */
export async function retryQuery<T>(
  run: () => PromiseLike<QueryResult<T>>,
  options: RetryOptions = {}
): Promise<QueryResult<T>> {
  const { attempts = 3, baseDelayMs = 400, sleep = defaultSleep } = options;

  let last: QueryResult<T> = { data: null as T, error: { message: 'Not run' } };
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      last = await run();
    } catch (err) {
      // A thrown fetch failure is the same event as a returned one
      last = { data: null as T, error: { message: messageOf(err) } };
    }
    if (!last.error || !isTransientNetworkError(last.error.message)) return last;
    if (attempt < attempts - 1) await sleep(baseDelayMs * 2 ** attempt);
  }
  return last;
}
