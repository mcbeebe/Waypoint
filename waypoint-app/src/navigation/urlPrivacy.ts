/**
 * What a family writes stays out of addresses.
 *
 * On web, React Navigation writes every route param into the URL's query
 * string. The Letters screen is handed the text of a letter (`draftBody`), its
 * subject, the parent's ask (`question`) and the Navigator's guidance — so
 * `/letters?draftBody=Dear%20Pat%2C%20…` sat in the address bar, in browser
 * history (synced across a family's devices), and in the page URL any error
 * report carries. A letter about a child's diagnosis and services is exactly
 * what must not be there.
 *
 * The params still travel in navigation state, in memory, so the screen works
 * as before — and browser back/forward within a session restores them, since
 * React Navigation keeps each history entry's state. Only a full reload or a
 * copied link arrives without them, and Letters then opens on the template
 * with no draft, the way a fresh visit does.
 *
 * Pure — no react-native imports — so it is unit-tested.
 */

/** Params that carry text a family wrote, or an AI wrote for them. */
export const PRIVATE_URL_PARAMS: ReadonlySet<string> = new Set([
  'draftBody',
  'draftBodyUnlogged',
  'draftSubject',
  'question',
  'guidance',
  'trackTitle',
]);

/** Longer than any key or id a URL legitimately carries (a UUID is 36). */
const MAX_URL_VALUE = 80;

function decode(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, ' '));
  } catch {
    return part;
  }
}

/**
 * A path as `getPathFromState` builds it, minus every private or free-text
 * query param. Free text is caught whatever the param is called — any value
 * with whitespace or longer than an id — so a screen added later cannot put
 * a family's words in the address bar by giving its param a new name.
 */
export function withoutPrivateParams(path: string): string {
  const q = path.indexOf('?');
  if (q === -1) return path;
  const kept = path
    .slice(q + 1)
    .split('&')
    .filter((pair) => {
      if (!pair) return false;
      const eq = pair.indexOf('=');
      const key = decode(eq === -1 ? pair : pair.slice(0, eq));
      const value = eq === -1 ? '' : decode(pair.slice(eq + 1));
      if (PRIVATE_URL_PARAMS.has(key)) return false;
      return !/\s/.test(value) && value.length <= MAX_URL_VALUE;
    });
  return kept.length > 0 ? `${path.slice(0, q)}?${kept.join('&')}` : path.slice(0, q);
}

/** A URL without its query string or fragment — for anything that records URLs. */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}
