import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// GA4 sends hits to regional collection hosts (e.g. region1.google-analytics.com),
// not only www. A CSP that names just www blocks those hits in the browser, and
// real visitors go uncounted. Google's CSP guide lists *.google-analytics.com.
const vercel = JSON.parse(readFileSync(fileURLToPath(new URL('../../vercel.json', import.meta.url)), 'utf8')) as {
  headers: { headers: { key: string; value: string }[] }[];
};
const csp = vercel.headers
  .flatMap((h) => h.headers)
  .find((h) => h.key.toLowerCase() === 'content-security-policy')?.value;

/** Source list of one CSP directive. */
function directive(name: string): string[] {
  const part = (csp ?? '').split(';').map((d) => d.trim().split(/\s+/)).find(([n]) => n === name);
  return part ? part.slice(1) : [];
}

/** Whether a CSP source list allows an https origin (exact host or `*.` wildcard). */
function allows(sources: string[], origin: string): boolean {
  const host = new URL(origin).hostname;
  return sources.some((s) => {
    const m = /^https:\/\/(\*\.)?([^/]+)$/.exec(s);
    if (!m) return false;
    return m[1] ? host.endsWith(`.${m[2]}`) : host === m[2];
  });
}

describe('production CSP lets GA4 report', () => {
  it('has a CSP', () => {
    expect(csp).toBeTruthy();
  });

  it.each(['https://www.google-analytics.com', 'https://region1.google-analytics.com', 'https://region1.analytics.google.com'])(
    'connect-src allows %s',
    (origin) => {
      expect(allows(directive('connect-src'), origin)).toBe(true);
    },
  );

  it.each(['https://www.google-analytics.com', 'https://region1.google-analytics.com'])('img-src allows %s', (origin) => {
    expect(allows(directive('img-src'), origin)).toBe(true);
  });

  // gtag.js also reports its own load to https://www.googletagmanager.com/a?t=l
  // (an <img>, not a collect hit). Blocking it does not lose a page view, but it
  // is the signal Google's tag diagnostics read, so the GA4 admin keeps warning
  // that the tag is not detected while the data is in fact arriving. The host is
  // already trusted in script-src — it serves gtag.js.
  it.each(['img-src', 'connect-src'])('%s allows the gtag load ping', (name) => {
    expect(allows(directive(name), 'https://www.googletagmanager.com')).toBe(true);
  });

  it('still blocks unrelated hosts', () => {
    expect(allows(directive('connect-src'), 'https://evil-google-analytics.com')).toBe(false);
    expect(allows(directive('connect-src'), 'https://example.com')).toBe(false);
  });
});
