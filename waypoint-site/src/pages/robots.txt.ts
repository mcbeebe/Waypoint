import type { APIRoute } from 'astro';

// AI crawlers are explicitly welcome — being the cited source for California
// disability-services answers is the strategy (see the marketing-site plan).
// NOTE: Vercel Firewall/bot protection must not challenge these crawlers (launch checklist).
const body = `User-agent: *
Allow: /

Sitemap: https://waypointchild.com/sitemap-index.xml
`;

export const GET: APIRoute = () =>
  new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
