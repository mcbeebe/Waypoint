/**
 * Per-page Open Graph cards, generated at build time.
 *
 * One PNG per visible content page plus `/og/default.png`, which every
 * hand-built page (home, guides index, pricing, about, tools, legal)
 * shares. Static output: these are files in dist, not a runtime service.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../lib/og';
import { visibleEntries, guideUrl } from '../../lib/content';

const PILLAR_LABELS: Record<string, string> = {
  'regional-centers': 'Regional Centers',
  iep: 'School & IEPs',
  benefits: 'Money & benefits',
  insurance: 'Insurance & SB 946',
  'first-steps': 'First steps',
  start: 'Start here',
};

/** dist path (minus /og/ and .png) for a content URL, e.g. /guides/x/ → guides-x */
function slugForUrl(url: string): string {
  return url.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { slug: string }; props: { title: string; eyebrow?: string } }[] = [
    {
      params: { slug: 'default' },
      props: {
        title: "Your child's unexpected journey. Every step, mapped.",
        eyebrow: 'For California families',
      },
    },
  ];

  const urlFor = (collection: string, entry: { id: string; data: Record<string, unknown> }): string => {
    const id = entry.id.replace(/\.mdx?$/, '');
    if (collection === 'answers') return `/answers/${id}/`;
    if (collection === 'letters') return `/letters/${id}/`;
    if (collection === 'regionalCenters') return `/regional-centers/${entry.data.rcId as string}/`;
    return guideUrl(entry as Parameters<typeof guideUrl>[0]);
  };

  for (const collection of ['guides', 'answers', 'letters', 'regionalCenters'] as const) {
    for (const entry of await visibleEntries(collection)) {
      const d = entry.data as { title: string; pillar?: string; rcName?: string };
      const url = urlFor(collection, entry);
      paths.push({
        params: { slug: slugForUrl(url) },
        props: {
          title: d.title,
          eyebrow: d.rcName
            ? 'Regional Center'
            : d.pillar
              ? PILLAR_LABELS[d.pillar]
              : undefined,
        },
      });
    }
  }

  return paths;
};

export const GET: APIRoute = async ({ props }) => {
  const { title, eyebrow } = props as { title: string; eyebrow?: string };
  const png = await renderOg({ title, eyebrow });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
