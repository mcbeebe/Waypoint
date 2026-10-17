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

/** The site Organization as a nested node (no @context) — publisher on tools. */
function publisherNode() {
  return { '@type': 'Organization', name: 'Waypoint', url: `${SITE}/` };
}

export interface WebApplicationJsonLdInput {
  /** Site-relative path with trailing slash, e.g. "/tools/iep-goal-check/". */
  path: string;
  name: string;
  /** Must be the page's own meta description. */
  description: string;
  /** schema.org applicationCategory, e.g. "EducationalApplication". */
  applicationCategory: string;
}

/**
 * WebApplication schema for a free in-browser tool. Facts only: every tool is
 * free with no email gate (site rule), so the zero-price offer is true by
 * construction. No ratings, user counts or outcome claims.
 */
export function webApplicationJsonLd(input: WebApplicationJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    url: `${SITE}${input.path}`,
    description: input.description,
    applicationCategory: input.applicationCategory,
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: publisherNode(),
  };
}

export interface ToolsIndexItem {
  name: string;
  path: string;
}

/** ItemList for the free-tools hub: the tools it links to, in page order. */
export function toolsIndexJsonLd(items: ToolsIndexItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Free tools for California families',
    url: `${SITE}/tools/`,
    itemListElement: items.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      url: `${SITE}${t.path}`,
    })),
  };
}

export interface RegionalCenterOrgInput {
  rcName: string;
  /** County names as in frontmatter ("Alameda"), without "County". */
  counties: string[];
  /** Only when the content already carries one of the center's own URLs. */
  url?: string | null;
}

/**
 * The Regional Center itself, as a nested `about` node. Plain Organization:
 * centers are private nonprofits under DDS contract, and we make no claim
 * about legal status. Facts come only from frontmatter.
 */
export function regionalCenterOrgJsonLd(input: RegionalCenterOrgInput) {
  return {
    '@type': 'Organization',
    name: input.rcName,
    ...(input.url ? { url: input.url } : {}),
    areaServed: input.counties.map((c) => ({
      '@type': 'AdministrativeArea',
      name: `${c} County, California`,
    })),
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
  /** Optional entity the article is about (e.g. a Regional Center). */
  about?: Record<string, unknown>;
}

/**
 * The dateModified to publish: never earlier than datePublished. Pages are
 * often drafted (dateModified) before they go live (datePublished), and a
 * modification that precedes publication is a contradiction Google flags.
 * Publishing is itself the latest change, so the later date wins.
 */
export function effectiveDateModified(datePublished: Date | null, dateModified: Date): Date {
  return datePublished && datePublished > dateModified ? datePublished : dateModified;
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
    dateModified: effectiveDateModified(input.datePublished, input.dateModified).toISOString(),
  };
  if (input.datePublished) data.datePublished = input.datePublished.toISOString();
  if (input.about) data.about = input.about;
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

/**
 * A category-label crumb (a pillar, "Letters", …) that links only when its
 * hub page exists in this build — an out-of-order publish must not 404 the
 * breadcrumb (adversary A6). Without a hub it's still a valid crumb; a
 * non-last one just gets dropped from the JSON-LD by breadcrumbsJsonLd
 * below rather than shipping a dead "item". Shared so every call site's
 * link-if-exists logic is the same, tested, code path instead of
 * independently hand-rolled copies drifting apart.
 */
export function hubCrumb(name: string, href: string, urls: Set<string>): Crumb {
  return urls.has(href) ? { name, href } : { name };
}

export function breadcrumbsJsonLd(crumbs: Crumb[]) {
  // `item` (a URL) is required on every ListItem except the last, which
  // stands for the current page and may omit it — Google's own example
  // does this. A crumb earlier in the trail with no href would otherwise
  // ship an invalid middle ListItem (GSC: missing field "item"), so drop
  // it here rather than trust every caller to only omit href on the final
  // crumb. Positions renumber sequentially over what's left.
  const linkable = crumbs.filter((c, i) => c.href || i === crumbs.length - 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: linkable.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${SITE}${c.href}` } : {}),
    })),
  };
}
