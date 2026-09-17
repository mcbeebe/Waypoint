// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import citeLinks from './src/plugins/satteri-cite-links.mjs';

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
            // Keep noindexed surfaces out of the sitemap: currently just the
            // 404 page. The deeming calculator's noindex came off with the
            // verified 2026 constants (2026-09-07); the RC finder's came off
            // 2026-09-10 once all 21 Regional Center pages published — this
            // filter must keep tracking each tool's noindex state.
            filter: (page) => page !== `${SITE}/404/`,
          }),
        ]),
  ],
  markdown: {
    // Pairs each citation chip with the page's sources[] entry and links it.
    // Applies to <Cite> and raw <span class="cite"> alike; a chip with no
    // matching source stays plain text. See src/plugins/satteri-cite-links.
    processor: satteri({ mdastPlugins: [citeLinks] }),
  },
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
