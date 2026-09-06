/**
 * Deep-link CTA builder — the ONLY way a page links into the app.
 * Contract: docs/analytics-taxonomy.md (D3, frozen). Every CTA carries
 * wp_slug, wp_cta, wp_locale, the fixed utm pair, wp_pillar on pillar
 * content, and optionally a versioned wp_ctx payload (summaries only —
 * never raw figures the user typed).
 */
export const APP_URL = 'https://app.waypointchild.com';

/**
 * CTA id registry — mirror of content-ops/STYLE-GUIDE.md §6. Adding an id
 * here requires adding it to the style guide's list in the same PR.
 */
export const CTA_IDS = [
  'header',
  'hero',
  'home-footer',
  'hub-footer',
  'guide-footer',
  'answer-inline',
  'answer-footer',
  'letter-footer',
  'letter-after-copy',
  'rc-footer',
  'checklist',
  'tool-result',
  'pricing-card',
  'about-footer',
] as const;
export type CtaId = (typeof CTA_IDS)[number];

export type Pillar =
  | 'regional-centers'
  | 'iep'
  | 'benefits'
  | 'insurance'
  | 'first-steps'
  | 'start';

export interface WpCtx {
  v: 1;
  kind: 'checklist' | 'tool' | 'guide';
  [key: string]: unknown;
}

export interface AppLinkParams {
  /** Originating page slug (its path, without leading/trailing slash). */
  slug: string;
  cta: CtaId;
  locale?: 'en' | 'es';
  /** Required on pillar content; omitted on marketing pages. */
  pillar?: Pillar;
  ctx?: WpCtx;
}

/** base64url without padding — matches the app-side parser expectation. */
function base64url(json: string): string {
  // Buffer exists at build time (node); btoa in the browser bundle.
  let b64: string;
  if (typeof Buffer !== 'undefined') {
    b64 = Buffer.from(json, 'utf8').toString('base64');
  } else {
    let bin = '';
    for (const byte of new TextEncoder().encode(json)) bin += String.fromCharCode(byte);
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** wp_slug for a page path: slashes trimmed, '/' becomes 'home'. */
export function slugFromPath(pathname: string): string {
  const slug = pathname.replace(/^\/+|\/+$/g, '');
  return slug === '' ? 'home' : slug;
}

/** Build the /start deep-link URL with the full D3 param set. */
export function appStartUrl({ slug, cta, locale = 'en', pillar, ctx }: AppLinkParams): string {
  const params = new URLSearchParams();
  params.set('wp_slug', slug);
  if (pillar) params.set('wp_pillar', pillar);
  params.set('wp_cta', cta);
  params.set('wp_locale', locale);
  if (ctx) params.set('wp_ctx', base64url(JSON.stringify(ctx)));
  params.set('utm_source', 'site');
  params.set('utm_medium', 'organic-content');
  return `${APP_URL}/start?${params.toString()}`;
}
