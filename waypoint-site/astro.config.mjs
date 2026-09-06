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
            // the tool pages while they carry noindex pending expert review —
            // remove the /tools/ exclusion in the same PR that flips their
            // noindex off. Anchored to the site origin, not substrings.
            filter: (page) => page !== `${SITE}/404/` && !page.startsWith(`${SITE}/tools/`),
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
