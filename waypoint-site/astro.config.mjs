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
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
