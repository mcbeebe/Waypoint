import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// public/ga-init.js must only configure GA4 on the live site: CI's axe,
// keyboard and Lighthouse runs serve the production build from 127.0.0.1.
const SOURCE = readFileSync(fileURLToPath(new URL('../../public/ga-init.js', import.meta.url)), 'utf8');

/** Runs ga-init.js against a minimal browser global and returns the dataLayer commands. */
function run(hostname: string, gaId: string | null = 'G-VEB7T9ZVH5'): unknown[][] {
  const cookies: string[] = [];
  const sandbox: Record<string, unknown> = {
    location: { hostname },
    document: {
      currentScript: { dataset: gaId ? { gaId } : {} },
      get cookie() {
        return '';
      },
      set cookie(v: string) {
        cookies.push(v);
      },
    },
  };
  sandbox.window = sandbox;
  runInNewContext(SOURCE, sandbox);
  const layer = (sandbox.dataLayer as ArrayLike<unknown>[] | undefined) ?? [];
  return layer.map((args) => Array.from(args));
}

const commands = (layer: unknown[][]) => layer.map((args) => args[0]);

describe('ga-init.js', () => {
  it.each(['waypointchild.com', 'www.waypointchild.com'])('configures GA4 on %s', (host) => {
    const layer = run(host);
    expect(commands(layer)).toEqual(['consent', 'js', 'config']);
    expect(layer[2][1]).toBe('G-VEB7T9ZVH5');
  });

  it.each(['127.0.0.1', 'localhost', 'waypoint-site-git-branch.vercel.app', 'waypointchild.com.evil.test'])(
    'sends nothing to GA4 on %s, but keeps gtag for the Plausible mirror',
    (host) => {
      const layer = run(host);
      // Consent default only: no 'js' or 'config', so gtag.js has no property to report to.
      expect(commands(layer)).toEqual(['consent']);
      expect(layer[0][2]).toMatchObject({ analytics_storage: 'denied' });
    },
  );

  it('does nothing without a Measurement ID', () => {
    expect(run('waypointchild.com', null)).toEqual([]);
  });
});
