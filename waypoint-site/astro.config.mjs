// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Static marketing site for waypointchild.com (build plan D-decisions apply).
// Custom per-locale hreflang sitemaps replace the default integration in
// Phase 1; the default keeps us honest until then.
export default defineConfig({
  site: 'https://waypointchild.com',
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      // Keep noindexed surfaces out of the sitemap: the 404 page, and the
      // tool pages while they carry noindex pending expert review — remove
      // the /tools/ exclusion in the same PR that flips their noindex off.
      filter: (page) => !page.includes('/404') && !page.includes('/tools/'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
