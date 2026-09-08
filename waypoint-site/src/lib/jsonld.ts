/**
 * JSON-LD builders. Rules (build plan, launch checklist row 7):
 * - No FAQPage (deliberate — see the plan's SEO notes).
 * - Never invent datePublished/review fields: Article schema is emitted only
 *   for published entries, from frontmatter values.
 * - Organization sameAs waits for the real social profiles (D13, Mike).
 */

const SITE = 'https://waypointchild.com';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Waypoint',
    url: `${SITE}/`,
    logo: `${SITE}/favicon.svg`,
    description:
      'Waypoint helps California families of children with disabilities navigate Regional Centers, IEPs, Medi-Cal, and SSI.',
  };
}

export interface ArticleJsonLdInput {
  url: string;
  title: string;
  description: string;
  locale: 'en' | 'es';
  author: string;
  datePublished: Date | null;
  dateModified: Date;
  review: { reviewedBy: string; credential: string } | null;
}

/** Article schema for a PUBLISHED entry only — callers gate on status. */
export function articleJsonLd(input: ArticleJsonLdInput) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: input.url,
    headline: input.title,
    description: input.description,
    inLanguage: input.locale,
    author: { '@type': 'Person', name: input.author },
    publisher: { '@type': 'Organization', name: 'Waypoint', url: `${SITE}/` },
    dateModified: input.dateModified.toISOString(),
  };
  if (input.datePublished) data.datePublished = input.datePublished.toISOString();
  if (input.review) {
    data.reviewedBy = {
      '@type': 'Person',
      name: input.review.reviewedBy,
      description: input.review.credential,
    };
  }
  return data;
}

export interface Crumb {
  name: string;
  /** Site-relative path with trailing slash; omit on the current page. */
  href?: string;
}

export function breadcrumbsJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${SITE}${c.href}` } : {}),
    })),
  };
}
