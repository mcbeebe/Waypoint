// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Static marketing site for waypointchild.com (build plan D-decisions apply).
// Custom per-locale hreflang sitemaps replace the default integration in
// Phase 1; the default keeps us honest until then.

const SITE = 'https://waypointchild.com';
const isDraftsBuild = process.env.WAYPOINT_SHOW_DRAFTS === '1';

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    // No sitemap on drafts builds: a preview must not advertise unpublished
    // YMYL URLs under production <loc>s (adversary finding A8).
    ...(isDraftsBuild
      ? []
      : [
          sitemap({
            // Keep noindexed surfaces out of the sitemap: the 404 page, and
            // the RC finder while it carries noindex pending county-spine
            // verification. The deeming calculator's noindex came off with
            // the verified 2026 constants (2026-09-07), so it's listed —
            // this filter must keep tracking each tool's noindex state.
            filter: (page) =>
              page !== `${SITE}/404/` && page !== `${SITE}/tools/regional-center-finder/`,
          }),
        ]),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline hoisted scripts: the deployed CSP is script-src 'self'
      // (no 'unsafe-inline'), so an inlined script is a dead script in
      // production (adversary finding A1). External files keep CSP strict.
      assetsInlineLimit: 0,
    },
  },
});
