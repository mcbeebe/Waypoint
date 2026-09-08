/**
 * First-touch attribution capture (D3 contract:
 * waypoint-site/docs/analytics-taxonomy.md, "First-touch attribution").
 *
 * The marketing site sends a parent here with wp_* params describing where
 * they came from. Those params must be read and stashed BEFORE auth begins,
 * because OAuth and magic-link round trips drop the original query string —
 * by the time a session exists, the evidence is gone. So: capture on first
 * paint, persist for the tab, and write once when the account row is made.
 *
 * Write-once is the whole point. A parent who arrives from the IHSS guide,
 * bounces, and returns three weeks later by typing the URL is still an
 * organic-content signup; overwriting on the second visit would erase the
 * thing we are trying to measure. NULL is a legitimate value (direct visit,
 * stripped params) and is counted as leakage, never backfilled.
 */
// supabase is imported lazily inside applyFirstTouch: it pulls the React
// Native async-storage chain, and importing it at module scope would drag
// that into the pure-logic test project, which cannot parse Flow types.
const STORAGE_KEY = 'wp_first_touch';

export interface FirstTouch {
  source: string | null;
  medium: string | null;
  landing_slug: string | null;
  wp: {
    slug: string | null;
    pillar: string | null;
    cta: string | null;
    locale: string | null;
    ctx: unknown;
  };
  captured_at: string;
}

/** base64url JSON → object. Never throws: a malformed ctx must not cost us the rest. */
function decodeCtx(raw: string | null): unknown {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(b64)
              .split('')
              .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join(''),
          )
        : Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Storage is best-effort: private mode and blocked site data must not throw. */
function readStore(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
function writeStore(value: string): void {
  try {
    globalThis.sessionStorage?.setItem(STORAGE_KEY, value);
  } catch {
    /* no storage: attribution degrades to null, which is a valid outcome */
  }
}

/**
 * Build a FirstTouch from a query string. Exported for tests and so the
 * parsing rules live in one place rather than inline in an effect.
 * Returns null when there is nothing attributable in the URL.
 */
export function parseFirstTouch(search: string, now: () => Date = () => new Date()): FirstTouch | null {
  const p = new URLSearchParams(search);
  const wpSlug = p.get('wp_slug');
  const utmSource = p.get('utm_source');
  // Nothing to attribute: a direct visit, not a miss worth recording.
  if (!wpSlug && !utmSource) return null;

  return {
    source: utmSource,
    medium: p.get('utm_medium'),
    landing_slug: wpSlug,
    wp: {
      slug: wpSlug,
      pillar: p.get('wp_pillar'),
      cta: p.get('wp_cta'),
      locale: p.get('wp_locale'),
      ctx: decodeCtx(p.get('wp_ctx')),
    },
    captured_at: now().toISOString(),
  };
}

/**
 * Read the wp_ and utm_ params off the current URL and stash them for this tab.
 * Call as early as possible on web, before any auth redirect. Idempotent:
 * the FIRST capture in a tab wins, so bouncing through OAuth and landing
 * back here with a bare URL cannot erase it.
 */
export function captureFirstTouch(search?: string): FirstTouch | null {
  const query = search ?? (typeof window !== 'undefined' ? window.location?.search : undefined);
  if (!query) return readCapturedFirstTouch();

  const existing = readCapturedFirstTouch();
  if (existing) return existing;

  const parsed = parseFirstTouch(query);
  if (!parsed) return null;
  writeStore(JSON.stringify(parsed));
  return parsed;
}

/** Whatever this tab captured, if anything. */
export function readCapturedFirstTouch(): FirstTouch | null {
  const raw = readStore();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FirstTouch;
  } catch {
    return null;
  }
}

/**
 * Write the captured attribution onto a family row, exactly once.
 *
 * Guarded in the query itself (`.is('first_touch', null)`) rather than by
 * reading first and deciding: two tabs finishing signup together would both
 * pass a read-then-write check. Returns true only when this call is the one
 * that wrote.
 */
export async function applyFirstTouch(familyId: string): Promise<boolean> {
  const captured = readCapturedFirstTouch();
  if (!captured || !familyId) return false;

  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('families')
    .update({ first_touch: captured })
    .eq('id', familyId)
    .is('first_touch', null)
    .select('id');

  if (error) {
    // Attribution is telemetry: never let it break account creation.
    console.warn('[attribution] first_touch write failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
