import { describe, expect, it, beforeEach, vi } from 'vitest';
import { parseFirstTouch, captureFirstTouch, readCapturedFirstTouch } from './attribution';

const NOW = new Date('2026-09-08T12:00:00.000Z');
const now = () => NOW;

/** A minimal in-memory sessionStorage, including the throwing variety. */
function installStorage(throwing = false) {
  const map = new Map<string, string>();
  const store = {
    getItem: (k: string) => {
      if (throwing) throw new Error('blocked');
      return map.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (throwing) throw new Error('blocked');
      map.set(k, v);
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', { value: store, configurable: true });
  return map;
}

describe('parseFirstTouch', () => {
  it('maps the D3 params onto the stored shape', () => {
    const ft = parseFirstTouch(
      '?wp_slug=guides/benefits/ihss-protective-supervision&wp_pillar=benefits&wp_cta=guide-footer&wp_locale=en&utm_source=site&utm_medium=organic-content',
      now,
    );
    expect(ft).toEqual({
      source: 'site',
      medium: 'organic-content',
      landing_slug: 'guides/benefits/ihss-protective-supervision',
      wp: {
        slug: 'guides/benefits/ihss-protective-supervision',
        pillar: 'benefits',
        cta: 'guide-footer',
        locale: 'en',
        ctx: null,
      },
      captured_at: NOW.toISOString(),
    });
  });

  it('decodes a base64url wp_ctx payload', () => {
    const ctx = { v: 1, kind: 'checklist', slug: 'start', checked: ['rc-intake'] };
    const b64 = Buffer.from(JSON.stringify(ctx)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    const ft = parseFirstTouch(`?wp_slug=start&wp_ctx=${b64}&utm_source=site`, now);
    expect(ft?.wp.ctx).toEqual(ctx);
  });

  it('survives a malformed wp_ctx rather than losing the whole capture', () => {
    const ft = parseFirstTouch('?wp_slug=start&wp_ctx=not-base64!!&utm_source=site', now);
    expect(ft?.wp.ctx).toBeNull();
    expect(ft?.landing_slug).toBe('start');
  });

  it('returns null for a direct visit with nothing attributable', () => {
    expect(parseFirstTouch('', now)).toBeNull();
    expect(parseFirstTouch('?foo=bar', now)).toBeNull();
  });

  it('attributes on utm_source alone, without wp_slug', () => {
    expect(parseFirstTouch('?utm_source=site&utm_medium=organic-content', now)?.source).toBe('site');
  });
});

describe('captureFirstTouch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('persists the capture for the tab', () => {
    installStorage();
    captureFirstTouch('?wp_slug=start&wp_cta=hero&utm_source=site');
    expect(readCapturedFirstTouch()?.wp.cta).toBe('hero');
  });

  it('keeps the FIRST capture — an auth round trip must not erase it', () => {
    installStorage();
    captureFirstTouch('?wp_slug=guides/regional-centers&wp_cta=guide-footer&utm_source=site');
    // Same tab returns from OAuth on a bare URL, then on a second CTA.
    captureFirstTouch('');
    captureFirstTouch('?wp_slug=pricing&wp_cta=nav&utm_source=site');
    expect(readCapturedFirstTouch()?.landing_slug).toBe('guides/regional-centers');
  });

  it('degrades to null when storage throws, instead of breaking signup', () => {
    installStorage(true);
    expect(() => captureFirstTouch('?wp_slug=start&utm_source=site')).not.toThrow();
    expect(readCapturedFirstTouch()).toBeNull();
  });
});
