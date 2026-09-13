/** Deep-link builder tests — the D3 contract (docs/analytics-taxonomy.md). */
import { describe, expect, it } from 'vitest';
import { appStartUrl, slugFromPath, CTA_IDS } from './appLinks';

describe('appStartUrl', () => {
  it('carries the full required param set with fixed utm values', () => {
    const url = new URL(
      appStartUrl({ slug: 'guides/regional-centers', cta: 'guide-footer', pillar: 'regional-centers' }),
    );
    expect(url.origin).toBe('https://app.waypointchild.com');
    expect(url.pathname).toBe('/start');
    expect(url.searchParams.get('wp_slug')).toBe('guides/regional-centers');
    expect(url.searchParams.get('wp_pillar')).toBe('regional-centers');
    expect(url.searchParams.get('wp_cta')).toBe('guide-footer');
    expect(url.searchParams.get('wp_locale')).toBe('en');
    expect(url.searchParams.get('utm_source')).toBe('site');
    expect(url.searchParams.get('utm_medium')).toBe('organic-content');
  });

  it('omits wp_pillar on non-pillar pages and wp_ctx without context', () => {
    const url = new URL(appStartUrl({ slug: 'home', cta: 'hero' }));
    expect(url.searchParams.has('wp_pillar')).toBe(false);
    expect(url.searchParams.has('wp_ctx')).toBe(false);
  });

  it('encodes wp_ctx as unpadded base64url JSON', () => {
    const ctx = { v: 1 as const, kind: 'checklist' as const, slug: 'start/autism', checked: ['a', 'b'] };
    const url = new URL(appStartUrl({ slug: 'start/autism', cta: 'checklist', ctx }));
    const raw = url.searchParams.get('wp_ctx')!;
    expect(raw).not.toMatch(/[+/=]/);
    const decoded = JSON.parse(
      Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );
    expect(decoded).toEqual(ctx);
  });

  it('registry has no duplicates', () => {
    expect(new Set(CTA_IDS).size).toBe(CTA_IDS.length);
  });
});

describe('slugFromPath', () => {
  it.each([
    ['/', 'home'],
    ['/pricing/', 'pricing'],
    ['/guides/benefits/ihss-protective-supervision/', 'guides/benefits/ihss-protective-supervision'],
  ])('%s → %s', (path, slug) => {
    expect(slugFromPath(path)).toBe(slug);
  });
});
