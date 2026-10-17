/**
 * breadcrumbsJsonLd tests — GSC "Missing field item" regression
 * (/letters/iep-evaluation-request/, first detected 2026-09-08). Google
 * requires "item" on every ListItem except the last; these lock in that
 * any crumb short of the last one either carries a link or is dropped.
 */
import { describe, expect, it } from 'vitest';
import {
  articleJsonLd,
  breadcrumbsJsonLd,
  effectiveDateModified,
  hubCrumb,
  regionalCenterOrgJsonLd,
  toolsIndexJsonLd,
  webApplicationJsonLd,
  type Crumb,
} from './jsonld';

describe('hubCrumb', () => {
  it('links when the hub URL exists in the build', () => {
    const urls = new Set(['/guides/regional-centers/']);
    expect(hubCrumb('Regional Centers', '/guides/regional-centers/', urls)).toEqual({
      name: 'Regional Centers',
      href: '/guides/regional-centers/',
    });
  });

  it('falls back to a plain label when the hub does not exist yet', () => {
    const urls = new Set(['/guides/benefits/']);
    expect(hubCrumb('Letters', '/letters/', urls)).toEqual({ name: 'Letters' });
  });
});

describe('breadcrumbsJsonLd', () => {
  it('carries @context/@type and links every non-last crumb that has an href', () => {
    const ld = breadcrumbsJsonLd([
      { name: 'Guides', href: '/guides/' },
      { name: 'Regional Centers', href: '/guides/regional-centers/' },
      { name: 'Appeal a denial' },
    ]);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Guides', item: 'https://waypointchild.com/guides/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Regional Centers',
        item: 'https://waypointchild.com/guides/regional-centers/',
      },
      { '@type': 'ListItem', position: 3, name: 'Appeal a denial' },
    ]);
  });

  it('omits item on the last crumb (the current page) without dropping it', () => {
    const ld = breadcrumbsJsonLd([{ name: 'Guides', href: '/guides/' }, { name: 'Current page' }]);
    const last = ld.itemListElement.at(-1)!;
    expect(last.name).toBe('Current page');
    expect(last).not.toHaveProperty('item');
  });

  it('drops a middle crumb with no href and renumbers positions sequentially', () => {
    // The exact shape that shipped on /letters/iep-evaluation-request/:
    // an unlinkable category label ("Letters") sitting between two real
    // crumbs used to ship position 2 with no "item".
    const crumbs: Crumb[] = [
      { name: 'Guides', href: '/guides/' },
      { name: 'Letters' },
      { name: 'IEP evaluation request' },
    ];
    const ld = breadcrumbsJsonLd(crumbs);
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Guides', item: 'https://waypointchild.com/guides/' },
      { '@type': 'ListItem', position: 2, name: 'IEP evaluation request' },
    ]);
  });

  it('drops an unlinkable first crumb the same way (not just middle ones)', () => {
    // The shape answers/[slug].astro shipped before its own fix: a
    // category label at position 1 with no href.
    const ld = breadcrumbsJsonLd([{ name: 'Answers' }, { name: 'Does my child need SSI for IHSS?' }]);
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Does my child need SSI for IHSS?' },
    ]);
  });

  it('drops every unlinkable crumb when more than one lacks an href', () => {
    const ld = breadcrumbsJsonLd([
      { name: 'Guides', href: '/guides/' },
      { name: 'Unlinked A' },
      { name: 'Unlinked B' },
      { name: 'Leaf' },
    ]);
    expect(ld.itemListElement.map((i) => i.name)).toEqual(['Guides', 'Leaf']);
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it('keeps a lone current-page crumb as a single valid ListItem', () => {
    const ld = breadcrumbsJsonLd([{ name: 'Home' }]);
    expect(ld.itemListElement).toEqual([{ '@type': 'ListItem', position: 1, name: 'Home' }]);
  });
});

describe('webApplicationJsonLd', () => {
  const ld = webApplicationJsonLd({
    path: '/tools/iep-goal-check/',
    name: 'Free IEP goal check',
    description: 'The page description.',
    applicationCategory: 'EducationalApplication',
  });

  it('describes a free, ungated web app published by the site Organization', () => {
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      url: 'https://waypointchild.com/tools/iep-goal-check/',
      description: 'The page description.',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: 'Waypoint', url: 'https://waypointchild.com/' },
    });
  });

  it('never claims ratings or reviews', () => {
    expect(ld).not.toHaveProperty('aggregateRating');
    expect(ld).not.toHaveProperty('review');
  });
});

describe('toolsIndexJsonLd', () => {
  it('lists tools in order with absolute URLs', () => {
    const ld = toolsIndexJsonLd([
      { name: 'A', path: '/tools/a/' },
      { name: 'B', path: '/tools/b/' },
    ]);
    expect(ld['@type']).toBe('ItemList');
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'A', url: 'https://waypointchild.com/tools/a/' },
      { '@type': 'ListItem', position: 2, name: 'B', url: 'https://waypointchild.com/tools/b/' },
    ]);
  });
});

describe('regionalCenterOrgJsonLd', () => {
  it('is a plain Organization (not GovernmentOrganization) with county areas', () => {
    const org = regionalCenterOrgJsonLd({ rcName: 'Alta California Regional Center', counties: ['Alpine', 'Yolo'] });
    expect(org['@type']).toBe('Organization');
    expect(org.areaServed).toEqual([
      { '@type': 'AdministrativeArea', name: 'Alpine County, California' },
      { '@type': 'AdministrativeArea', name: 'Yolo County, California' },
    ]);
    expect(org).not.toHaveProperty('url');
    expect(org).not.toHaveProperty('telephone');
  });

  it('adds url only when given one', () => {
    const org = regionalCenterOrgJsonLd({ rcName: 'X', counties: ['Kern'], url: 'https://example.org/apply' });
    expect(org.url).toBe('https://example.org/apply');
    expect(regionalCenterOrgJsonLd({ rcName: 'X', counties: ['Kern'], url: null })).not.toHaveProperty('url');
  });
});

describe('articleJsonLd about', () => {
  const base = {
    url: 'https://waypointchild.com/x/',
    title: 'T',
    description: 'D',
    locale: 'en' as const,
    author: 'A',
    datePublished: new Date('2026-09-09'),
    dateModified: new Date('2026-09-10'),
    review: null,
  };
  it('attaches about only when provided', () => {
    expect(articleJsonLd(base)).not.toHaveProperty('about');
    const about = regionalCenterOrgJsonLd({ rcName: 'X', counties: ['Kern'] });
    expect(articleJsonLd({ ...base, about }).about).toEqual(about);
  });
});

describe('articleJsonLd dates', () => {
  const base = {
    url: 'https://waypointchild.com/x/',
    title: 'T',
    description: 'D',
    locale: 'en' as const,
    author: 'A',
    review: null,
  };
  it('never publishes a dateModified earlier than datePublished', () => {
    // The shape all 21 Regional Center pages shipped with: drafted 09-06, live 09-09.
    const ld = articleJsonLd({ ...base, datePublished: new Date('2026-09-09'), dateModified: new Date('2026-09-06') });
    expect(ld.datePublished).toBe('2026-09-09T00:00:00.000Z');
    expect(ld.dateModified).toBe('2026-09-09T00:00:00.000Z');
  });
  it('keeps a later dateModified as written', () => {
    const ld = articleJsonLd({ ...base, datePublished: new Date('2026-09-09'), dateModified: new Date('2026-10-06') });
    expect(ld.dateModified).toBe('2026-10-06T00:00:00.000Z');
  });
  it('leaves dateModified alone when there is no datePublished', () => {
    const ld = articleJsonLd({ ...base, datePublished: null, dateModified: new Date('2026-09-06') });
    expect(ld).not.toHaveProperty('datePublished');
    expect(ld.dateModified).toBe('2026-09-06T00:00:00.000Z');
  });
  it('effectiveDateModified returns the later of the two', () => {
    const a = new Date('2026-09-01');
    const b = new Date('2026-09-02');
    expect(effectiveDateModified(b, a)).toBe(b);
    expect(effectiveDateModified(a, b)).toBe(b);
    expect(effectiveDateModified(a, a)).toBe(a);
    expect(effectiveDateModified(null, a)).toBe(a);
  });
});
