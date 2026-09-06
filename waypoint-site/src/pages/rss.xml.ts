import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { guideUrl } from '../lib/content';

/**
 * RSS feed of PUBLISHED content only — a feed is a public artifact, so it
 * never lists drafts, even on preview builds (unlike the draft-gated pages).
 */
export async function GET(context: APIContext) {
  const published = (e: { data: { status: string; datePublished: Date | null } }) =>
    e.data.status === 'published' && e.data.datePublished !== null;

  const guides = await getCollection('guides', published);
  const answers = await getCollection('answers', published);
  const letters = await getCollection('letters', published);
  const centers = await getCollection('regionalCenters', published);

  const items = [
    ...guides.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.datePublished!,
      link: guideUrl(e),
    })),
    ...answers.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.datePublished!,
      link: `/answers/${e.id.replace(/\.mdx?$/, '')}/`,
    })),
    ...letters.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.datePublished!,
      link: `/letters/${e.id.replace(/\.mdx?$/, '')}/`,
    })),
    ...centers.map((e) => ({
      title: e.data.title,
      description: e.data.description,
      pubDate: e.data.datePublished!,
      link: `/regional-centers/${e.data.rcId}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Waypoint — California disability services, in plain language',
    description:
      'Free, statute-cited guides for California families of children with disabilities: Regional Centers, IEPs, Medi-Cal, IHSS, and SSI.',
    site: context.site!,
    items,
    customData: '<language>en-us</language>',
  });
}
