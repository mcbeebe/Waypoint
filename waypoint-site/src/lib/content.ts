/**
 * Content visibility — the build-time enforcement of the review ladder.
 *
 * Nothing YMYL renders publicly unless `status === 'published'` (launch
 * checklist row 17; schema contract in src/content.config.ts). Draft,
 * founder-edit, in-review, and approved pages are excluded from the build
 * entirely — UNLESS the build runs with WAYPOINT_SHOW_DRAFTS=1, which is how
 * dev servers and preview deploys render work-in-progress for QA. Pages
 * rendered under the flag carry a visible draft banner and are noindexed
 * (see DraftBanner.astro and the layouts).
 *
 * Vercel: set WAYPOINT_SHOW_DRAFTS=1 on the Preview environment only. The
 * production build never sets it, so the publish gate holds by construction.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export const showDrafts: boolean =
  import.meta.env.DEV || process.env.WAYPOINT_SHOW_DRAFTS === '1';

// The drafts flag on a PRODUCTION deploy would publish every unverified YMYL
// draft with one dashboard checkbox. Refuse to build instead: the gate must
// not depend on out-of-band Vercel configuration staying correct.
if (process.env.WAYPOINT_SHOW_DRAFTS === '1' && process.env.VERCEL_ENV === 'production') {
  throw new Error(
    'WAYPOINT_SHOW_DRAFTS=1 is set on a production Vercel build. Draft YMYL content must ' +
      'never ship to production — unset the variable on the Production environment.',
  );
}

type ReviewedCollection = 'guides' | 'answers' | 'letters' | 'regionalCenters' | 'research';

type ReviewedEntry = CollectionEntry<ReviewedCollection>;

/** True when the entry may render in this build. */
export function isVisible(entry: { data: { status: string } }): boolean {
  return entry.data.status === 'published' || showDrafts;
}

/** True when the page must carry the draft banner + noindex. */
export function isDraft(entry: { data: { status: string } }): boolean {
  return entry.data.status !== 'published';
}

/** All entries of a reviewed collection that may render in this build. */
export async function visibleEntries<C extends ReviewedCollection>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  return getCollection(collection, isVisible);
}

/**
 * The set of content URLs that exist in this build — used by hub pages and
 * navigation to render a link only when its target will actually resolve
 * (a production build without the drafts flag builds far fewer pages).
 */
export async function visibleContentUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  for (const entry of await visibleEntries('guides')) {
    urls.add(guideUrl(entry));
  }
  for (const entry of await visibleEntries('answers')) {
    urls.add(`/answers/${entry.id.replace(/\.mdx?$/, '')}/`);
  }
  for (const entry of await visibleEntries('letters')) {
    urls.add(`/letters/${entry.id.replace(/\.mdx?$/, '')}/`);
  }
  for (const entry of await visibleEntries('regionalCenters')) {
    urls.add(`/regional-centers/${entry.data.rcId}/`);
  }
  return urls;
}

/**
 * Every content URL that exists in the repo, published or not — the
 * denominator `visibleContentUrls()` is a subset of. GatedLink validates
 * against this so a typo'd href fails the build instead of rendering as a
 * permanent "coming soon" placeholder the link checker cannot see.
 */
export async function allContentUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  for (const entry of await getCollection('guides')) {
    urls.add(guideUrl(entry));
  }
  for (const entry of await getCollection('answers')) {
    urls.add(`/answers/${entry.id.replace(/\.mdx?$/, '')}/`);
  }
  for (const entry of await getCollection('letters')) {
    urls.add(`/letters/${entry.id.replace(/\.mdx?$/, '')}/`);
  }
  for (const entry of await getCollection('regionalCenters')) {
    urls.add(`/regional-centers/${entry.data.rcId}/`);
  }
  return urls;
}

/**
 * Guides route mapping: entries under `start/` render at /start/<rest>/
 * (the by-diagnosis checklists — keyword map rows /start/...); everything
 * else renders at /guides/<id>/.
 */
export function guideUrl(entry: ReviewedEntry): string {
  const id = entry.id.replace(/\.mdx?$/, '');
  // 'start' is the diagnosis-general entry point (start/index.mdx, whose
  // `/index` Astro strips) and lives at /start/, not /guides/start/.
  if (id === 'start') return '/start/';
  return id.startsWith('start/') ? `/${id}/` : `/guides/${id}/`;
}
